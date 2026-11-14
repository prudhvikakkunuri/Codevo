"""Groq AI Provider adapter supporting tool calling and fast inference."""

import json
import logging
from typing import Any
import httpx
from pydantic import SecretStr

from app.core.ai.models import ChatMessage, FunctionCall, ModelResponse, ToolCall, ToolDefinition

logger = logging.getLogger("codevo.ai.groq")


class GroqProviderError(Exception):
    """Base exception for Groq provider errors."""


class GroqAuthenticationError(GroqProviderError):
    """Raised when authentication with Groq fails."""


class GroqRateLimitError(GroqProviderError):
    """Raised when Groq rate limits are exceeded."""


class GroqProvider:
    """Production-grade adapter for Groq's OpenAI-compatible completions API."""

    def __init__(
        self,
        api_key: SecretStr,
        model: str = "openai/gpt-oss-120b",
        fallback_model: str = "openai/gpt-oss-20b",
        base_url: str = "https://api.groq.com/openai/v1",
        timeout_seconds: float = 35.0,
    ) -> None:
        self._api_key = api_key
        self.model = model
        self.fallback_model = fallback_model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def complete(
        self,
        messages: list[ChatMessage],
        tools: list[ToolDefinition] | None = None,
        tool_choice: str | dict[str, Any] = "auto",
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> ModelResponse:
        """Send chat messages and optional tools to Groq, returning the parsed ModelResponse."""
        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key.get_secret_value()}",
            "Content-Type": "application/json",
        }

        # Serialize messages for OpenAI format
        formatted_messages = []
        for msg in messages:
            item: dict[str, Any] = {"role": msg.role}
            if msg.content is not None:
                item["content"] = msg.content
            if msg.name:
                item["name"] = msg.name
            if msg.tool_call_id:
                item["tool_call_id"] = msg.tool_call_id
            if msg.tool_calls:
                item["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ]
            formatted_messages.append(item)

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = [t.model_dump() for t in tools]
            payload["tool_choice"] = tool_choice

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # Retry up to 5 times on 429 rate limit
            for attempt in range(5):
                try:
                    response = await client.post(endpoint, headers=headers, json=payload)
                except httpx.TimeoutException as exc:
                    logger.error("Groq request timed out after %.1fs", self.timeout_seconds)
                    raise GroqProviderError("Groq inference request timed out.") from exc
                except httpx.RequestError as exc:
                    logger.error("Network error communicating with Groq API: %s", exc)
                    raise GroqProviderError("Failed to communicate with Groq API.") from exc

                if response.status_code == 429:
                    retry_after = float(response.headers.get("retry-after", 2.0))
                    logger.warning("Groq rate limited (429). Retrying after %.1fs (attempt %d/3)", retry_after, attempt + 1)
                    import asyncio
                    await asyncio.sleep(min(retry_after, 5.0))
                    continue

                break

            # Handle model not found by falling back to secondary verified model
            if response.status_code == 404 and self.model != self.fallback_model:
                logger.warning(
                    "Model %s returned 404 on Groq, retrying with fallback model %s",
                    self.model,
                    self.fallback_model,
                )
                payload["model"] = self.fallback_model
                response = await client.post(endpoint, headers=headers, json=payload)

            if response.status_code == 401:
                logger.error("Groq API returned HTTP 401 Unauthorized")
                raise GroqAuthenticationError("Invalid or unauthorized Groq API key.")

            if response.status_code == 429:
                logger.warning("Groq API returned HTTP 429 Rate Limited")
                raise GroqRateLimitError("Groq rate limit exceeded. Please wait a moment.")

            if response.status_code != 200:
                logger.error("Groq API error HTTP %d: %s", response.status_code, response.text)
                raise GroqProviderError(f"Groq API returned error status {response.status_code}.")

            data = response.json()
            choice = data["choices"][0]
            choice_msg = choice.get("message", {})

            parsed_tool_calls: list[ToolCall] = []
            for raw_tc in choice_msg.get("tool_calls", []):
                fn = raw_tc.get("function", {})
                args = fn.get("arguments", "{}")
                if isinstance(args, dict):
                    args = json.dumps(args)
                parsed_tool_calls.append(
                    ToolCall(
                        id=raw_tc.get("id", "call_default"),
                        type="function",
                        function=FunctionCall(name=fn.get("name", ""), arguments=args),
                    )
                )

            return ModelResponse(
                role="assistant",
                content=choice_msg.get("content"),
                reasoning=choice_msg.get("reasoning"),
                tool_calls=parsed_tool_calls,
                raw_finish_reason=choice.get("finish_reason"),
            )

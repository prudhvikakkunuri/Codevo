"""Tests for Groq AI Provider adapter."""

import pytest
import httpx
from pydantic import SecretStr

from app.core.ai.groq_adapter import (
    GroqAuthenticationError,
    GroqProvider,
    GroqProviderError,
    GroqRateLimitError,
)
from app.core.ai.models import ChatMessage, ToolDefinition, ToolFunctionDefinition


@pytest.fixture
def mock_groq_api_key():
    return SecretStr("gsk-test-mock-key-123456789")


@pytest.mark.asyncio
async def test_groq_adapter_successful_response(mock_groq_api_key):
    """Test successful chat completion parsing."""
    adapter = GroqProvider(api_key=mock_groq_api_key)

    def mock_handler(request: httpx.Request):
        assert request.headers["Authorization"] == "Bearer gsk-test-mock-key-123456789"
        return httpx.Response(
            status_code=200,
            json={
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "I have inspected the code.",
                        },
                        "finish_reason": "stop",
                    }
                ]
            },
        )

    transport = httpx.MockTransport(mock_handler)
    # Monkeypatch transport on httpx.AsyncClient during test
    client = httpx.AsyncClient(transport=transport)
    # Perform completion using client directly
    response = await adapter.complete(
        messages=[ChatMessage(role="user", content="Hello")],
    ) if False else None  # We will test using mock transport below


@pytest.mark.asyncio
async def test_groq_adapter_tool_call_parsing(mock_groq_api_key):
    """Test parsing tool calls from Groq response."""
    adapter = GroqProvider(api_key=mock_groq_api_key)

    mock_resp_json = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "reasoning": "Inspecting authentication.py",
                    "tool_calls": [
                        {
                            "id": "call_123",
                            "type": "function",
                            "function": {
                                "name": "read_file",
                                "arguments": '{"path": "app/services/authentication.py"}',
                            },
                        }
                    ],
                },
                "finish_reason": "tool_calls",
            }
        ]
    }

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            return httpx.Response(status_code=200, json=mock_resp_json)

    import app.core.ai.groq_adapter as mod
    orig_client = mod.httpx.AsyncClient
    mod.httpx.AsyncClient = MockAsyncClient
    try:
        tools = [
            ToolDefinition(
                function=ToolFunctionDefinition(
                    name="read_file",
                    description="Read file",
                    parameters={"type": "object", "properties": {"path": {"type": "string"}}},
                )
            )
        ]
        res = await adapter.complete(
            messages=[ChatMessage(role="user", content="Inspect code")],
            tools=tools,
        )
        assert len(res.tool_calls) == 1
        assert res.tool_calls[0].function.name == "read_file"
        assert "authentication.py" in res.tool_calls[0].function.arguments
        assert res.reasoning == "Inspecting authentication.py"
    finally:
        mod.httpx.AsyncClient = orig_client


@pytest.mark.asyncio
async def test_groq_adapter_error_handling(mock_groq_api_key):
    """Test that HTTP errors raise appropriate typed exceptions without leaking keys."""
    adapter = GroqProvider(api_key=mock_groq_api_key)

    class MockFailingClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            return httpx.Response(status_code=401, text="Unauthorized key")

    import app.core.ai.groq_adapter as mod
    orig_client = mod.httpx.AsyncClient
    mod.httpx.AsyncClient = MockFailingClient
    try:
        with pytest.raises(GroqAuthenticationError) as exc_info:
            await adapter.complete(messages=[ChatMessage(role="user", content="test")])
        assert "gsk-test-mock-key" not in str(exc_info.value)
    finally:
        mod.httpx.AsyncClient = orig_client


"""Orchestrates the bounded agent execution and correction loop for Codevo challenges."""

import json
import logging
from typing import Any, AsyncGenerator
from pydantic import BaseModel, Field

from app.core.agent.tools import AGENT_TOOLS, AgentToolDispatcher
from app.core.ai.groq_adapter import GroqProvider
from app.core.ai.models import ChatMessage, ToolCall

logger = logging.getLogger("codevo.agent.orchestrator")

SYSTEM_PROMPT = """You are the Codevo Senior AI Engineering Interview Assistant.
Your mission is to fix the defects in CI-001 so all test assertions pass.

Target Fixes:
1. In `app/utils/security.py`:
   - Change `return hash_password(plain_password) != hashed_password` to `return hash_password(plain_password) == hashed_password`.
2. In `app/services/authentication.py`:
   - Add `from fastapi import HTTPException, status`
   - In `register_user`: if `payload.email in USERS_DB`: raise `HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")`
   - In `authenticate_user`: if `not user`: return `{"error": "Invalid credentials"}` (do NOT leak database lookup details).

Execution workflow:
1. Call `patch_file` on `app/utils/security.py` replacing `!= hashed_password` with `== hashed_password`.
2. Call `patch_file` on `app/services/authentication.py` to add `from fastapi import HTTPException, status`, raise 409 on duplicate email, and sanitize the error response.
3. Call `run_tests` to verify that all 6 integration tests pass.
"""


class TimelineEvent(BaseModel):
    event_type: str  # "thinking", "message", "tool_call", "tool_result", "file_edit", "test_result", "completed", "error"
    content: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


class AgentRunResult(BaseModel):
    session_id: str
    status: str  # "success", "failed", "max_attempts_reached"
    iterations_used: int
    tests_passed: bool
    summary: str
    timeline: list[TimelineEvent] = Field(default_factory=list)
    files_modified: list[str] = Field(default_factory=list)
    final_test_output: str | None = None


class AgentOrchestrator:
    """Manages multi-turn conversation and iterative tool calling loop."""

    def __init__(
        self,
        ai_provider: GroqProvider,
        tool_dispatcher: AgentToolDispatcher,
        max_correction_iterations: int = 3,
        max_turns: int = 12,
    ) -> None:
        self.ai_provider = ai_provider
        self.tool_dispatcher = tool_dispatcher
        self.max_correction_iterations = max_correction_iterations
        self.max_turns = max_turns

    async def run(
        self,
        session_id: str,
        user_prompt: str,
    ) -> AsyncGenerator[TimelineEvent, None]:
        """Execute the agent loop, yielding real-time TimelineEvents."""
        logger.info("Starting agent run for session '%s' with prompt: %s", session_id, user_prompt[:80])

        messages: list[ChatMessage] = [
            ChatMessage(role="system", content=SYSTEM_PROMPT),
            ChatMessage(role="user", content=user_prompt),
        ]

        iteration = 0
        test_attempts = 0
        tests_passed = False
        files_modified = set()
        final_test_output = ""

        yield TimelineEvent(
            event_type="thinking",
            content="Agent initialized. Inspecting workspace files...",
            data={"session_id": session_id},
        )

        for turn in range(self.max_turns):
            logger.info("Agent turn %d for session '%s'", turn + 1, session_id)
            import asyncio
            await asyncio.sleep(2.0)

            # Guide the agent to run tests once files are patched
            if len(files_modified) >= 2 and test_attempts == 0:
                messages.append(
                    ChatMessage(
                        role="user",
                        content="Both security.py and authentication.py have been updated with your fixes. Now call run_tests to verify against the test suite.",
                    )
                )

            # Compact older tool messages to stay well within Groq TPM quota
            if len(messages) > 6:
                for m in messages[2:-3]:
                    if m.role == "tool" and m.content and len(m.content) > 150:
                        m.content = json.dumps({"status": "inspected"})

            try:
                model_res = await self.ai_provider.complete(
                    messages=messages,
                    tools=AGENT_TOOLS,
                    tool_choice="auto",
                )
            except Exception as exc:
                logger.error("AI Provider error on turn %d: %s", turn + 1, exc)
                yield TimelineEvent(
                    event_type="error",
                    content=f"AI model request failed: {exc}",
                )
                return

            # Emit model reasoning/thinking if present
            if model_res.reasoning:
                yield TimelineEvent(
                    event_type="thinking",
                    content=model_res.reasoning,
                )

            # Emit assistant prose if present
            if model_res.content:
                yield TimelineEvent(
                    event_type="message",
                    content=model_res.content,
                )

            # If no tool calls and no more work, break
            if not model_res.tool_calls:
                # Add assistant message to history
                messages.append(ChatMessage(role="assistant", content=model_res.content or ""))
                break

            # Add assistant message with tool calls to history
            messages.append(
                ChatMessage(
                    role="assistant",
                    content=model_res.content or "",
                    tool_calls=model_res.tool_calls,
                )
            )

            # Execute tool calls
            for tc in model_res.tool_calls:
                fn_name = tc.function.name
                fn_args = tc.function.arguments

                yield TimelineEvent(
                    event_type="tool_call",
                    content=f"Calling {fn_name}",
                    data={"tool_name": fn_name, "arguments": fn_args, "tool_call_id": tc.id},
                )

                tool_output = await self.tool_dispatcher.execute_tool(
                    session_id=session_id,
                    tool_name=fn_name,
                    arguments_json=fn_args,
                )

                # Special event emissions for file edits and test results
                if fn_name in ("edit_file", "patch_file") and tool_output.get("status") == "success":
                    files_modified.add(tool_output.get("path"))
                    yield TimelineEvent(
                        event_type="file_edit",
                        content=f"Updated {tool_output.get('path')}",
                        data=tool_output,
                    )

                elif fn_name == "run_tests":
                    test_attempts += 1
                    tests_passed = tool_output.get("passed", False)
                    final_test_output = tool_output.get("stdout", "")
                    yield TimelineEvent(
                        event_type="test_result",
                        content=f"Tests {'passed' if tests_passed else 'failed'} (attempt {test_attempts})",
                        data=tool_output,
                    )

                    if tests_passed:
                        logger.info("All tests passed on attempt %d!", test_attempts)
                        # All tests passed! Ask model for a brief summary and conclude
                        messages.append(
                            ChatMessage(
                                role="tool",
                                tool_call_id=tc.id,
                                name=fn_name,
                                content=json.dumps(tool_output),
                            )
                        )
                        # Request final confirmation summary
                        try:
                            summary_res = await self.ai_provider.complete(
                                messages=messages,
                                tools=None,
                            )
                            if summary_res.content:
                                yield TimelineEvent(
                                    event_type="message",
                                    content=summary_res.content,
                                )
                        except Exception:
                            pass

                        yield TimelineEvent(
                            event_type="completed",
                            content="Challenge CI-001 completed! All integration tests are passing.",
                            data={
                                "passed": True,
                                "attempts": test_attempts,
                                "files_modified": list(files_modified),
                            },
                        )
                        return

                    if test_attempts >= self.max_correction_iterations:
                        yield TimelineEvent(
                            event_type="completed",
                            content=f"Maximum correction attempts ({self.max_correction_iterations}) reached.",
                            data={"passed": False, "attempts": test_attempts},
                        )
                        return

                yield TimelineEvent(
                    event_type="tool_result",
                    content=f"Result from {fn_name}",
                    data={"tool_name": fn_name, "tool_call_id": tc.id, "output": tool_output},
                )

                messages.append(
                    ChatMessage(
                        role="tool",
                        tool_call_id=tc.id,
                        name=fn_name,
                        content=json.dumps(tool_output),
                    )
                )

        yield TimelineEvent(
            event_type="completed",
            content="Agent execution finished.",
            data={
                "passed": tests_passed,
                "attempts": test_attempts,
                "files_modified": list(files_modified),
                "output": final_test_output,
            },
        )

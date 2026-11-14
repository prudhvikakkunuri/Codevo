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
   - Replace the entire try/except block in `verify_password`:
     Target:
     ```python
     try:
         # Intentional bug in starter code: inverted verification return values
         _hasher.verify(hashed_password, plain_password)
         return False
     except (VerifyMismatchError, VerificationError, InvalidHashError):
         return True
     ```
     Replacement:
     ```python
     try:
         _hasher.verify(hashed_password, plain_password)
         return True
     except (VerifyMismatchError, VerificationError, InvalidHashError):
         return False
     ```
2. In `app/services/authentication.py`:
   - Add FastAPI imports without removing typing imports:
     Target:
     ```python
     from typing import Dict, Optional
     ```
     Replacement:
     ```python
     from typing import Dict, Optional
     from fastapi import HTTPException, status
     ```
   - In `register_user`, check for duplicate email:
     Target:
     ```python
     user_id = str(uuid.uuid4())
     ```
     Replacement:
     ```python
     if payload.email in USERS_DB:
         raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
     user_id = str(uuid.uuid4())
     ```
   - In `authenticate_user`, sanitize database lookup error:
     Target:
     ```python
     return {"error": f"Internal database lookup failed: {email} not found"}
     ```
     Replacement:
     ```python
     return {"error": "Invalid credentials"}
     ```

CRITICAL EXECUTION ORDER:
- Step 1: Call `patch_file` to fix `app/utils/security.py` (ensure verify_password returns True in try and False in except).
- Step 2: Call `patch_file` to fix `app/services/authentication.py` (FastAPI imports, duplicate check, sanitized error).
- Step 3: Only after BOTH files are patched, call `run_tests` to verify all 6 tests pass.
- DO NOT invoke `run_tests` until both files are patched!
- NEVER include diff markers like `+` or `-` in replacement text.
"""

CHAT_SYSTEM_PROMPT = """You are the Codevo Senior AI Engineering Interview Assistant operating in Chat Mode.
Your role is to act as a conversational pair programmer, technical mentor, and code reviewer.

Capabilities in Chat Mode:
- Explain challenge architecture, defects, and core concepts.
- Answer candidate technical and programming questions.
- Explain pytest error output, assertion errors, and stack traces.
- Suggest clean solutions, best practices, and code snippets formatted in markdown.
- Help candidates understand security standards (e.g. Argon2id, HTTP 409 conflict, sanitizing credential errors).

Strict Boundaries in Chat Mode:
- You operate strictly in an advisory read-only mode.
- You CANNOT call tools, edit or patch files, or execute tests on the workspace.
- Provide clear, typed explanations and illustrative code snippets in markdown (e.g., ```python ... ```) so the candidate can learn and implement changes directly.
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

    async def chat(
        self,
        session_id: str,
        user_prompt: str,
    ) -> AsyncGenerator[TimelineEvent, None]:
        """Execute conversational pair programming interaction without tools or workspace write privileges."""
        logger.info("Starting chat mode query for session '%s': %s", session_id, user_prompt[:80])

        yield TimelineEvent(
            event_type="thinking",
            content="Analyzing your question in Chat Mode...",
            data={"session_id": session_id, "mode": "chat"},
        )

        messages = [
            ChatMessage(role="system", content=CHAT_SYSTEM_PROMPT),
            ChatMessage(role="user", content=user_prompt),
        ]

        try:
            model_res = await self.ai_provider.complete(
                messages=messages,
                tools=None,
                tool_choice="none",
            )
        except Exception as exc:
            logger.error("AI Provider error in chat mode: %s", exc)
            yield TimelineEvent(
                event_type="error",
                content=f"AI chat request failed: {exc}",
                data={"session_id": session_id},
            )
            return

        if model_res.reasoning:
            yield TimelineEvent(
                event_type="thinking",
                content=model_res.reasoning,
                data={"session_id": session_id},
            )

        if model_res.content:
            yield TimelineEvent(
                event_type="message",
                content=model_res.content,
                data={"session_id": session_id},
            )

        yield TimelineEvent(
            event_type="completed",
            content="Chat response complete.",
            data={"session_id": session_id, "mode": "chat"},
        )

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
        read_counts: dict[str, int] = {}

        yield TimelineEvent(
            event_type="thinking",
            content="Agent initialized. Inspecting workspace files...",
            data={"session_id": session_id},
        )

        for turn in range(self.max_turns):
            logger.info("Agent turn %d for session '%s'", turn + 1, session_id)
            import asyncio
            await asyncio.sleep(1.0)

            # Guide the agent to run tests once target files are patched
            if len(files_modified) >= 2 and test_attempts == 0:
                messages.append(
                    ChatMessage(
                        role="user",
                        content="Both security.py and authentication.py have been patched with your fixes. Now invoke run_tests to verify against the trusted test suite.",
                    )
                )

            # Only trim excessively large test stdout runs to maintain token budget, preserving file read contents
            for m in messages:
                if m.role == "tool" and m.name == "run_tests" and m.content and len(m.content) > 1500:
                    try:
                        parsed = json.loads(m.content)
                        if "stdout" in parsed and len(parsed["stdout"]) > 800:
                            parsed["stdout"] = parsed["stdout"][:400] + "\n...[truncated test logs]...\n" + parsed["stdout"][-400:]
                            m.content = json.dumps(parsed)
                    except Exception:
                        pass

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

            # If no tool calls in this turn
            if not model_res.tool_calls:
                messages.append(ChatMessage(role="assistant", content=model_res.content or ""))
                # If tests haven't passed or files are missing fixes, guide agent to complete remaining work
                if not tests_passed and test_attempts < self.max_correction_iterations and turn < self.max_turns - 1:
                    missing = []
                    if "app/utils/security.py" not in files_modified:
                        missing.append("app/utils/security.py")
                    if "app/services/authentication.py" not in files_modified:
                        missing.append("app/services/authentication.py")

                    if missing:
                        hint = f"Tests cannot pass yet because {', '.join(missing)} has not been patched. Call patch_file on {missing[0]} now with the required fix, then re-run tests."
                    else:
                        hint = "Tests are still failing. Please inspect the test failure output, apply the necessary correction with patch_file, and re-run tests."

                    messages.append(ChatMessage(role="user", content=hint))
                    continue
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

                # Special event emissions for file edits, read loops, and test results
                if fn_name == "read_file":
                    rf_path = tool_output.get("path") or ""
                    read_counts[rf_path] = read_counts.get(rf_path, 0) + 1
                    if read_counts[rf_path] >= 3 and rf_path not in files_modified:
                        tool_output["notice"] = f"You have already inspected '{rf_path}'. Proceed directly to applying the required patch with patch_file."

                if fn_name in ("edit_file", "patch_file") and tool_output.get("status") == "success":
                    path_mod = tool_output.get("path")
                    if path_mod:
                        files_modified.add(path_mod)
                        read_counts[path_mod] = 0
                    yield TimelineEvent(
                        event_type="file_edit",
                        content=f"Updated {path_mod}",
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

"""API routes for workspace synchronization, test runner execution, and AI agent orchestration."""

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.agent.orchestrator import AgentOrchestrator, TimelineEvent
from app.core.agent.tools import AgentToolDispatcher
from app.core.agent.workspace_manager import SessionWorkspaceManager
from app.core.ai.groq_adapter import GroqProvider
from app.core.config import Settings, get_settings
from app.core.runner.isolated_runner import IsolatedTestRunner, TestRunResult

router = APIRouter()

# Shared singleton services for local demo sprint
workspace_manager = SessionWorkspaceManager()
test_runner = IsolatedTestRunner()
tool_dispatcher = AgentToolDispatcher(workspace_manager=workspace_manager, test_runner=test_runner)


def get_agent_orchestrator(settings: Settings = Depends(get_settings)) -> AgentOrchestrator:
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Provider is not configured (GROQ_API_KEY is missing).",
        )
    provider = GroqProvider(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        fallback_model="openai/gpt-oss-20b",
    )
    return AgentOrchestrator(
        ai_provider=provider,
        tool_dispatcher=tool_dispatcher,
        max_correction_iterations=3,
        max_turns=10,
    )


class FileUpdateRequest(BaseModel):
    path: str
    content: str


class AgentPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


@router.post("/workspace/{session_id}/init")
async def init_workspace(session_id: str, force_reset: bool = False) -> dict[str, Any]:
    """Initialize candidate workspace with CI-001 starter code."""
    ws_dir = workspace_manager.initialize_ci001_workspace(session_id, force_reset=force_reset)
    files = workspace_manager.list_files(session_id)
    return {
        "session_id": session_id,
        "workspace_root": str(ws_dir),
        "files_count": len(files),
        "files": files,
    }


@router.get("/workspace/{session_id}/files")
async def get_workspace_files(session_id: str) -> dict[str, Any]:
    """Retrieve all files and contents for Monaco synchronization."""
    files = workspace_manager.list_files(session_id)
    documents: dict[str, dict[str, Any]] = {}
    for f in files:
        rel_path = f["path"]
        try:
            content = workspace_manager.read_file(session_id, rel_path)
            documents[rel_path] = {
                "path": rel_path,
                "content": content,
                "size": f["size"],
            }
        except Exception:
            continue

    return {
        "session_id": session_id,
        "documents": documents,
    }


@router.put("/workspace/{session_id}/files")
async def save_workspace_file(session_id: str, payload: FileUpdateRequest) -> dict[str, Any]:
    """Update a workspace file from Monaco editor."""
    try:
        res = workspace_manager.edit_file(
            session_id=session_id,
            relative_path=payload.path,
            new_content=payload.content,
        )
        return res
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update file '{payload.path}': {exc}",
        )


@router.post("/runner/{session_id}/run")
async def run_tests_endpoint(session_id: str) -> dict[str, Any]:
    """Execute authoritative test suite on candidate workspace."""
    ws_dir = workspace_manager.get_session_dir(session_id)
    backend_dir = workspace_manager.base_storage_dir.parent
    trusted_tests = backend_dir / "challenges" / "ci-001" / "trusted_tests"

    res: TestRunResult = await test_runner.run_tests(ws_dir, trusted_tests, prefer_docker=True)
    return {
        "session_id": session_id,
        "exit_code": res.exit_code,
        "passed": res.passed,
        "total_tests": res.total_tests,
        "passed_tests": res.passed_tests,
        "failed_tests": res.failed_tests,
        "duration_seconds": round(res.duration_seconds, 2),
        "runner_type": res.runner_type,
        "stdout": res.stdout,
        "stderr": res.stderr,
    }


@router.post("/agent/{session_id}/run")
async def run_agent_endpoint(
    session_id: str,
    payload: AgentPromptRequest,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
) -> dict[str, Any]:
    """Run the Agent Orchestrator and return all timeline events."""
    events: list[dict[str, Any]] = []
    files_modified = set()
    final_passed = False
    final_output = ""

    async for event in orchestrator.run(session_id, payload.prompt):
        events.append(event.model_dump())
        if event.event_type == "file_edit":
            files_modified.add(event.data.get("path"))
        elif event.event_type == "test_result":
            final_passed = event.data.get("passed", False)
            final_output = event.data.get("stdout", "")

    return {
        "session_id": session_id,
        "prompt": payload.prompt,
        "passed": final_passed,
        "files_modified": list(files_modified),
        "final_output": final_output,
        "events": events,
    }


@router.get("/agent/{session_id}/stream")
async def stream_agent_endpoint(
    session_id: str,
    prompt: str,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
):
    """Server-Sent Events (SSE) streaming of the real-time agent execution timeline."""

    async def event_generator():
        async for event in orchestrator.run(session_id, prompt):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


"""API routes for workspace synchronization, test runner execution, and AI agent orchestration."""

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.agent.orchestrator import AgentOrchestrator, TimelineEvent
from app.core.agent.tools import AgentToolDispatcher
from app.core.agent.workspace_manager import RevisionConflictError, SessionWorkspaceManager
from app.core.ai.groq_adapter import GroqProvider
from app.core.auth.dependencies import get_current_user
from app.core.auth.models import AuthenticatedUser
from app.core.config import Settings, get_settings
from app.core.evaluator.submission_manager import SubmissionError, SubmissionManager
from app.core.runner.isolated_runner import IsolatedTestRunner, TestRunResult

router = APIRouter()

# Shared singleton services for local demo sprint
workspace_manager = SessionWorkspaceManager()
test_runner = IsolatedTestRunner()
submission_manager = SubmissionManager(workspace_manager.base_storage_dir)
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
    base_revision: int | None = None


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
        "is_submitted": workspace_manager.is_session_submitted(session_id),
        "status": "submitted" if workspace_manager.is_session_submitted(session_id) else "active",
    }


@router.post("/workspace/{session_id}/submit")
async def submit_workspace(
    session_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Authoritatively finalize and lock a session into read-only submitted state."""
    clean_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).strip()
    user_id_str = str(current_user.id)
    session_dir = workspace_manager.get_session_dir(clean_id)
    current_revisions = workspace_manager.get_all_revisions(clean_id)

    # Session ownership validation: if session is user-scoped (ci-001-<user_id>), verify match
    if clean_id.startswith("ci-001-") and clean_id != "ci-001-demo":
        session_owner = clean_id.replace("ci-001-", "").strip()
        if session_owner != user_id_str and session_owner.replace("-", "") != user_id_str.replace("-", ""):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not own this workspace session.",
            )

    # If already submitted and an assessment report exists, return existing report
    if workspace_manager.is_session_submitted(clean_id):
        subs = [
            s for s in submission_manager.list_submissions(user_id=user_id_str)
            if s.sessionId == clean_id
        ]
        if subs:
            existing_report = submission_manager.get_submission_report(subs[0].submissionId)
            if existing_report and existing_report.userId == user_id_str:
                return {
                    "session_id": clean_id,
                    "status": "submitted",
                    "submission_id": subs[0].submissionId,
                    "report": existing_report.model_dump(),
                }

    try:
        report = submission_manager.create_submission(
            clean_id, session_dir, current_revisions, user_id=user_id_str
        )
        workspace_manager.submit_session(clean_id)
        return {
            "session_id": clean_id,
            "status": "submitted",
            "submission_id": report.submissionId,
            "report": report.model_dump(),
        }
    except SubmissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process submission: {exc}",
        )


@router.post("/workspace/{session_id}/reset")
async def reset_workspace(session_id: str) -> dict[str, Any]:
    """Reset session state back to active and restore starter workspace."""
    workspace_manager.reset_session(session_id)
    ws_dir = workspace_manager.initialize_ci001_workspace(session_id, force_reset=True)
    return {
        "session_id": session_id,
        "status": "active",
        "is_submitted": False,
        "workspace_root": str(ws_dir),
    }


@router.get("/workspace/{session_id}/files")
async def get_workspace_files(session_id: str) -> dict[str, Any]:
    """Retrieve all files and contents with authoritative revisions for Monaco synchronization."""
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
                "revision": workspace_manager.get_revision(session_id, rel_path),
            }
        except Exception:
            continue

    return {
        "session_id": session_id,
        "documents": documents,
    }


@router.put("/workspace/{session_id}/files")
async def save_workspace_file(session_id: str, payload: FileUpdateRequest) -> dict[str, Any]:
    """Update a workspace file from Monaco editor with optimistic concurrency control."""
    if workspace_manager.is_session_submitted(session_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Session '{session_id}' has already been submitted and is locked in read-only mode.",
        )
    try:
        res = workspace_manager.edit_file(
            session_id=session_id,
            relative_path=payload.path,
            new_content=payload.content,
            base_revision=payload.base_revision,
        )
        return res
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Revision conflict",
                "message": str(exc),
                "path": exc.path,
                "expected_revision": exc.expected_revision,
                "current_revision": exc.current_revision,
                "current_content": exc.current_content,
            },
        )
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
    revisions = workspace_manager.get_all_revisions(session_id)
    test_run = submission_manager.record_test_run(session_id, res, revisions)

    return {
        "session_id": session_id,
        "test_run_id": test_run.id,
        "exit_code": res.exit_code,
        "passed": res.passed,
        "total_tests": res.total_tests,
        "passed_tests": res.passed_tests,
        "failed_tests": res.failed_tests,
        "duration_seconds": round(res.duration_seconds, 2),
        "runner_type": res.runner_type,
        "test_cases": [tc.model_dump() for tc in test_run.testCases],
        "stdout": res.stdout,
        "stderr": res.stderr,
    }


@router.post("/agent/{session_id}/chat")
async def chat_agent_endpoint(
    session_id: str,
    payload: AgentPromptRequest,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
) -> dict[str, Any]:
    """Conversational assistant endpoint without workspace modification tools."""
    events: list[dict[str, Any]] = []
    final_message = ""

    async for event in orchestrator.chat(session_id, payload.prompt):
        events.append(event.model_dump())
        if event.event_type == "message" and event.content:
            final_message = event.content

    return {
        "session_id": session_id,
        "mode": "chat",
        "prompt": payload.prompt,
        "message": final_message,
        "events": events,
    }


@router.post("/agent/{session_id}/run")
async def run_agent_endpoint(
    session_id: str,
    payload: AgentPromptRequest,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
) -> dict[str, Any]:
    """Run the Agent Orchestrator and return all timeline events."""
    if workspace_manager.is_session_submitted(session_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Session '{session_id}' has already been submitted and is locked in read-only mode. Agent execution is prohibited.",
        )
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
    if workspace_manager.is_session_submitted(session_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Session '{session_id}' has already been submitted and is locked in read-only mode. Agent execution is prohibited.",
        )

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


@router.get("/submissions/{submission_id}")
async def get_submission_endpoint(
    submission_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Retrieve authoritative assessment report for a submission owned by the candidate."""
    report = submission_manager.get_submission_report(submission_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission '{submission_id}' not found.",
        )

    user_id_str = str(current_user.id)
    # Strictly enforce ownership: User B cannot retrieve User A's submission
    if report.userId and report.userId != user_id_str:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view this submission.",
        )

    # If legacy/dev submission without an owner, reject normal user access
    if not report.userId:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission '{submission_id}' not found.",
        )

    return report.model_dump()


@router.get("/submissions")
async def list_submissions_endpoint(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """List all historical submissions owned exclusively by the authenticated user."""
    user_id_str = str(current_user.id)
    records = submission_manager.list_submissions(user_id=user_id_str)
    return {"submissions": [r.model_dump() for r in records]}



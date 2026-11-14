"""Regression tests for session lifecycle, Agent tool authorization, and workspace synchronization."""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.agent.workspace_manager import SessionWorkspaceManager, WorkspaceSecurityError
from app.core.agent.tools import AgentToolDispatcher
from app.core.runner.isolated_runner import IsolatedTestRunner


@pytest.fixture
def temp_workspace_manager(tmp_path: Path):
    return SessionWorkspaceManager(base_storage_dir=tmp_path)


@pytest.fixture
def tool_dispatcher(temp_workspace_manager: SessionWorkspaceManager):
    runner = IsolatedTestRunner()
    return AgentToolDispatcher(workspace_manager=temp_workspace_manager, test_runner=runner)


@pytest.mark.asyncio
async def test_active_session_allows_patch_and_increments_revision(
    temp_workspace_manager: SessionWorkspaceManager,
    tool_dispatcher: AgentToolDispatcher,
):
    """Case 1, 3, 4: Active session allows agent to patch, changes content, and increments revision."""
    session_id = "test-active-session"
    temp_workspace_manager.initialize_ci001_workspace(session_id)

    assert not temp_workspace_manager.is_session_submitted(session_id)
    initial_rev = temp_workspace_manager.get_revision(session_id, "app/utils/security.py")
    assert initial_rev == 1

    # Apply patch via tool dispatcher
    res = await tool_dispatcher.execute_tool(
        session_id=session_id,
        tool_name="patch_file",
        arguments_json='{"path": "app/utils/security.py", "target": "return False", "replacement": "return True"}',
    )

    assert res.get("status") == "success"
    assert res.get("revision") == 2
    assert "diff" in res

    # Verify content changed
    updated_content = temp_workspace_manager.read_file(session_id, "app/utils/security.py")
    assert "return True" in updated_content
    assert temp_workspace_manager.get_revision(session_id, "app/utils/security.py") == 2


@pytest.mark.asyncio
async def test_submitted_session_rejects_agent_patch(
    temp_workspace_manager: SessionWorkspaceManager,
    tool_dispatcher: AgentToolDispatcher,
):
    """Case 2: Submitted session rejects agent patch with clear error."""
    session_id = "test-submitted-session"
    temp_workspace_manager.initialize_ci001_workspace(session_id)
    temp_workspace_manager.submit_session(session_id)

    assert temp_workspace_manager.is_session_submitted(session_id)

    # Attempt patch via dispatcher
    res = await tool_dispatcher.execute_tool(
        session_id=session_id,
        tool_name="patch_file",
        arguments_json='{"path": "app/utils/security.py", "target": "return False", "replacement": "return True"}',
    )

    assert "error" in res
    assert "locked in read-only mode" in res["error"].lower() or "submitted" in res["error"].lower()

    # Verify direct manager raises WorkspaceSecurityError
    with pytest.raises(WorkspaceSecurityError):
        temp_workspace_manager.patch_file(
            session_id=session_id,
            relative_path="app/utils/security.py",
            target_string="return False",
            replacement_string="return True",
        )


@pytest.mark.asyncio
async def test_failed_patch_returns_meaningful_error(
    temp_workspace_manager: SessionWorkspaceManager,
    tool_dispatcher: AgentToolDispatcher,
):
    """Case 5: Failed patch receives a meaningful error explaining target mismatch."""
    session_id = "test-fail-patch"
    temp_workspace_manager.initialize_ci001_workspace(session_id)

    res = await tool_dispatcher.execute_tool(
        session_id=session_id,
        tool_name="patch_file",
        arguments_json='{"path": "app/utils/security.py", "target": "non_existent_snippet_xyz", "replacement": "new_code"}',
    )

    assert "error" in res
    assert "Target string not found" in res["error"]


def test_session_api_lifecycle_and_submission_guard():
    """Verify HTTP API lifecycle: init -> submit -> 403 on edit/agent -> reset -> 200 on edit."""
    client = TestClient(app)
    session_id = "test-lifecycle-http"

    # 1. Initialize
    init_res = client.post(f"/api/v1/workspace/{session_id}/init?force_reset=true")
    assert init_res.status_code == 200
    assert init_res.json()["is_submitted"] is False
    assert init_res.json()["status"] == "active"

    # 2. Edit works when active
    edit_res = client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Updated content", "base_revision": 1},
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["revision"] == 2

    # 3. Submit session
    sub_res = client.post(f"/api/v1/workspace/{session_id}/submit")
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "submitted"

    # 4. Edit rejected with 403 on submitted session
    edit_locked = client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Hacked content", "base_revision": 2},
    )
    assert edit_locked.status_code == 403
    err_text = str(edit_locked.json())
    assert "submitted" in err_text.lower()

    # 5. Agent run rejected with 403 on submitted session
    agent_locked = client.post(
        f"/api/v1/agent/{session_id}/run",
        json={"prompt": "Fix all bugs"},
    )
    assert agent_locked.status_code == 403
    assert "submitted" in str(agent_locked.json()).lower()

    # 6. Reset session restores active status
    reset_res = client.post(f"/api/v1/workspace/{session_id}/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "active"
    assert reset_res.json()["is_submitted"] is False

    # 7. Edit succeeds again after reset
    edit_after_reset = client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Working again", "base_revision": 1},
    )
    assert edit_after_reset.status_code == 200

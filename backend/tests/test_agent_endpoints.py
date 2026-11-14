"""Integration tests for workspace synchronization, test runner, and agent endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture
def app_with_test_settings(test_settings: Settings):
    application = create_app(settings=test_settings)
    application.dependency_overrides[get_settings] = lambda: test_settings
    return application


@pytest.fixture
async def client(app_with_test_settings):
    transport = ASGITransport(app=app_with_test_settings)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as ac:
        yield ac


@pytest.mark.asyncio
async def test_init_workspace_endpoint(client):
    """POST /api/v1/workspace/{session_id}/init initializes the session workspace."""
    response = await client.post("/api/v1/workspace/test-session-01/init?force_reset=true")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test-session-01"
    assert data["files_count"] >= 5


@pytest.mark.asyncio
async def test_get_workspace_files_endpoint(client):
    """GET /api/v1/workspace/{session_id}/files returns documents."""
    await client.post("/api/v1/workspace/test-session-02/init")
    response = await client.get("/api/v1/workspace/test-session-02/files")
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert "app/services/authentication.py" in data["documents"]


@pytest.mark.asyncio
async def test_save_workspace_file_endpoint(client):
    """PUT /api/v1/workspace/{session_id}/files updates file atomically."""
    await client.post("/api/v1/workspace/test-session-03/init")
    payload = {
        "path": "app/utils/security.py",
        "content": "# Updated from Monaco\n",
        "base_revision": 1,
    }
    response = await client.put("/api/v1/workspace/test-session-03/files", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["path"] == "app/utils/security.py"
    assert data["revision"] >= 2
    assert "diff" in data


@pytest.mark.asyncio
async def test_stale_update_rejected_with_http_409(client):
    """PUT /api/v1/workspace/{session_id}/files returns HTTP 409 Conflict when base_revision is stale."""
    session_id = "test-session-conflict-01"
    await client.post(f"/api/v1/workspace/{session_id}/init?force_reset=true")

    # First update: base_revision=1 moves revision to 2
    res1 = await client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# First edit\n", "base_revision": 1},
    )
    assert res1.status_code == 200
    assert res1.json()["revision"] == 2

    # Stale update: base_revision=1 is now older than current revision 2
    res_stale = await client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Stale edit\n", "base_revision": 1},
    )
    assert res_stale.status_code == 409
    error_payload = res_stale.json()["error"]
    assert error_payload["code"] == "409"
    conflict_data = error_payload["message"]
    assert conflict_data["error"] == "Revision conflict"
    assert conflict_data["expected_revision"] == 1
    assert conflict_data["current_revision"] == 2
    assert "# First edit" in conflict_data["current_content"]


@pytest.mark.asyncio
async def test_concurrent_agent_and_candidate_modification_conflict(client):
    """Simulate Agent patch followed by candidate stale edit, verifying conflict rejection."""
    session_id = "test-session-agent-candidate"
    await client.post(f"/api/v1/workspace/{session_id}/init?force_reset=true")

    from app.api.v1.routes.agent_workspace import workspace_manager

    # Agent applies patch directly through workspace_manager
    agent_patch = workspace_manager.patch_file(
        session_id=session_id,
        relative_path="app/utils/security.py",
        target_string="def verify_password",
        replacement_string="# Patched by Agent\ndef verify_password",
    )
    assert agent_patch["revision"] == 2

    # Candidate was looking at base_revision=1 and submits a delayed Monaco edit
    candidate_res = await client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Candidate stale buffer\n", "base_revision": 1},
    )
    assert candidate_res.status_code == 409
    detail = candidate_res.json()["error"]["message"]
    assert detail["current_revision"] == 2

    # Candidate re-synchronizes and submits with updated base_revision=2
    candidate_retry = await client.put(
        f"/api/v1/workspace/{session_id}/files",
        json={"path": "app/utils/security.py", "content": "# Candidate merged edit\n", "base_revision": 2},
    )
    assert candidate_retry.status_code == 200
    assert candidate_retry.json()["revision"] == 3


@pytest.mark.asyncio
async def test_run_tests_endpoint(client):
    """POST /api/v1/runner/{session_id}/run runs pytest and returns structured results."""
    await client.post("/api/v1/workspace/test-session-04/init")
    response = await client.post("/api/v1/runner/test-session-04/run")
    assert response.status_code == 200
    data = response.json()
    assert "exit_code" in data
    assert "total_tests" in data
    assert "passed_tests" in data
    assert "failed_tests" in data
    assert "stdout" in data


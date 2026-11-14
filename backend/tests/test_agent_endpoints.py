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
    }
    response = await client.put("/api/v1/workspace/test-session-03/files", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["path"] == "app/utils/security.py"
    assert "diff" in data


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


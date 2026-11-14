"""Tests for health probe routes, root status, CORS headers, and error handling."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient) -> None:
    """Test root heartbeat endpoint."""
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "codevo-backend"
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_live_endpoint(async_client: AsyncClient) -> None:
    """Test process liveness probe."""
    response = await async_client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "codevo-backend"
    assert data["version"] == "0.1.0"
    assert data["environment"] == "test"


@pytest.mark.asyncio
async def test_health_ready_endpoint(async_client: AsyncClient) -> None:
    """Test readiness probe reporting verified readiness components."""
    response = await async_client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "codevo-backend"
    assert "components" in data
    assert data["components"]["configuration"] == "ready"
    assert data["components"]["api_router"] == "ready"
    # Ensure unconfigured/unimplemented systems are not falsely reported as connected
    assert "database" not in data["components"]
    assert "supabase_auth" not in data["components"]


@pytest.mark.asyncio
async def test_cors_allowed_origin(async_client: AsyncClient) -> None:
    """Test CORS headers for permitted origin."""
    response = await async_client.get(
        "/api/v1/health/live",
        headers={"Origin": "http://localhost:3000"},
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"


@pytest.mark.asyncio
async def test_cors_disallowed_origin(async_client: AsyncClient) -> None:
    """Test CORS headers for unpermitted origin."""
    response = await async_client.get(
        "/api/v1/health/live",
        headers={"Origin": "https://unauthorized-origin.com"},
    )
    assert response.status_code == 200
    # Access control origin header must not match unauthorized origin
    assert response.headers.get("access-control-allow-origin") != "https://unauthorized-origin.com"


@pytest.mark.asyncio
async def test_not_found_structured_error(async_client: AsyncClient) -> None:
    """Test 404 response uses standard structured error format."""
    response = await async_client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "404"
    assert data["error"]["message"] == "Not Found"


@pytest.mark.asyncio
async def test_production_disables_api_documentation() -> None:
    """Test that interactive API docs (/docs, /redoc, /openapi.json) are disabled in production."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        INTERNAL_SERVICE_KEY="prod-sec-key-7f9a1b2c3d4e5f6a7b8c9d0e",
        ALLOWED_ORIGINS=["https://codevo.dev"],
        SUPABASE_URL="https://prod-project.supabase.co",
    )
    prod_app = create_app(settings=prod_settings)
    transport = ASGITransport(app=prod_app)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as prod_client:
        docs_res = await prod_client.get("/docs")
        assert docs_res.status_code == 404

        redoc_res = await prod_client.get("/redoc")
        assert redoc_res.status_code == 404

        openapi_res = await prod_client.get("/openapi.json")
        assert openapi_res.status_code == 404

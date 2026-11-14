"""Tests for the demonstration endpoint GET /api/v1/auth/me and authentication dependency."""

from unittest.mock import AsyncMock
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.auth.dependencies import get_jwks_provider
from app.core.auth.exceptions import JWKSFetchError, JWKSKeyNotFoundError
from app.core.auth.jwks import JWKSProvider
from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture
def mock_jwks_provider(ec_keypair, rsa_keypair) -> JWKSProvider:
    """Mock JWKSProvider returning pre-generated offline keys without network requests."""
    provider = AsyncMock(spec=JWKSProvider)
    keys_map = {
        ec_keypair["kid"]: ec_keypair["public_key"],
        rsa_keypair["kid"]: rsa_keypair["public_key"],
    }
    alg_map = {
        ec_keypair["kid"]: "ES256",
        rsa_keypair["kid"]: "RS256",
    }

    async def _get_key(kid: str):
        if kid in keys_map:
            return keys_map[kid]
        raise JWKSKeyNotFoundError(f"Key '{kid}' not found in mock JWKS")

    provider.get_key_for_kid.side_effect = _get_key
    provider.get_algorithm_for_kid.side_effect = lambda kid: alg_map.get(kid)
    return provider


@pytest.fixture
def auth_app(test_settings: Settings, mock_jwks_provider: JWKSProvider):
    """Create test application instance with mocked JWKS provider dependency override."""
    application = create_app(settings=test_settings)
    application.dependency_overrides[get_settings] = lambda: test_settings
    application.dependency_overrides[get_jwks_provider] = lambda: mock_jwks_provider
    return application


@pytest.fixture
async def auth_client(auth_app):
    """AsyncClient wired to auth_app."""
    transport = ASGITransport(app=auth_app)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as ac:
        yield ac


@pytest.mark.asyncio
async def test_auth_me_valid_es256_token(auth_client, ec_keypair, make_token, test_user_id):
    """GET /api/v1/auth/me succeeds with a valid ES256 token and returns verified identity."""
    token = make_token(ec_keypair)
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user_id)
    assert data["role"] == "authenticated"
    # Verify no sensitive or extraneous token claims leaked in response
    assert "token" not in data
    assert "email" not in data
    assert "app_metadata" not in data


@pytest.mark.asyncio
async def test_auth_me_valid_rs256_token(auth_client, rsa_keypair, make_token, test_user_id):
    """GET /api/v1/auth/me succeeds with a valid RS256 token."""
    token = make_token(rsa_keypair)
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_user_id)
    assert data["role"] == "authenticated"


@pytest.mark.asyncio
async def test_auth_me_missing_authorization_header(auth_client):
    """GET /api/v1/auth/me fails with 401 when Authorization header is absent."""
    response = await auth_client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "401"


@pytest.mark.asyncio
async def test_auth_me_malformed_authorization_header(auth_client):
    """GET /api/v1/auth/me fails with 401 when header does not use Bearer format."""
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Basic dXNlcjpwYXNz"},
    )
    assert response.status_code == 401
    assert 'error="invalid_token"' in response.headers.get("www-authenticate", "")


@pytest.mark.asyncio
async def test_auth_me_invalid_token_returns_401(auth_client):
    """GET /api/v1/auth/me returns 401 for an invalid or tampered token."""
    response = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not.a.valid.jwt.token"},
    )
    assert response.status_code == 401
    assert 'error="invalid_token"' in response.headers.get("www-authenticate", "")
    data = response.json()
    assert data["error"]["code"] == "401"


@pytest.mark.asyncio
async def test_auth_me_jwks_infrastructure_failure_returns_503(test_settings, ec_keypair, make_token):
    """GET /api/v1/auth/me returns 503 when the JWKS authority is unavailable."""
    failing_provider = AsyncMock(spec=JWKSProvider)
    failing_provider.get_key_for_kid.side_effect = JWKSFetchError("Supabase JWKS timeout")

    app = create_app(settings=test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    app.dependency_overrides[get_jwks_provider] = lambda: failing_provider

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as client:
        token = make_token(ec_keypair)
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 503
        assert response.headers.get("retry-after") == "10"
        data = response.json()
        assert data["error"]["code"] == "503"


@pytest.mark.asyncio
async def test_auth_me_unconfigured_supabase_fails_closed():
    """When SUPABASE_URL is unconfigured, protected endpoints fail closed with 503 (never bypass)."""
    unconfigured_settings = Settings(
        ENVIRONMENT="development",
        DEBUG=True,
        SUPABASE_URL=None,  # Unconfigured
    )
    app = create_app(settings=unconfigured_settings)
    app.dependency_overrides[get_settings] = lambda: unconfigured_settings

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer any.token.string"},
        )
        assert response.status_code == 503
        assert response.headers.get("retry-after") == "30"
        data = response.json()
        assert data["error"]["code"] == "503"


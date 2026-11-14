"""Pytest configuration and common fixtures."""

import json
import time
import uuid
from typing import Any, AsyncGenerator
import jwt
from jwt.algorithms import ECAlgorithm, RSAAlgorithm
from cryptography.hazmat.primitives.asymmetric import ec, rsa
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture
def ec_keypair() -> dict[str, Any]:
    """Generate a test ECDSA P-256 keypair with corresponding public JWK."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    jwk_dict = json.loads(ECAlgorithm.to_jwk(public_key))
    kid = "test-ec-key-id-001"
    jwk_dict["kid"] = kid
    jwk_dict["alg"] = "ES256"
    jwk_dict["use"] = "sig"
    return {
        "private_key": private_key,
        "public_key": public_key,
        "jwk": jwk_dict,
        "kid": kid,
        "alg": "ES256",
    }


@pytest.fixture
def rsa_keypair() -> dict[str, Any]:
    """Generate a test RSA 2048-bit keypair with corresponding public JWK."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    jwk_dict = json.loads(RSAAlgorithm.to_jwk(public_key))
    kid = "test-rsa-key-id-002"
    jwk_dict["kid"] = kid
    jwk_dict["alg"] = "RS256"
    jwk_dict["use"] = "sig"
    return {
        "private_key": private_key,
        "public_key": public_key,
        "jwk": jwk_dict,
        "kid": kid,
        "alg": "RS256",
    }


@pytest.fixture
def valid_jwks_dict(ec_keypair: dict[str, Any], rsa_keypair: dict[str, Any]) -> dict[str, Any]:
    """Return a valid JWKS response containing both ES256 and RS256 public keys."""
    return {
        "keys": [
            ec_keypair["jwk"],
            rsa_keypair["jwk"],
        ]
    }


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """Canonical test candidate user UUID."""
    return uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")


@pytest.fixture
def make_token(test_settings: Settings, test_user_id: uuid.UUID):
    """Factory fixture for minting customized JWTs signed with offline test keys."""

    def _mint(
        keypair: dict[str, Any],
        overrides: dict[str, Any] | None = None,
        headers_override: dict[str, Any] | None = None,
        algorithm_override: str | None = None,
        signing_key_override: Any = None,
    ) -> str:
        now = int(time.time())
        payload = {
            "iss": test_settings.supabase_issuer,
            "aud": "authenticated",
            "sub": str(test_user_id),
            "role": "authenticated",
            "email": "candidate@example.com",
            "exp": now + 3600,
            "iat": now,
            "app_metadata": {"provider": "email"},
            "user_metadata": {"name": "Candidate Tester"},
        }
        if overrides:
            for k, v in overrides.items():
                if v is None:
                    payload.pop(k, None)
                else:
                    payload[k] = v

        alg = algorithm_override or keypair["alg"]
        headers = {"kid": keypair["kid"]}
        if headers_override:
            for k, v in headers_override.items():
                if v is None:
                    headers.pop(k, None)
                else:
                    headers[k] = v

        signing_key = signing_key_override or keypair["private_key"]
        return jwt.encode(payload, signing_key, algorithm=alg, headers=headers)

    return _mint


@pytest.fixture
def test_settings() -> Settings:
    """Provide isolated settings for testing."""
    return Settings(
        ENVIRONMENT="test",
        DEBUG=True,
        ALLOWED_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"],
        INTERNAL_SERVICE_KEY="test-internal-service-key-codevo-32bytes",
        SUPABASE_URL="https://test-project.supabase.co",
        SUPABASE_JWKS_CACHE_TTL_SECONDS=600,
        SUPABASE_JWKS_TIMEOUT_SECONDS=5.0,
    )


@pytest.fixture
def app(test_settings: Settings) -> FastAPI:
    """Create a FastAPI application instance configured for testing."""
    application = create_app(settings=test_settings)
    application.dependency_overrides[get_settings] = lambda: test_settings
    return application


@pytest.fixture
async def async_client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Provide asynchronous HTTP client for endpoint tests using ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://127.0.0.1") as ac:
        yield ac

"""Tests for cryptographic Supabase JWT verification and claim validation."""

import time
import uuid
import pytest
import jwt
from unittest.mock import AsyncMock

from app.core.auth.exceptions import (
    ExpiredTokenError,
    InvalidAlgorithmError,
    InvalidClaimError,
    InvalidTokenError,
    JWKSKeyNotFoundError,
)
from app.core.auth.jwks import JWKSProvider
from app.core.auth.verifier import SupabaseJWTVerifier
from app.core.config import Settings


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
def verifier(test_settings: Settings) -> SupabaseJWTVerifier:
    """Create a SupabaseJWTVerifier matching test settings."""
    return SupabaseJWTVerifier(
        expected_issuer=test_settings.supabase_issuer,
        expected_audience="authenticated",
        clock_skew_seconds=10,
    )


@pytest.mark.asyncio
async def test_valid_es256_token(verifier, mock_jwks_provider, ec_keypair, make_token, test_user_id):
    """Test successful verification of valid ES256 Supabase token."""
    token = make_token(ec_keypair)
    user = await verifier.verify_token(token, mock_jwks_provider)

    assert user.id == test_user_id
    assert user.role == "authenticated"
    assert user.email == "candidate@example.com"


@pytest.mark.asyncio
async def test_valid_rs256_token(verifier, mock_jwks_provider, rsa_keypair, make_token, test_user_id):
    """Test successful verification of valid RS256 Supabase token."""
    token = make_token(rsa_keypair)
    user = await verifier.verify_token(token, mock_jwks_provider)

    assert user.id == test_user_id
    assert user.role == "authenticated"


@pytest.mark.asyncio
async def test_reject_missing_kid(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token missing 'kid' in header."""
    token = make_token(ec_keypair, headers_override={"kid": None})
    with pytest.raises(InvalidTokenError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "missing required 'kid'" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_unknown_kid(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token with an unknown key ID."""
    token = make_token(ec_keypair, headers_override={"kid": "unknown-nonexistent-kid"})
    with pytest.raises(JWKSKeyNotFoundError):
        await verifier.verify_token(token, mock_jwks_provider)


@pytest.mark.asyncio
async def test_reject_hs256_algorithm(verifier, mock_jwks_provider, make_token):
    """Strictly reject symmetric HS256 algorithm tokens."""
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": "authenticated", "iss": verifier.expected_issuer, "role": "authenticated"},
        "insecure-symmetric-shared-secret-key-123",
        algorithm="HS256",
        headers={"kid": "some-key-id"},
    )
    with pytest.raises(InvalidAlgorithmError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "Only ES256 and RS256 are permitted" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_alg_none(verifier, mock_jwks_provider):
    """Strictly reject 'none' algorithm tokens."""
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": "authenticated", "iss": verifier.expected_issuer, "role": "authenticated"},
        key="",
        algorithm="none",
        headers={"kid": "some-key-id"},
    )
    with pytest.raises(InvalidAlgorithmError):
        await verifier.verify_token(token, mock_jwks_provider)


@pytest.mark.asyncio
async def test_reject_invalid_signature(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token signed with wrong private key."""
    # Generate another rogue private key
    from cryptography.hazmat.primitives.asymmetric import ec
    rogue_key = ec.generate_private_key(ec.SECP256R1())
    token = make_token(ec_keypair, signing_key_override=rogue_key)

    with pytest.raises(InvalidTokenError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "signature verification failed" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_tampered_payload(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token whose payload was modified after signing."""
    token = make_token(ec_keypair)
    parts = token.split(".")
    # Tamper with payload part by flipping characters
    tampered_payload = parts[1][:-2] + "AA"
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

    with pytest.raises(InvalidTokenError):
        await verifier.verify_token(tampered_token, mock_jwks_provider)


@pytest.mark.asyncio
async def test_reject_expired_token(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token with past expiration timestamp."""
    past_time = int(time.time()) - 3600
    token = make_token(ec_keypair, overrides={"exp": past_time, "iat": past_time - 60})

    with pytest.raises(ExpiredTokenError):
        await verifier.verify_token(token, mock_jwks_provider)


@pytest.mark.asyncio
async def test_reject_future_issued_token(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token with iat materially in the future (beyond clock skew)."""
    future_time = int(time.time()) + 3600
    token = make_token(ec_keypair, overrides={"iat": future_time, "exp": future_time + 3600})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    err_msg = str(exc.value).lower()
    assert "future" in err_msg or "not yet valid" in err_msg


@pytest.mark.asyncio
async def test_reject_not_yet_valid_nbf_token(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token whose nbf timestamp is in the future."""
    future_nbf = int(time.time()) + 1800
    token = make_token(ec_keypair, overrides={"nbf": future_nbf})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "not yet valid" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_wrong_issuer(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token with untrusted issuer."""
    token = make_token(ec_keypair, overrides={"iss": "https://malicious-issuer.com/auth/v1"})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "issuer" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_reject_wrong_audience(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token with wrong audience."""
    token = make_token(ec_keypair, overrides={"aud": "untrusted-audience"})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "audience" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_reject_missing_exp(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token missing required 'exp' expiration claim."""
    token = make_token(ec_keypair, overrides={"exp": None})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "required claim" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_reject_missing_iat(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token missing required 'iat' issued-at claim."""
    token = make_token(ec_keypair, overrides={"iat": None})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "required claim" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_reject_missing_subject(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token missing sub claim."""
    token = make_token(ec_keypair, overrides={"sub": None})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "required claim" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_reject_invalid_uuid_subject(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject token whose sub claim is not a valid UUID."""
    token = make_token(ec_keypair, overrides={"sub": "not-a-valid-uuid-format"})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "valid UUID" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_service_role(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject service_role tokens (only 'authenticated' candidate user tokens are accepted)."""
    token = make_token(ec_keypair, overrides={"role": "service_role"})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "Prohibited token role 'service_role'" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_anon_role(verifier, mock_jwks_provider, ec_keypair, make_token):
    """Reject anonymous tokens."""
    token = make_token(ec_keypair, overrides={"role": "anon"})

    with pytest.raises(InvalidClaimError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "Prohibited token role 'anon'" in str(exc.value)


@pytest.mark.asyncio
async def test_reject_algorithm_mismatch_with_jwk(verifier, mock_jwks_provider, ec_keypair, rsa_keypair, make_token):
    """Reject token if header alg does not match JWK declared algorithm."""
    # Token claims alg=RS256 but specifies ec_keypair's kid (which is ES256)
    token = make_token(rsa_keypair, headers_override={"kid": ec_keypair["kid"]})

    with pytest.raises(InvalidAlgorithmError) as exc:
        await verifier.verify_token(token, mock_jwks_provider)
    assert "conflicts with key's declared algorithm" in str(exc.value)

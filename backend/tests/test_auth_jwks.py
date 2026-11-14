"""Tests for the asymmetric JWKS provider, caching, rotation, and failure modes."""

import asyncio
import copy
import json
import time
import httpx
import pytest

from app.core.auth.exceptions import (
    JWKSFetchError,
    JWKSInvalidKeyError,
    JWKSKeyNotFoundError,
)
from app.core.auth.jwks import JWKSProvider


@pytest.mark.asyncio
async def test_jwks_cache_hit(valid_jwks_dict, ec_keypair):
    """Verify that cached keys are reused without duplicate HTTP requests."""
    fetch_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal fetch_count
        fetch_count += 1
        return httpx.Response(200, json=valid_jwks_dict)

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport)
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        cache_ttl_seconds=600,
        http_client=client,
    )

    try:
        # First call: populates cache
        key1 = await provider.get_key_for_kid(ec_keypair["kid"])
        assert key1 is not None
        assert fetch_count == 1

        # Second call: cache hit
        key2 = await provider.get_key_for_kid(ec_keypair["kid"])
        assert key2 is key1
        assert fetch_count == 1
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_cache_expiry(valid_jwks_dict, ec_keypair):
    """Verify that expired cache triggers a fresh JWKS fetch."""
    fetch_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal fetch_count
        fetch_count += 1
        return httpx.Response(200, json=valid_jwks_dict)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    # TTL of 1 second
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        cache_ttl_seconds=1,
        http_client=client,
    )

    try:
        await provider.get_key_for_kid(ec_keypair["kid"])
        assert fetch_count == 1

        # Manually expire cache
        provider._expires_at = time.time() - 1

        # Next call must trigger refresh
        await provider.get_key_for_kid(ec_keypair["kid"])
        assert fetch_count == 2
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_unknown_kid_triggers_controlled_refresh(valid_jwks_dict, ec_keypair, rsa_keypair):
    """Verify that an unknown kid triggers exactly one controlled refresh."""
    fetch_count = 0

    # First fetch returns only EC key, second fetch returns both
    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal fetch_count
        fetch_count += 1
        if fetch_count == 1:
            return httpx.Response(200, json={"keys": [ec_keypair["jwk"]]})
        return httpx.Response(200, json=valid_jwks_dict)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        cache_ttl_seconds=600,
        refresh_cooldown_seconds=1.0,
        http_client=client,
    )

    try:
        # Load EC key
        await provider.get_key_for_kid(ec_keypair["kid"])
        assert fetch_count == 1

        # Request unknown RSA key: triggers refresh and succeeds
        rsa_key = await provider.get_key_for_kid(rsa_keypair["kid"])
        assert rsa_key is not None
        assert fetch_count == 2
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_unknown_kid_not_found_after_refresh(valid_jwks_dict):
    """Verify that an unknown key still missing after refresh raises JWKSKeyNotFoundError."""
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=valid_jwks_dict))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        cache_ttl_seconds=600,
        http_client=client,
    )

    try:
        with pytest.raises(JWKSKeyNotFoundError) as exc:
            await provider.get_key_for_kid("completely-nonexistent-kid")
        assert "not found in Supabase JWKS" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_unknown_kid_refresh_throttling(valid_jwks_dict):
    """Verify that repeated requests for unknown keys are throttled to prevent DoS."""
    fetch_count = 0

    def handler(req: httpx.Request) -> httpx.Response:
        nonlocal fetch_count
        fetch_count += 1
        return httpx.Response(200, json=valid_jwks_dict)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        cache_ttl_seconds=600,
        refresh_cooldown_seconds=5.0,
        http_client=client,
    )

    try:
        # First unknown kid triggers refresh (fetch_count = 1)
        with pytest.raises(JWKSKeyNotFoundError):
            await provider.get_key_for_kid("unknown-kid-1")
        assert fetch_count == 1

        # Immediately request another unknown kid: throttled by cooldown, fetch_count remains 1
        with pytest.raises(JWKSKeyNotFoundError) as exc:
            await provider.get_key_for_kid("unknown-kid-2")
        assert "refresh is throttled" in str(exc.value)
        assert fetch_count == 1
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_timeout_fails_closed():
    """Verify that connection/read timeouts raise JWKSFetchError (fail-closed)."""

    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("Mocked read timeout")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        timeout_seconds=0.5,
        http_client=client,
    )

    try:
        with pytest.raises(JWKSFetchError) as exc:
            await provider.get_key_for_kid("any-kid")
        assert "Timeout retrieving Supabase JWKS" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_http_error_fails_closed():
    """Verify that HTTP 500 error from Supabase raises JWKSFetchError."""
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(500, text="Internal Server Error"))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        with pytest.raises(JWKSFetchError) as exc:
            await provider.get_key_for_kid("any-kid")
        assert "returned unexpected status: 500" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_malformed_json():
    """Verify that non-JSON response raises JWKSFetchError."""
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, text="not valid json <html/>"))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        with pytest.raises(JWKSFetchError) as exc:
            await provider.get_key_for_kid("any-kid")
        assert "not valid JSON" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_empty_keys_list():
    """Verify that an empty keys array raises JWKSFetchError."""
    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json={"keys": []}))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        with pytest.raises(JWKSFetchError) as exc:
            await provider.get_key_for_kid("any-kid")
        assert "zero keys" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_reject_prohibited_private_key_material(valid_jwks_dict):
    """Verify that JWKs containing private key parameters (e.g., 'd') raise JWKSInvalidKeyError."""
    tampered_jwks = copy.deepcopy(valid_jwks_dict)
    # Inject private exponent 'd'
    tampered_jwks["keys"][0]["d"] = "prohibited-private-exponent-leak"

    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=tampered_jwks))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        with pytest.raises(JWKSInvalidKeyError) as exc:
            await provider.get_key_for_kid("any-kid")
        assert "contains prohibited private key parameters" in str(exc.value)
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_ignores_algorithm_kty_mismatch(valid_jwks_dict, ec_keypair):
    """Verify that JWK with mismatched kty (e.g., alg=RS256, kty=EC) is discarded."""
    tampered_jwks = copy.deepcopy(valid_jwks_dict)
    # Give the first key a mismatched kty
    tampered_jwks["keys"][0]["alg"] = "RS256"
    tampered_jwks["keys"][0]["kty"] = "EC"  # RS256 requires RSA

    client = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=tampered_jwks))
    )
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        # The mismatched key was discarded, so requesting its kid raises JWKSKeyNotFoundError
        with pytest.raises(JWKSKeyNotFoundError):
            await provider.get_key_for_kid(ec_keypair["kid"])
    finally:
        await provider.close()


@pytest.mark.asyncio
async def test_jwks_concurrent_fetches_deduplication(valid_jwks_dict, ec_keypair):
    """Verify that multiple concurrent requests do not cause duplicate network calls."""
    fetch_count = 0

    async def slow_handler(request: httpx.Request) -> httpx.Response:
        nonlocal fetch_count
        fetch_count += 1
        await asyncio.sleep(0.05)  # Simulate network latency
        return httpx.Response(200, json=valid_jwks_dict)

    client = httpx.AsyncClient(transport=httpx.MockTransport(slow_handler))
    provider = JWKSProvider(
        jwks_url="https://test.supabase.co/auth/v1/.well-known/jwks.json",
        http_client=client,
    )

    try:
        # Run 5 concurrent key requests
        tasks = [provider.get_key_for_kid(ec_keypair["kid"]) for _ in range(5)]
        results = await asyncio.gather(*tasks)

        assert len(results) == 5
        assert all(res is not None for res in results)
        # Lock ensures only 1 HTTP fetch occurred
        assert fetch_count == 1
    finally:
        await provider.close()


"""Asymmetric JWKS provider for retrieving and caching public keys from Supabase."""

import asyncio
import logging
import time
from typing import Any
import httpx
from jwt import PyJWK

from app.core.auth.exceptions import (
    JWKSFetchError,
    JWKSInvalidKeyError,
    JWKSKeyNotFoundError,
)

logger = logging.getLogger("codevo.auth.jwks")

# Fixed server-side cryptographic constraints: ES256 and RS256 only
SUPPORTED_ALGORITHMS: frozenset[str] = frozenset({"ES256", "RS256"})
ALGORITHM_TO_KTY: dict[str, str] = {
    "ES256": "EC",
    "RS256": "RSA",
}
# Prohibited private key attributes to prevent key exfiltration
PROHIBITED_PRIVATE_FIELDS: frozenset[str] = frozenset(
    {"d", "p", "q", "dp", "dq", "qi"}
)


class JWKSProvider:
    """Retrieves, validates, and caches public signing keys from Supabase's JWKS endpoint."""

    def __init__(
        self,
        jwks_url: str,
        cache_ttl_seconds: int = 600,
        timeout_seconds: float = 5.0,
        refresh_cooldown_seconds: float = 5.0,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.jwks_url = jwks_url
        self.cache_ttl_seconds = cache_ttl_seconds
        self.timeout_seconds = timeout_seconds
        self.refresh_cooldown_seconds = refresh_cooldown_seconds

        self._keys: dict[str, Any] = {}
        self._key_algorithms: dict[str, str] = {}
        self._expires_at: float = 0.0
        self._last_refresh: float = 0.0
        self._last_forced_refresh: float = 0.0
        self._lock = asyncio.Lock()

        # Reusable HTTP client; created lazily if not provided
        self._client: httpx.AsyncClient | None = http_client
        self._owns_client: bool = http_client is None

    async def _get_client(self) -> httpx.AsyncClient:
        """Return or instantiate the async HTTP client with strict timeouts."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(
                    connect=self.timeout_seconds,
                    read=self.timeout_seconds,
                    write=self.timeout_seconds,
                    pool=self.timeout_seconds,
                )
            )
            self._owns_client = True
        return self._client

    async def get_key_for_kid(self, kid: str) -> Any:
        """Retrieve the verified public key corresponding to the supplied key ID (kid)."""
        now = time.time()

        # Fast path: Key exists in active cache
        if now < self._expires_at and kid in self._keys:
            return self._keys[kid]

        # Slow path: Key missing or cache expired. Synchronize via lock to prevent stampede.
        async with self._lock:
            now = time.time()
            # Double check after acquiring lock
            if now < self._expires_at and kid in self._keys:
                return self._keys[kid]

            # If cache is expired, always refresh
            cache_expired = now >= self._expires_at

            # If cache is active but kid is unknown, enforce refresh throttling
            if now < self._expires_at and kid not in self._keys:
                time_since_forced = now - self._last_forced_refresh
                if time_since_forced < self.refresh_cooldown_seconds:
                    logger.warning(
                        "JWKS refresh throttled for unknown kid: cooldown active [%.1fs remaining]",
                        self.refresh_cooldown_seconds - time_since_forced,
                    )
                    raise JWKSKeyNotFoundError(
                        f"Signing key '{kid}' not found in active JWKS cache and refresh is throttled."
                    )

            # Perform controlled JWKS refresh
            await self._refresh_jwks()

            # Record timestamp if this refresh resulted in an unknown kid
            if kid not in self._keys:
                self._last_forced_refresh = time.time()

            # Retry key lookup after refresh
            if kid in self._keys:
                return self._keys[kid]

            # Key not found even after fresh JWKS fetch
            logger.warning("Signing key not found in Supabase JWKS after refresh: kid=%s", kid)
            raise JWKSKeyNotFoundError(
                f"Signing key with kid '{kid}' was not found in Supabase JWKS."
            )

    def get_algorithm_for_kid(self, kid: str) -> str | None:
        """Return the declared algorithm for a cached key."""
        return self._key_algorithms.get(kid)

    async def _refresh_jwks(self) -> None:
        """Fetch JWKS from the authoritative URL and update the internal public key cache."""
        logger.info("Fetching public signing keys from Supabase JWKS endpoint")
        client = await self._get_client()

        try:
            response = await client.get(self.jwks_url)
        except httpx.TimeoutException as exc:
            logger.error("Supabase JWKS request timed out after %.1fs", self.timeout_seconds)
            raise JWKSFetchError(
                f"Timeout retrieving Supabase JWKS after {self.timeout_seconds}s"
            ) from exc
        except httpx.HTTPError as exc:
            logger.error("Supabase JWKS HTTP communication error: %s", exc)
            raise JWKSFetchError(
                f"Failed to communicate with Supabase JWKS endpoint: {exc}"
            ) from exc
        except Exception as exc:
            logger.error("Unexpected error fetching JWKS: %s", exc)
            raise JWKSFetchError("Unexpected failure fetching JWKS") from exc

        if response.status_code != 200:
            logger.error("Supabase JWKS endpoint returned HTTP status %d", response.status_code)
            raise JWKSFetchError(
                f"Supabase JWKS endpoint returned unexpected status: {response.status_code}"
            )

        try:
            data = response.json()
        except Exception as exc:
            logger.error("Failed to parse Supabase JWKS response as JSON")
            raise JWKSFetchError("Supabase JWKS response is not valid JSON") from exc

        if not isinstance(data, dict) or "keys" not in data or not isinstance(data["keys"], list):
            raise JWKSFetchError("Malformed JWKS payload: root must be a dict containing 'keys' array")

        keys_list = data["keys"]
        if not keys_list:
            raise JWKSFetchError("Empty JWKS response: Supabase returned zero keys")

        new_keys: dict[str, Any] = {}
        new_algs: dict[str, str] = {}

        for jwk in keys_list:
            if not isinstance(jwk, dict):
                continue

            kid = jwk.get("kid")
            kty = jwk.get("kty")
            alg = jwk.get("alg")

            if not kid or not isinstance(kid, str):
                continue

            # Enforce server-side algorithm allowlist
            if alg not in SUPPORTED_ALGORITHMS:
                logger.debug("Skipping JWK with unsupported algorithm: kid=%s, alg=%s", kid, alg)
                continue

            # Enforce expected key type for algorithm
            expected_kty = ALGORITHM_TO_KTY.get(alg)
            if kty != expected_kty:
                logger.warning(
                    "JWK algorithm/kty mismatch: kid=%s, alg=%s, kty=%s (expected %s)",
                    kid,
                    alg,
                    kty,
                    expected_kty,
                )
                continue

            # Verify no private key material is present
            if any(field in jwk for field in PROHIBITED_PRIVATE_FIELDS):
                raise JWKSInvalidKeyError(
                    f"JWK entry for kid '{kid}' contains prohibited private key parameters"
                )

            try:
                # Convert JWK to cryptography public key object
                pyjwk = PyJWK(jwk)
                new_keys[kid] = pyjwk.key
                new_algs[kid] = alg
            except Exception as exc:
                logger.warning("Failed to parse JWK for kid=%s: %s", kid, exc)
                continue

        if not new_keys:
            raise JWKSFetchError(
                "No usable ES256 or RS256 public keys could be parsed from Supabase JWKS"
            )

        self._keys = new_keys
        self._key_algorithms = new_algs
        self._last_refresh = time.time()
        self._expires_at = self._last_refresh + self.cache_ttl_seconds
        logger.info("Successfully loaded %d verified signing keys into cache", len(new_keys))

    async def close(self) -> None:
        """Close internal HTTP client resources on application shutdown."""
        if self._owns_client and self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

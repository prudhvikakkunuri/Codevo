"""Cryptographic Supabase JWT verification against verified JWKS public keys."""

import logging
import time
import uuid
import jwt
from jwt.exceptions import (
    DecodeError,
    ExpiredSignatureError,
    ImmatureSignatureError,
    InvalidAudienceError,
    InvalidIssuerError,
    InvalidSignatureError,
    MissingRequiredClaimError,
    PyJWTError,
)

from app.core.auth.exceptions import (
    ExpiredTokenError,
    InvalidAlgorithmError,
    InvalidClaimError,
    InvalidTokenError,
)
from app.core.auth.jwks import JWKSProvider, SUPPORTED_ALGORITHMS
from app.core.auth.models import AuthenticatedUser

logger = logging.getLogger("codevo.auth.verifier")


class SupabaseJWTVerifier:
    """Performs rigorous cryptographic signature verification and claim validation on Supabase JWTs."""

    def __init__(
        self,
        expected_issuer: str,
        expected_audience: str = "authenticated",
        clock_skew_seconds: int = 10,
    ) -> None:
        self.expected_issuer = expected_issuer
        self.expected_audience = expected_audience
        self.clock_skew_seconds = clock_skew_seconds

    async def verify_token(
        self,
        token: str,
        jwks_provider: JWKSProvider,
    ) -> AuthenticatedUser:
        """Cryptographically verify the token and return the typed, validated AuthenticatedUser."""
        if not token or not isinstance(token, str) or token.count(".") != 2:
            raise InvalidTokenError("Malformed JWT structure. Expected header.payload.signature.")

        # 1. Inspect unverified header to extract algorithm and key ID
        try:
            unverified_header = jwt.get_unverified_header(token)
        except PyJWTError as exc:
            raise InvalidTokenError(f"Failed to parse JWT header: {exc}") from exc

        alg = unverified_header.get("alg")
        kid = unverified_header.get("kid")

        # 2. Enforce strict server-side algorithm allowlist (ES256, RS256 only)
        if not alg or alg not in SUPPORTED_ALGORITHMS:
            logger.warning("Rejected token with prohibited or unsupported algorithm: alg=%s", alg)
            raise InvalidAlgorithmError(
                f"Prohibited or unsupported token signing algorithm '{alg}'. Only ES256 and RS256 are permitted."
            )

        # 3. Require valid, non-empty key ID (kid)
        if not kid or not isinstance(kid, str) or not kid.strip():
            logger.warning("Rejected token missing required kid header")
            raise InvalidTokenError("Token header is missing required 'kid' parameter.")

        # 4. Retrieve public signing key from authoritative JWKS provider
        public_key = await jwks_provider.get_key_for_kid(kid.strip())

        # 5. Verify algorithm matches the key's declared algorithm in the JWKS
        key_declared_alg = jwks_provider.get_algorithm_for_kid(kid.strip())
        if key_declared_alg and key_declared_alg != alg:
            raise InvalidAlgorithmError(
                f"Token header algorithm '{alg}' conflicts with key's declared algorithm '{key_declared_alg}'."
            )

        # 6. Cryptographically verify signature and standard claims via PyJWT
        try:
            payload = jwt.decode(
                token,
                key=public_key,
                algorithms=[alg],
                audience=self.expected_audience,
                issuer=self.expected_issuer,
                leeway=self.clock_skew_seconds,
                options={
                    "require": ["exp", "iat", "sub", "aud", "iss"],
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True,
                    "verify_nbf": True,
                },
            )
        except ExpiredSignatureError as exc:
            logger.info("Rejected expired JWT token")
            raise ExpiredTokenError("Token has expired.") from exc
        except ImmatureSignatureError as exc:
            logger.info("Rejected not-yet-valid JWT token (nbf)")
            raise InvalidClaimError("Token is not yet valid (nbf).") from exc
        except InvalidIssuerError as exc:
            logger.warning("Rejected JWT with invalid issuer")
            raise InvalidClaimError("Token issuer (iss) does not match expected Supabase authority.") from exc
        except InvalidAudienceError as exc:
            logger.warning("Rejected JWT with invalid audience")
            raise InvalidClaimError("Token audience (aud) does not match expected audience.") from exc
        except InvalidSignatureError as exc:
            logger.warning("Rejected JWT with invalid cryptographic signature")
            raise InvalidTokenError("Cryptographic signature verification failed.") from exc
        except MissingRequiredClaimError as exc:
            logger.warning("Rejected JWT missing required claim: %s", exc)
            raise InvalidClaimError(f"Token is missing a required claim: {exc}") from exc
        except DecodeError as exc:
            logger.warning("Rejected malformed or tampered JWT: %s", exc)
            raise InvalidTokenError(f"Token decoding failed: {exc}") from exc
        except PyJWTError as exc:
            logger.warning("General JWT verification error: %s", exc)
            raise InvalidTokenError("JWT validation failed.") from exc

        # 7. Semantic invariant checks: sub must be a valid UUID
        sub_raw = payload.get("sub")
        try:
            user_uuid = uuid.UUID(str(sub_raw))
        except (ValueError, TypeError, AttributeError) as exc:
            logger.warning("Rejected token with non-UUID subject: sub=%s", sub_raw)
            raise InvalidClaimError("Token subject (sub) must be a valid UUID.") from exc

        # 8. Semantic invariant checks: role must equal 'authenticated' (reject 'anon', 'service_role')
        role = payload.get("role")
        if role != "authenticated":
            logger.warning("Rejected token with invalid or privileged role: role=%s", role)
            raise InvalidClaimError(
                f"Prohibited token role '{role}'. Only 'authenticated' candidate user tokens are accepted."
            )

        # 9. Verify iat is not in the future (beyond leeway)
        iat = payload.get("iat")
        now = time.time()
        if iat is not None and iat > (now + self.clock_skew_seconds):
            logger.warning("Rejected token with future issued-at timestamp: iat=%s, now=%s", iat, now)
            raise InvalidClaimError("Token iat indicates token was issued in the future.")

        return AuthenticatedUser(
            id=user_uuid,
            role=role,
            email=payload.get("email"),
            app_metadata=payload.get("app_metadata") or {},
            user_metadata=payload.get("user_metadata") or {},
        )


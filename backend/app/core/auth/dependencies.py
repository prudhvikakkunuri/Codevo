"""FastAPI authentication dependencies for enforcing validated candidate user identity."""

import logging
from typing import Annotated
from fastapi import Depends, Header, HTTPException, Request, status

from app.core.auth.exceptions import (
    AuthServiceNotConfiguredError,
    JWKSFetchError,
    JWTVerificationError,
)
from app.core.auth.jwks import JWKSProvider
from app.core.auth.models import AuthenticatedUser
from app.core.auth.verifier import SupabaseJWTVerifier
from app.core.config import Settings, get_settings

logger = logging.getLogger("codevo.auth.dependencies")


def get_jwks_provider(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> JWKSProvider:
    """Retrieve the application-level JWKSProvider instance or instantiate one."""
    if not settings.SUPABASE_URL or not settings.supabase_jwks_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured (SUPABASE_URL is missing).",
            headers={"Retry-After": "30"},
        )

    # Check for pre-initialized instance on application state
    if hasattr(request.app.state, "jwks_provider") and request.app.state.jwks_provider:
        return request.app.state.jwks_provider

    # Fallback instantiation if not pre-initialized on state
    provider = JWKSProvider(
        jwks_url=settings.supabase_jwks_url,
        cache_ttl_seconds=settings.SUPABASE_JWKS_CACHE_TTL_SECONDS,
        timeout_seconds=settings.SUPABASE_JWKS_TIMEOUT_SECONDS,
    )
    request.app.state.jwks_provider = provider
    return provider


def get_jwt_verifier(
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseJWTVerifier:
    """Instantiate a SupabaseJWTVerifier configured with server-authoritative issuer and audience."""
    if not settings.supabase_issuer:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured (SUPABASE_URL is missing).",
            headers={"Retry-After": "30"},
        )

    return SupabaseJWTVerifier(
        expected_issuer=settings.supabase_issuer,
        expected_audience=settings.supabase_expected_audience,
    )


async def get_current_user(
    authorization: Annotated[str | None, Header(description="Bearer authentication token")] = None,
    jwks_provider: Annotated[JWKSProvider, Depends(get_jwks_provider)] = None,
    jwt_verifier: Annotated[SupabaseJWTVerifier, Depends(get_jwt_verifier)] = None,
) -> AuthenticatedUser:
    """Validate incoming Supabase bearer access token and return the verified user identity."""
    # 1. Require Authorization header
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Enforce Bearer authentication scheme
    parts = authorization.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        logger.warning("Rejected non-Bearer or malformed Authorization header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Bearer authentication required.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )

    token = parts[1].strip()

    # 3. Cryptographically verify token and claims
    try:
        user = await jwt_verifier.verify_token(token=token, jwks_provider=jwks_provider)
        return user
    except AuthServiceNotConfiguredError as exc:
        logger.error("Authentication attempted but auth service is not configured: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured.",
            headers={"Retry-After": "30"},
        ) from exc
    except JWKSFetchError as exc:
        logger.error("JWKS infrastructure failure during authentication: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication authority is temporarily unavailable. Please retry.",
            headers={"Retry-After": "10"},
        ) from exc
    except JWTVerificationError as exc:
        logger.info("Authentication rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error during authentication verification: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication validation failed.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from exc

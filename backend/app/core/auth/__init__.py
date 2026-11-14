"""Supabase authentication and asymmetric JWT / JWKS verification module."""

from app.core.auth.models import AuthenticatedUser
from app.core.auth.exceptions import (
    AuthError,
    AuthServiceNotConfiguredError,
    ExpiredTokenError,
    InvalidAlgorithmError,
    InvalidClaimError,
    InvalidTokenError,
    JWKSFetchError,
    JWKSInvalidKeyError,
    JWKSKeyNotFoundError,
    JWTVerificationError,
)
from app.core.auth.jwks import JWKSProvider
from app.core.auth.verifier import SupabaseJWTVerifier
from app.core.auth.dependencies import get_current_user

__all__ = [
    "AuthenticatedUser",
    "AuthError",
    "AuthServiceNotConfiguredError",
    "ExpiredTokenError",
    "InvalidAlgorithmError",
    "InvalidClaimError",
    "InvalidTokenError",
    "JWKSFetchError",
    "JWKSInvalidKeyError",
    "JWKSKeyNotFoundError",
    "JWTVerificationError",
    "JWKSProvider",
    "SupabaseJWTVerifier",
    "get_current_user",
]


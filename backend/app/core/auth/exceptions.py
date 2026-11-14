"""Authentication exceptions representing verification failures and infrastructure errors."""


class AuthError(Exception):
    """Base exception for all authentication-related failures."""


class AuthServiceNotConfiguredError(AuthError):
    """Raised when authentication service (SUPABASE_URL) is not configured."""


class JWKSFetchError(AuthError):
    """Raised when the JWKS provider fails to retrieve or parse the key set from Supabase."""


class JWKSKeyNotFoundError(AuthError):
    """Raised when the token's key identifier (kid) cannot be found in the JWKS."""


class JWKSInvalidKeyError(AuthError):
    """Raised when a JWK entry is malformed, uses an unsupported algorithm, or contains private keys."""


class JWTVerificationError(AuthError):
    """Base exception for cryptographic or semantic JWT claim verification failures."""


class InvalidTokenError(JWTVerificationError):
    """Raised when a token is structurally malformed or fails signature verification."""


class ExpiredTokenError(JWTVerificationError):
    """Raised when a token's exp claim indicates the token has expired."""


class InvalidAlgorithmError(JWTVerificationError):
    """Raised when a token uses an unapproved algorithm (e.g. HS256, none)."""


class InvalidClaimError(JWTVerificationError):
    """Raised when token claims violate required semantics (wrong issuer, audience, role, subject)."""


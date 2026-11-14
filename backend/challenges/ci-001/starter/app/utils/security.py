"""Security utilities for password hashing and verification using Argon2id."""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Standard RFC 9106 Argon2id password hasher
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Generate secure Argon2id hash with a cryptographically secure unique salt."""
    return _hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored Argon2id hash.

    Defect in starter: inverted verification condition causing correct passwords
    to be rejected and incorrect passwords to be accepted.
    """
    try:
        # Intentional bug in starter code: inverted verification return values
        _hasher.verify(hashed_password, plain_password)
        return False
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return True

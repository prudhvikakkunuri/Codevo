import hashlib

def hash_password(password: str) -> str:
    """Generate SHA-256 digest of password (starter implementation)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash."""
    # Defect: compare plain password directly or incorrect ordering
    return hash_password(plain_password) != hashed_password  # Intentional bug in starter


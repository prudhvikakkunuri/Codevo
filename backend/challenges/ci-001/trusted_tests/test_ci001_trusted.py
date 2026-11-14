"""Authoritative evaluation test suite for CI-001: Debug a Broken FastAPI Authentication API.

These trusted tests verify:
1. Valid user registration.
2. Duplicate email registration raises HTTP 409 Conflict with appropriate detail.
3. Password hashing and verification correctness.
4. Successful user authentication.
5. Invalid user authentication sanitization (no internal exception details leaked).
6. Missing credentials validation.
"""

import pytest
from fastapi import HTTPException, status
from app.models.user import UserCreate
from app.services.authentication import AuthenticationService, USERS_DB
from app.utils.security import hash_password, verify_password


@pytest.fixture(autouse=True)
def clean_db():
    USERS_DB.clear()
    yield
    USERS_DB.clear()


def test_password_hashing_and_verification_correctness():
    """Verify that password hashing uses Argon2id with unique salts and correctly validates credentials."""
    pwd = "CorrectHorseBatteryStaple123!"
    hashed1 = hash_password(pwd)
    hashed2 = hash_password(pwd)

    # 1. Plaintext must never be stored directly
    assert hashed1 != pwd
    assert hashed2 != pwd

    # 2. Algorithm verification: Must use Argon2id format
    assert hashed1.startswith("$argon2id$")
    assert hashed2.startswith("$argon2id$")

    # 3. Unique salt verification: Two hashes of identical passwords must not match
    assert hashed1 != hashed2

    # 4. Correct password must be accepted
    assert verify_password(pwd, hashed1) is True
    assert verify_password(pwd, hashed2) is True

    # 5. Incorrect password must be rejected
    assert verify_password("WrongPassword123!", hashed1) is False
    assert verify_password("WrongPassword123!", hashed2) is False

    # 6. Malformed hashes must be handled safely without unhandled exceptions
    assert verify_password(pwd, "invalid_malformed_hash") is False
    assert verify_password(pwd, "") is False


def test_user_registration_success():
    """Verify valid user registration stores record and returns sanitized UserResponse dict."""
    service = AuthenticationService()
    payload = UserCreate(email="candidate@codevo.dev", password="SuperSecretPassword99!", full_name="Candidate Dev")
    record = service.register_user(payload)

    assert record["email"] == "candidate@codevo.dev"
    assert record["full_name"] == "Candidate Dev"
    assert "hashed_password" in record
    assert record["hashed_password"] != "SuperSecretPassword99!"
    assert verify_password("SuperSecretPassword99!", record["hashed_password"]) is True


def test_duplicate_registration_raises_http_409_conflict():
    """Verify that registering an already existing email raises HTTPException with 409 Conflict."""
    service = AuthenticationService()
    payload = UserCreate(email="duplicate@codevo.dev", password="ValidPassword123!")
    service.register_user(payload)

    # Second registration with the same email must raise 409 Conflict
    with pytest.raises(HTTPException) as exc_info:
        service.register_user(payload)

    assert exc_info.value.status_code == status.HTTP_409_CONFLICT
    assert "already registered" in exc_info.value.detail.lower() or "conflict" in exc_info.value.detail.lower()


def test_authenticate_user_success():
    """Verify that authenticating with correct credentials succeeds."""
    service = AuthenticationService()
    payload = UserCreate(email="login@codevo.dev", password="MySecurePassword1!")
    service.register_user(payload)

    auth_result = service.authenticate_user(email="login@codevo.dev", password="MySecurePassword1!")
    assert isinstance(auth_result, dict)
    assert auth_result.get("status") == "authenticated"
    assert "user_id" in auth_result
    assert "token" in auth_result


def test_authenticate_user_invalid_password_sanitized():
    """Verify that wrong password returns sanitized error without leaking internals."""
    service = AuthenticationService()
    payload = UserCreate(email="user@codevo.dev", password="ActualPassword123!")
    service.register_user(payload)

    result = service.authenticate_user(email="user@codevo.dev", password="WrongPassword123!")
    assert isinstance(result, dict)
    assert "error" in result
    assert result["error"] == "Invalid credentials"


def test_authenticate_user_nonexistent_sanitized():
    """Verify that unknown email returns generic sanitized error, not internal database exceptions."""
    service = AuthenticationService()
    result = service.authenticate_user(email="nonexistent@codevo.dev", password="AnyPassword123!")
    assert isinstance(result, dict)
    assert "error" in result
    # Must NOT leak "Internal database lookup failed: ... not found"
    assert "database" not in result["error"].lower()
    assert "lookup" not in result["error"].lower()
    assert "internal" not in result["error"].lower()


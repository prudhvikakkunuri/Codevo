"""
Candidate Task (CI-001):
Investigate failed password hashing verification, fix duplicate user registration
handling, and sanitize error responses.
"""
from typing import Dict, Optional
import uuid
from datetime import datetime
from app.models.user import UserCreate
from app.utils.security import hash_password, verify_password

# In-memory demo datastore for auth service tests
USERS_DB: Dict[str, dict] = {}

class AuthenticationService:
    def register_user(self, payload: UserCreate) -> dict:
        # BUG 1: Duplicate registration is not handled gracefully.
        # Fails with generic KeyError or unhandled exception instead of 409 Conflict.
        user_id = str(uuid.uuid4())
        hashed_pw = hash_password(payload.password)

        user_record = {
            "id": user_id,
            "email": payload.email,
            "full_name": payload.full_name,
            "hashed_password": hashed_pw,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }

        # Defect: Overwrites existing user or fails to validate uniqueness
        USERS_DB[payload.email] = user_record
        return user_record

    def authenticate_user(self, email: Optional[str], password: Optional[str]) -> dict:
        # BUG 2: Incorrect hash verification comparison and credential verification
        if not email or not password:
            return {"error": "Missing credentials"}

        user = USERS_DB.get(email)
        if not user:
            # BUG 3: Leaking internal exception structure or inaccurate timing state
            return {"error": f"Internal database lookup failed: {email} not found"}

        # Defect in verify_password argument ordering or algorithm check
        is_valid = verify_password(password, user["hashed_password"])
        if not is_valid:
            return {"error": "Invalid credentials"}

        return {"status": "authenticated", "user_id": user["id"], "token": "mock-jwt-token"}


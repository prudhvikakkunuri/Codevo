export const DEMO_SESSION_ID = "ci-001-demo";

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  path: string;
  children: (WorkspaceFolder | WorkspaceFile)[];
}

export type WorkspaceNode = WorkspaceFolder | WorkspaceFile;

export function isFolder(node: WorkspaceNode): node is WorkspaceFolder {
  return "children" in node;
}

export const INITIAL_WORKSPACE_FILES: Record<string, WorkspaceFile> = {
  "app/__init__.py": {
    id: "file-app-init",
    name: "__init__.py",
    path: "app/__init__.py",
    language: "python",
    content: `"""Authentication Service Package Initialization."""
__version__ = "0.1.0"
`,
  },
  "app/main.py": {
    id: "file-app-main",
    name: "main.py",
    path: "app/main.py",
    language: "python",
    content: `from fastapi import FastAPI
from app.routes.auth import router as auth_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Codevo Auth Service",
    description="FastAPI authentication and token issuance service",
    version="0.1.0",
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}
`,
  },
  "app/config.py": {
    id: "file-app-config",
    name: "config.py",
    path: "app/config.py",
    language: "python",
    content: `import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "test")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "codevo-insecure-test-secret-key-32b")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

def get_settings() -> Settings:
    return Settings()
`,
  },
  "app/models/user.py": {
    id: "file-app-models-user",
    name: "user.py",
    path: "app/models/user.py",
    language: "python",
    content: `from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True
`,
  },
  "app/routes/auth.py": {
    id: "file-app-routes-auth",
    name: "auth.py",
    path: "app/routes/auth.py",
    language: "python",
    content: `from fastapi import APIRouter, HTTPException, status
from app.models.user import UserCreate, UserResponse
from app.services.authentication import AuthenticationService

router = APIRouter()
auth_service = AuthenticationService()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    # Registration endpoint
    return auth_service.register_user(payload)

@router.post("/login")
async def login(credentials: dict):
    # Login verification endpoint
    return auth_service.authenticate_user(
        email=credentials.get("email"),
        password=credentials.get("password")
    )
`,
  },
  "app/services/authentication.py": {
    id: "file-app-services-auth",
    name: "authentication.py",
    path: "app/services/authentication.py",
    language: "python",
    content: `"""
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
`,
  },
  "app/utils/security.py": {
    id: "file-app-utils-security",
    name: "security.py",
    path: "app/utils/security.py",
    language: "python",
    content: `import hashlib

def hash_password(password: str) -> str:
    """Generate SHA-256 digest of password (starter implementation)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored hash."""
    return hash_password(plain_password) == hashed_password
`,
  },
  "tests/test_auth.py": {
    id: "file-tests-auth",
    name: "test_auth.py",
    path: "tests/test_auth.py",
    language: "python",
    content: `import pytest
from app.models.user import UserCreate
from app.services.authentication import AuthenticationService, USERS_DB

@pytest.fixture(autouse=True)
def clean_db():
    USERS_DB.clear()
    yield

def test_register_new_user():
    service = AuthenticationService()
    payload = UserCreate(email="engineer@codevo.dev", password="SecurePassword123")
    user = service.register_user(payload)
    assert user["email"] == "engineer@codevo.dev"
    assert "hashed_password" in user
`,
  },
  "tests/test_users.py": {
    id: "file-tests-users",
    name: "test_users.py",
    path: "tests/test_users.py",
    language: "python",
    content: `from app.models.user import UserCreate

def test_user_create_validation():
    user = UserCreate(email="valid@codevo.dev", password="SuperPassword456")
    assert user.email == "valid@codevo.dev"
`,
  },
  "requirements.txt": {
    id: "file-requirements",
    name: "requirements.txt",
    path: "requirements.txt",
    language: "plaintext",
    content: `fastapi>=0.110.0
pydantic>=2.6.0
pytest>=8.0.0
`,
  },
  "README.md": {
    id: "file-readme",
    name: "README.md",
    path: "README.md",
    language: "markdown",
    content: `# Authentication Service (CI-001)

## Overview
This service handles candidate registration and user credential verification.

## Instructions
1. Inspect the implementation in \`app/services/authentication.py\`.
2. Fix registration duplicate email verification.
3. Ensure password verification handles edge cases.
4. Run \`pytest\` in the terminal to verify the test suite.
`,
  },
};

export const WORKSPACE_FILE_TREE: WorkspaceFolder = {
  id: "folder-root",
  name: "auth-service",
  path: "",
  children: [
    {
      id: "folder-app",
      name: "app",
      path: "app",
      children: [
        INITIAL_WORKSPACE_FILES["app/__init__.py"],
        INITIAL_WORKSPACE_FILES["app/main.py"],
        INITIAL_WORKSPACE_FILES["app/config.py"],
        {
          id: "folder-models",
          name: "models",
          path: "app/models",
          children: [INITIAL_WORKSPACE_FILES["app/models/user.py"]],
        },
        {
          id: "folder-routes",
          name: "routes",
          path: "app/routes",
          children: [INITIAL_WORKSPACE_FILES["app/routes/auth.py"]],
        },
        {
          id: "folder-services",
          name: "services",
          path: "app/services",
          children: [INITIAL_WORKSPACE_FILES["app/services/authentication.py"]],
        },
        {
          id: "folder-utils",
          name: "utils",
          path: "app/utils",
          children: [INITIAL_WORKSPACE_FILES["app/utils/security.py"]],
        },
      ],
    },
    {
      id: "folder-tests",
      name: "tests",
      path: "tests",
      children: [
        INITIAL_WORKSPACE_FILES["tests/test_auth.py"],
        INITIAL_WORKSPACE_FILES["tests/test_users.py"],
      ],
    },
    INITIAL_WORKSPACE_FILES["requirements.txt"],
    INITIAL_WORKSPACE_FILES["README.md"],
  ],
};


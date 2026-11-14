"""Data models representing authenticated identity and authorization context."""

import uuid
from typing import Any
from pydantic import BaseModel, Field


class AuthenticatedUser(BaseModel):
    """Verified user identity derived strictly from validated Supabase JWT claims."""

    id: uuid.UUID = Field(
        description="Authoritative unique user identifier from token subject (sub)."
    )
    role: str = Field(
        description="Verified authorization role (must equal 'authenticated')."
    )
    email: str | None = Field(
        default=None,
        description="Optional verified user email address from token claims.",
    )
    app_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Application-specific metadata asserted by Supabase Auth.",
    )
    user_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Candidate user-facing metadata asserted by Supabase Auth.",
    )


class AuthMeResponse(BaseModel):
    """Minimal, secure response schema for the GET /api/v1/auth/me demonstration endpoint."""

    id: str = Field(description="Canonical user ID UUID string.")
    role: str = Field(description="Active verified role.")


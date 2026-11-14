"""Authentication demonstration and candidate identity routes."""

from fastapi import APIRouter, Depends, status

from app.core.auth.dependencies import get_current_user
from app.core.auth.models import AuthenticatedUser, AuthMeResponse

router = APIRouter()


@router.get(
    "/me",
    response_model=AuthMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Authenticated Candidate Identity",
    description="Returns the verified Supabase candidate identity extracted from a cryptographically verified JWT.",
)
async def get_current_candidate(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthMeResponse:
    """Return the verified user identity without exposing tokens or internal claims."""
    return AuthMeResponse(
        id=str(user.id),
        role=user.role,
    )


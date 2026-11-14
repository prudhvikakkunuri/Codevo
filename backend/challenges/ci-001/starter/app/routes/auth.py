from fastapi import APIRouter, HTTPException, status
from app.models.user import UserCreate, UserResponse
from app.services.authentication import AuthenticationService

router = APIRouter()
auth_service = AuthenticationService()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    return auth_service.register_user(payload)

@router.post("/login")
async def login(credentials: dict):
    return auth_service.authenticate_user(
        email=credentials.get("email"),
        password=credentials.get("password")
    )


from fastapi import FastAPI
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


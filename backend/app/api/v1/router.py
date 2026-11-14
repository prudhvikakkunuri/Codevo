"""Aggregated API version 1 router."""

from fastapi import APIRouter
from app.api.v1.routes import agent_workspace, auth, health

api_router = APIRouter()

# Mount health and probe endpoints
api_router.include_router(health.router, prefix="/health", tags=["health"])

# Mount authentication endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Mount demo agent and workspace endpoints
api_router.include_router(agent_workspace.router, tags=["agent-workspace"])


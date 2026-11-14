"""Health and readiness check endpoints for process monitoring and orchestration."""

from typing import Literal
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from app.core.config import Settings, get_settings

router = APIRouter()


class LivenessResponse(BaseModel):
    """Payload schema for process liveness probe."""

    status: Literal["healthy"] = Field(
        default="healthy", description="Indicates the FastAPI application process is alive."
    )
    service: str = Field(
        default="codevo-backend", description="Canonical service identifier."
    )
    version: str = Field(description="Running application version.")
    environment: str = Field(description="Active execution environment.")


class ReadinessResponse(BaseModel):
    """Payload schema for application readiness probe."""

    status: Literal["ready", "not_ready"] = Field(
        default="ready", description="Indicates whether the application is ready to accept traffic."
    )
    service: str = Field(
        default="codevo-backend", description="Canonical service identifier."
    )
    version: str = Field(description="Running application version.")
    environment: str = Field(description="Active execution environment.")
    components: dict[str, str] = Field(
        description="Individual status of implemented internal application components."
    )


@router.get(
    "/live",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Process Liveness Probe",
    description="Returns 200 OK as long as the FastAPI process is running and responding.",
)
async def check_liveness(
    settings: Settings = Depends(get_settings),
) -> LivenessResponse:
    """Evaluate process liveness."""
    return LivenessResponse(
        status="healthy",
        service="codevo-backend",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Readiness Probe",
    description=(
        "Returns 200 OK when application initialization and configuration validation are complete. "
        "Does not claim external databases or third-party services are healthy prior to their implementation."
    ),
)
async def check_readiness(
    settings: Settings = Depends(get_settings),
) -> ReadinessResponse:
    """Evaluate application readiness based strictly on verified implemented components."""
    # Increment A verifies configuration and API routing readiness.
    # Future increments will attach database connection pool and JWKS cache checks here.
    components_status = {
        "configuration": "ready",
        "api_router": "ready",
    }

    return ReadinessResponse(
        status="ready",
        service="codevo-backend",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        components=components_status,
    )


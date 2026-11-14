"""FastAPI application factory and server entrypoint."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.auth.jwks import JWKSProvider
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown lifecycles."""
    settings = app.state.settings
    setup_logging(environment=settings.ENVIRONMENT)
    logger.info(
        "Starting %s [version=%s, env=%s, origins=%d]",
        settings.PROJECT_NAME,
        settings.VERSION,
        settings.ENVIRONMENT,
        len(settings.ALLOWED_ORIGINS),
    )

    # Initialize shared JWKS provider if Supabase URL is configured
    if settings.SUPABASE_URL and settings.supabase_jwks_url:
        app.state.jwks_provider = JWKSProvider(
            jwks_url=settings.supabase_jwks_url,
            cache_ttl_seconds=settings.SUPABASE_JWKS_CACHE_TTL_SECONDS,
            timeout_seconds=settings.SUPABASE_JWKS_TIMEOUT_SECONDS,
        )
    else:
        app.state.jwks_provider = None

    yield

    # Clean up HTTP client and connection pool on shutdown
    if getattr(app.state, "jwks_provider", None) is not None:
        await app.state.jwks_provider.close()

    logger.info("Shutting down %s", settings.PROJECT_NAME)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure an instance of the FastAPI application."""
    if settings is None:
        settings = get_settings()

    # Disable interactive documentation in production to minimize attack surface
    docs_url = "/docs" if not settings.is_production() else None
    redoc_url = "/redoc" if not settings.is_production() else None
    openapi_url = "/openapi.json" if not settings.is_production() else None

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )

    # Attach settings to application state
    app.state.settings = settings

    # Configure secure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )

    # Register production-safe exception handlers
    register_error_handlers(app, is_production=settings.is_production())

    # Include versioned API routing
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Service root identity probe
    @app.get(
        "/",
        status_code=status.HTTP_200_OK,
        include_in_schema=False,
    )
    async def root_probe() -> dict[str, str]:
        """Root service identifier for process heartbeat checks."""
        return {
            "service": "codevo-backend",
            "status": "healthy",
            "version": settings.VERSION,
        }

    return app


# Default ASGI application instance for uvicorn
app = create_app()


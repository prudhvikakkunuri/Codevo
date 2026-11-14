"""Standardized error responses and production exception handlers."""

import logging
import uuid
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("codevo.errors")


def register_error_handlers(app: FastAPI, is_production: bool = False) -> None:
    """Register uniform, production-safe exception handlers on the FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle standard HTTP exceptions with structured JSON responses, preserving custom headers."""
        return JSONResponse(
            status_code=exc.status_code,
            headers=dict(exc.headers) if exc.headers else None,
            content={
                "error": {
                    "code": str(exc.status_code),
                    "message": exc.detail,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Sanitize validation errors and return structured 422 response."""
        errors: list[dict[str, Any]] = []
        for err in exc.errors():
            loc = " -> ".join(str(item) for item in err.get("loc", []))
            errors.append(
                {
                    "location": loc,
                    "message": err.get("msg", "Invalid value"),
                    "type": err.get("type", "value_error"),
                }
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "The request payload failed schema validation.",
                    "details": errors,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catch all unhandled exceptions, log with correlation ID, and protect internal details in production."""
        error_id = str(uuid.uuid4())

        # Production Exception Logging Decision:
        # exc_info is intentionally kept disabled in production (exc_info=not is_production).
        # Rationale: Standard Python stack traces dump frame locals, which frequently contain
        # candidate tokens, database connection strings, BYOK credentials, or request bodies.
        # Until dedicated log scrubbing middleware with automated credential redaction is implemented,
        # detailed tracebacks are withheld to strictly enforce the zero-secret-leakage invariant.
        # HTTP responses to clients always return a generic message with error_id regardless.
        logger.error(
            "Unhandled server exception [error_id=%s] on %s %s: %s",
            error_id,
            request.method,
            request.url.path,
            exc,
            exc_info=not is_production,
        )

        message = (
            "An unexpected internal server error occurred."
            if is_production
            else f"Internal error ({type(exc).__name__}): {str(exc) or 'No details'}"
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": message,
                    "error_id": error_id,
                }
            },
        )


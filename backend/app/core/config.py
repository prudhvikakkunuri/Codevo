"""Centralized application settings and environment validation."""

from functools import lru_cache
from typing import Any, Literal
from urllib.parse import urlparse
from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings backed by environment variables with fail-safe validation."""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # Core environment controls
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    DEBUG: bool = False
    PROJECT_NAME: str = "Codevo Backend API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server binding (defaults to 127.0.0.1 for safe local workstation development)
    # Containerized environments (Docker) can override this with HOST=0.0.0.0 via environment variables.
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # CORS configuration
    ALLOWED_ORIGINS: list[str] | str = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    # Service-to-Service authentication key (Next.js BFF <-> FastAPI)
    # Wrapped in SecretStr to prevent accidental leakage in repr, str, logs, dumps, or validation errors.
    INTERNAL_SERVICE_KEY: SecretStr | None = None

    # Supabase Authentication & JWKS verification
    SUPABASE_URL: str | None = None
    SUPABASE_JWKS_CACHE_TTL_SECONDS: int = 600
    SUPABASE_JWKS_TIMEOUT_SECONDS: float = 5.0

    # AI Provider configuration (Groq)
    GROQ_API_KEY: SecretStr | None = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    @field_validator("ALLOWED_ORIGINS", mode="after")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        """Convert comma-separated origin string into a clean list of URLs."""
        if isinstance(value, str):
            s = value.strip()
            if s.startswith("[") and s.endswith("]"):
                try:
                    import json
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        return [str(origin).strip().rstrip("/") for origin in parsed if origin]
                except Exception:
                    pass
            origins = [
                origin.strip().rstrip("/")
                for origin in s.split(",")
                if origin.strip()
            ]
            return origins
        if isinstance(value, list):
            return [str(origin).strip().rstrip("/") for origin in value if origin]
        return ["http://localhost:3000"]

    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def normalize_supabase_url(cls, value: Any) -> str | None:
        """Strip whitespace and trailing slashes from Supabase URL."""
        if value is None:
            return None
        s = str(value).strip().rstrip("/")
        return s if s else None

    @model_validator(mode="after")
    def validate_production_invariants(self) -> "Settings":
        """Enforce strict security constraints when running in production mode."""
        # Validate SUPABASE_URL structure and protocol whenever configured
        if self.SUPABASE_URL is not None:
            parsed = urlparse(self.SUPABASE_URL)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError(
                    f"Invalid SUPABASE_URL: '{self.SUPABASE_URL}'. Must be a fully-qualified URL."
                )

            is_loopback = parsed.hostname in {"localhost", "127.0.0.1", "0.0.0.0"}
            if not is_loopback and parsed.scheme != "https":
                raise ValueError(
                    f"Insecure SUPABASE_URL scheme '{parsed.scheme}://'. HTTPS is required for non-local environments."
                )

        if self.is_production():
            # 1. Debug mode strictly prohibited in production
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production environment.")

            # 2. Wildcard CORS strictly prohibited in production
            if any(origin == "*" for origin in self.ALLOWED_ORIGINS):
                raise ValueError(
                    "Wildcard origin ('*') is strictly forbidden in production CORS configuration."
                )

            # Retrieve raw secret value safely for validation check
            raw_key = (
                self.INTERNAL_SERVICE_KEY.get_secret_value()
                if self.INTERNAL_SERVICE_KEY is not None
                else ""
            )

            # 3. Secure internal service key required in production
            if not raw_key or len(raw_key.strip()) < 16:
                raise ValueError(
                    "A secure INTERNAL_SERVICE_KEY with at least 16 characters is required in production."
                )

            # 4. Prohibit development placeholder key in production
            if raw_key.lower().startswith("dev-"):
                raise ValueError(
                    "Development placeholder INTERNAL_SERVICE_KEY is strictly forbidden in production."
                )

            # 5. Supabase URL strictly required and must use HTTPS in production
            if not self.SUPABASE_URL:
                raise ValueError("SUPABASE_URL is required in production environment.")
            parsed_prod = urlparse(self.SUPABASE_URL)
            if parsed_prod.scheme != "https":
                raise ValueError("SUPABASE_URL must use HTTPS in production environment.")

        return self

    @property
    def supabase_issuer(self) -> str | None:
        """Derive the expected Supabase JWT issuer: {SUPABASE_URL}/auth/v1."""
        if not self.SUPABASE_URL:
            return None
        return f"{self.SUPABASE_URL}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str | None:
        """Derive the authoritative Supabase JWKS endpoint: {SUPABASE_URL}/auth/v1/.well-known/jwks.json."""
        if not self.SUPABASE_URL:
            return None
        return f"{self.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

    @property
    def supabase_expected_audience(self) -> str:
        """Expected JWT audience for Supabase authenticated users."""
        return "authenticated"

    def is_production(self) -> bool:
        """Return True if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"

    def is_development(self) -> bool:
        """Return True if running in development mode."""
        return self.ENVIRONMENT.lower() == "development"

    def is_test(self) -> bool:
        """Return True if running in test mode."""
        return self.ENVIRONMENT.lower() == "test"

    def __repr__(self) -> str:
        """Mask sensitive secrets in string representations to prevent accidental log leaks."""
        masked_service_key = (
            "**********" if self.INTERNAL_SERVICE_KEY is not None else "None"
        )
        return (
            f"Settings("
            f"ENVIRONMENT='{self.ENVIRONMENT}', "
            f"DEBUG={self.DEBUG}, "
            f"PROJECT_NAME='{self.PROJECT_NAME}', "
            f"HOST='{self.HOST}', "
            f"PORT={self.PORT}, "
            f"ALLOWED_ORIGINS={self.ALLOWED_ORIGINS}, "
            f"INTERNAL_SERVICE_KEY='{masked_service_key}', "
            f"SUPABASE_URL='{self.SUPABASE_URL}')"
        )

    def __str__(self) -> str:
        return self.__repr__()


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()


"""Tests for configuration settings and fail-safe production validators."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_default_settings_development() -> None:
    """Test default settings instantiation in development mode without local .env overrides."""
    settings = Settings(_env_file=None)
    assert settings.ENVIRONMENT == "development"
    assert settings.DEBUG is False
    assert settings.HOST == "127.0.0.1"
    assert settings.PORT == 8000
    assert "http://localhost:3000" in settings.ALLOWED_ORIGINS
    assert (
        settings.INTERNAL_SERVICE_KEY is None
        or settings.INTERNAL_SERVICE_KEY.get_secret_value().startswith("dev-")
    )


def test_custom_allowed_origins() -> None:
    """Test custom origins parsing."""
    settings = Settings(
        ALLOWED_ORIGINS=["http://app.example.com", "http://codevo.local:3000"]
    )
    assert "http://app.example.com" in settings.ALLOWED_ORIGINS
    assert "http://codevo.local:3000" in settings.ALLOWED_ORIGINS


def test_custom_host_configuration() -> None:
    """Test custom HOST configuration for containerized deployment (e.g., 0.0.0.0)."""
    settings = Settings(HOST="0.0.0.0")
    assert settings.HOST == "0.0.0.0"


def test_production_fails_if_debug_true() -> None:
    """Production validation fails if DEBUG=True."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            INTERNAL_SERVICE_KEY="production-secret-key-at-least-16-chars",
            ALLOWED_ORIGINS=["https://codevo.dev"],
        )
    assert "DEBUG must be False in production" in str(exc_info.value)


def test_production_fails_if_wildcard_cors() -> None:
    """Production validation fails if ALLOWED_ORIGINS contains wildcard '*'."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY="production-secret-key-at-least-16-chars",
            ALLOWED_ORIGINS=["*"],
        )
    assert "Wildcard origin ('*') is strictly forbidden" in str(exc_info.value)


def test_production_fails_if_dev_internal_key() -> None:
    """Production validation fails if default dev INTERNAL_SERVICE_KEY is used."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY="dev-internal-service-key-change-me",
            ALLOWED_ORIGINS=["https://codevo.dev"],
        )
    assert "Development placeholder INTERNAL_SERVICE_KEY is strictly forbidden" in str(exc_info.value)


def test_production_fails_if_short_internal_key() -> None:
    """Production validation fails if INTERNAL_SERVICE_KEY is less than 16 characters."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY="too-short",
            ALLOWED_ORIGINS=["https://codevo.dev"],
        )
    assert "at least 16 characters" in str(exc_info.value)


def test_production_fails_if_missing_internal_key() -> None:
    """Production validation fails if INTERNAL_SERVICE_KEY is missing or None."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY=None,
            ALLOWED_ORIGINS=["https://codevo.dev"],
        )
    assert "at least 16 characters is required in production" in str(exc_info.value)


def test_production_succeeds_with_valid_config() -> None:
    """Production validation succeeds with strict production settings."""
    raw_key = "prod-sec-key-7f9a1b2c3d4e5f6a7b8c9d0e"
    settings = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        INTERNAL_SERVICE_KEY=raw_key,
        ALLOWED_ORIGINS=["https://codevo.dev", "https://app.codevo.dev"],
        SUPABASE_URL="https://prod-project.supabase.co",
    )
    assert settings.ENVIRONMENT == "production"
    assert settings.DEBUG is False
    assert len(settings.ALLOWED_ORIGINS) == 2
    assert settings.INTERNAL_SERVICE_KEY is not None
    assert settings.INTERNAL_SERVICE_KEY.get_secret_value() == raw_key
    assert settings.SUPABASE_URL == "https://prod-project.supabase.co"
    assert settings.supabase_issuer == "https://prod-project.supabase.co/auth/v1"
    assert settings.supabase_jwks_url == "https://prod-project.supabase.co/auth/v1/.well-known/jwks.json"
    assert settings.supabase_expected_audience == "authenticated"


def test_production_fails_if_missing_supabase_url() -> None:
    """Production validation fails if SUPABASE_URL is not set."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY="prod-sec-key-7f9a1b2c3d4e5f6a7b8c9d0e",
            ALLOWED_ORIGINS=["https://codevo.dev"],
            SUPABASE_URL=None,
        )
    assert "SUPABASE_URL is required in production" in str(exc_info.value)


def test_production_fails_if_insecure_supabase_url() -> None:
    """Production validation fails if SUPABASE_URL does not use HTTPS."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY="prod-sec-key-7f9a1b2c3d4e5f6a7b8c9d0e",
            ALLOWED_ORIGINS=["https://codevo.dev"],
            SUPABASE_URL="http://insecure-supabase.example.com",
        )
    assert "HTTPS is required" in str(exc_info.value)


def test_development_allows_loopback_http_supabase_url() -> None:
    """Development permits HTTP scheme only for loopback addresses (localhost/127.0.0.1)."""
    settings = Settings(
        ENVIRONMENT="development",
        SUPABASE_URL="http://localhost:54321",
    )
    assert settings.SUPABASE_URL == "http://localhost:54321"
    assert settings.supabase_issuer == "http://localhost:54321/auth/v1"
    assert settings.supabase_jwks_url == "http://localhost:54321/auth/v1/.well-known/jwks.json"


def test_development_rejects_insecure_remote_supabase_url() -> None:
    """Development rejects non-HTTPS remote URLs to prevent credentials being sent over cleartext."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="development",
            SUPABASE_URL="http://remote-supabase.example.com",
        )
    assert "HTTPS is required for non-local environments" in str(exc_info.value)


def test_secret_masking_in_repr_and_str() -> None:
    """Test that repr() and str() mask sensitive keys to prevent logging leaks."""
    sensitive_secret = "super-secret-internal-key-value-999"
    settings = Settings(
        INTERNAL_SERVICE_KEY=sensitive_secret,
    )
    repr_output = repr(settings)
    str_output = str(settings)

    assert sensitive_secret not in repr_output
    assert sensitive_secret not in str_output
    assert "**********" in repr_output
    assert "**********" in str_output


def test_secret_masking_in_model_dump() -> None:
    """Test that model_dump and serialization mask the secret key."""
    sensitive_secret = "super-secret-internal-key-value-999"
    settings = Settings(
        INTERNAL_SERVICE_KEY=sensitive_secret,
    )
    dump_dict = settings.model_dump()
    dump_json = settings.model_dump_json()

    # In model_dump, SecretStr instance does not stringify to plaintext
    assert str(dump_dict["INTERNAL_SERVICE_KEY"]) != sensitive_secret
    assert sensitive_secret not in dump_json
    assert "**********" in dump_json


def test_validation_error_does_not_leak_raw_secret() -> None:
    """Test that validation error representations do not leak the supplied key."""
    supplied_key = "dev-secret-leak-test-token-77777"
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            INTERNAL_SERVICE_KEY=supplied_key,
            ALLOWED_ORIGINS=["https://codevo.dev"],
        )
    # The custom validator message asserts failure without echoing the supplied_key
    error_str = str(exc_info.value)
    assert "Development placeholder INTERNAL_SERVICE_KEY is strictly forbidden" in error_str
    # With SecretStr, input_value in Pydantic is a SecretStr which displays as '**********'
    assert supplied_key not in error_str

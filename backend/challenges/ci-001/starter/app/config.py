import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_env: str = os.getenv("APP_ENV", "test")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "codevo-insecure-test-secret-key-32b")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

def get_settings() -> Settings:
    return Settings()


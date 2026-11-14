import pytest
from app.models.user import UserCreate
from app.services.authentication import AuthenticationService, USERS_DB

@pytest.fixture(autouse=True)
def clean_db():
    USERS_DB.clear()
    yield

def test_register_new_user():
    service = AuthenticationService()
    payload = UserCreate(email="engineer@codevo.dev", password="SecurePassword123")
    user = service.register_user(payload)
    assert user["email"] == "engineer@codevo.dev"
    assert "hashed_password" in user


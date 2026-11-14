from app.models.user import UserCreate

def test_user_create_validation():
    user = UserCreate(email="valid@codevo.dev", password="SuperPassword456")
    assert user.email == "valid@codevo.dev"


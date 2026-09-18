from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_password_hashing():
    password = "secretpassword123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_jwt_token_lifecycle():
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    assert "exp" in payload

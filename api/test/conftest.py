import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user

# Mock user for testing
def override_get_current_user():
    return {
        "id": 1,
        "m365_oid": "test-admin-oid",
        "name": "Test Admin",
        "email": "admin@test.com",
        "role": "ADMIN",
        "active": True
    }

@pytest.fixture
def test_client():
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as client:
        yield client

    # Clean up
    app.dependency_overrides.clear()
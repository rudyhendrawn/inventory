def test_create_user(test_client):
    user_data = {
        "m365_oid": "new-user-oid-389",
        "name": "New user",
        "email": "newuser@test.com",
        "role": "STAFF",
        "active": 1
    }

    response = test_client.post("/users/", json=user_data)

    assert response.status_code == 200
    data = response.json()
    assert data['email'] == "newuser@test.com"
    assert data['role'] == "STAFF"
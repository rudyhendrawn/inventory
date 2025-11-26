import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core.security.password import hash_password
from db.pool import init_pool, execute, fetch_one
from datetime import datetime, timezone

def create_admin_user(username: str, password: str, name: str, email: str):
    init_pool()

    hashed_password = hash_password(password)
    created_at = datetime.now(timezone.utc)

    existing = fetch_one("SELECT id, username FROM users WHERE username = %s OR email = %s", (username, email))

    if existing:
        print(f"User with username '{username}' or email '{email}' already exists.")
        return
    
    password_hash = hash_password(password)

    query = """
    INSERT INTO users (username, password_hash, name, email, role, active, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    try:
        result = execute(query, (username, password_hash, name, email, 'ADMIN', 1, created_at))

        if result:
            created_user = fetch_one("SELECT id, username, name, email, role, active, created_at FROM users WHERE username = %s", (username,))

            if created_user:
                print("Admin user created successfully:")
                print(f"    ID: {created_user['id']}")
                print(f"    Username: {created_user['username']}")
                print(f"    Name: {created_user['name']}")
                print(f"    Email: {created_user['email']}")
                print(f"    Role: {created_user['role']}")
                return True
            else:
                print("User created but could not retrieve user details.")
                return False
    except Exception as e:
        print(f"An error occurred while creating the admin user: {e}")
        return False
    
if __name__ == "__main__":
    print(f"Creating admin user...")

    admin_data = {
        "username": "admin",
        "password": "adminpass",
        "name": "Administrator",
        "email": "admin@example.com"
    }
    
    print(f"Admin user: {admin_data['username']}")
    print(f"Email: {admin_data['email']}")

    success = create_admin_user(**admin_data)

    if success:
        print("Admin user creation completed successfully.")
        print(f"Username: {admin_data['username']}")
        print(f"Password: {admin_data['password']}")
    
    sys.exit(0 if success else 1)
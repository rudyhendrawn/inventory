import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from core.security.password import hash_password
from db.pool import init_pool, execute, fetch_one
from datetime import datetime, timezone

def create_admin_user(email: str, password: str, name: str):
    init_pool()

    password_hash = hash_password(password)
    created_at = datetime.now(timezone.utc)

    existing = fetch_one("SELECT id, email FROM users WHERE email = %s", (email,))

    if existing:
        print(f"User with email '{email}' already exists.")
        return
    
    query = """
    INSERT INTO users (email, password_hash, name, role, active, created_at)
    VALUES (%s, %s, %s, %s, %s, %s)
    """

    try:
        result = execute(query, (email, password_hash, name, 'ADMIN', 1, created_at))

        if result:
            created_user = fetch_one("SELECT id, name, email, role, active, created_at FROM users WHERE email = %s", (email,))

            if created_user:
                print("Admin user created successfully:")
                print(f"    ID: {created_user['id']}")
                print(f"    Email: {created_user['email']}")
                print(f"    Name: {created_user['name']}")
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
        "email": "it.security@example.com",
        "password": "adminpass",
        "name": "Administrator",
    }
    
    print(f"Admin user: {admin_data['email']}")
    print(f"Email: {admin_data['email']}")

    success = create_admin_user(**admin_data)

    if success:
        print("Admin user creation completed successfully.")
        print(f"Email: {admin_data['email']}")
        print(f"Password: {admin_data['password']}")
    
    sys.exit(0 if success else 1)
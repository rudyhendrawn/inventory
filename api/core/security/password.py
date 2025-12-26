import bcrypt

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""

    # Convert password to bytes and ensure it's not longer than 72 bytes
    password_bytes = password.encode('utf-8')

    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    # generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    password_bytes = plain_password.encode('utf-8')

    # truncate if necessary
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    hashed_bytes = hashed_password.encode('utf-8')

    return bcrypt.checkpw(password_bytes, hashed_bytes)
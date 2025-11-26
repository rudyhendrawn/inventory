from datetime import datetime, timedelta
from jose import jwt, JWTError
from core.config import settings
from typing import Optional, Dict

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data (Dict): The data to encode in the token.
        expires_delta (Optional[timedelta]): The time duration after which the token expires.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    return encoded_jwt

def verify_access_token(token: str) -> Dict:
    """
    Verify a JWT access token.

    Args:
        token (str): The JWT token to verify.

    Returns:
        Dict: The decoded token data if verification is successful.

    Raises:
        JWTError: If the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Token verification failed: {str(e)}")
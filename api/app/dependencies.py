from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security.oidc import OIDCVerifier
from domain.services.user_service import UserService
# from db.pool import fetch_one, execute


bearer = HTTPBearer(auto_error=False)

def get_current_user(credential: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credential or not credential.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")

    try:
        verifier = OIDCVerifier()
        claims = verifier.verify(token=credential.credentials)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or missing token: {str(e)}")
    
    # Upsert user into DB
    try:
        user_response = UserService.get_or_create_user(
            m365_oid=claims["oid"],
            name=claims["name", "unknown"],
            email=claims["email", "unknown@example.com"]
        )

        if not user_response.active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User inactive or not found")

        result = {
            "id": user_response.id,
            "m365_oid": user_response.m365_oid,
            "name": user_response.name,
            "email": user_response.email,
            "role": user_response.role,
            "active": user_response.active
        }

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve or create user: {str(e)}"
        )

def require_role(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return checker
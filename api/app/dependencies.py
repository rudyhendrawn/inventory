from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security.oidc import OIDCVerifier
from db.pool import fetch_one, execute


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
    user = fetch_one(
        "SELECT id, m365_oid, name, email, role, active FROM users WHERE m365oid = %s", (claims["oid"],),
    )

    if not user:
        execute(
            "INSERT INTO users (m365_oid, name, email, role, active) VALUES (%s, %s, %s, %s, %d)",
            (claims["oid"], claims["name"], claims["email"], 'STAFF', 1),
        )
        user = fetch_one(
            "SELECT id, m365_oid, name, email, role, active from users WHERE m365_oid = %s", (claims["oid"],),
        )

    if not user or not user["active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User inactive or not found")

    return user
    
def require_role(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return checker
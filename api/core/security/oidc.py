import time, requests
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError, JWTClaimsError
from core.config import settings

class OIDCVerifier:
    def __init__(self):
        self._jwks = None
        self._jwks_fetched_at = 0

    def _fetch_jwks(self) -> dict:
        response = requests.get(settings.OIDC_JWKS_URL, timeout=10)
        response.raise_for_status()
        return response.json()

    def _get_jwks(self) -> dict:
        now = time.time()
        if not self._jwks or (now - self._jwks_fetched_at) > 3600:
            self._jwks = self._fetch_jwks()
            self._jwks_fetched_at = now
        
        return self._jwks
    
    def verify(self, token: str) -> dict:
        jwks = self._get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = next((k for k in jwks["keys"] if k["kid"] == kid), None)

        if not key:
            # Refresh JWKS incase rotation happened
            self._jwks = None
            jwks = self._get_jwks()
            key = next((k for k in jwks["keys"] if k["kid"] == kid), None)

            if not key:
                raise JWTError("Public key not found in JWKS")

        try:
            payload = jwt.decode(
                token=token,
                key=key,
                algorithms=[unverified_header.get("alg", "RS256")],
                audience=settings.OIDC_AUDIENCE,
                issuer=settings.OIDC_ISSUER,
                options={"verify_at_hash": False}
            )
        except ExpiredSignatureError:
            raise
        except (JWTError, JWTClaimsError) as e:
            raise

        # Expect OID for mapping to user table
        oid = payload.get("oid") or payload.get("sub")
        email = payload.get("preffered_username") or payload.get("upn")
        name = payload.get("name")

        if not oid:
            raise JWTError("OID token missing oid/sub")
        
        return {"oid": oid, "email": email, "name": name, "claims": payload}
    
oidcVerifier = OIDCVerifier()
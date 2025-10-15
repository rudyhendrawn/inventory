from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/me")
def me(user=Depends(get_current_user)) -> dict:
    return {
        "id": user["id"],
        "m365_oid": user["m365_oid"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "active": user["active"],
    }
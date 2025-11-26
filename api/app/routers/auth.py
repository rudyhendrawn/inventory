from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from domain.services.user_service import UserService
from schemas.users import UserLogin, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin) -> TokenResponse:
    return UserService.authenticate_user(login_data)

@router.get("/me")
def me(user=Depends(get_current_user)) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "active": user["active"],
    }
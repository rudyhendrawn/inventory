# from fastapi import APIRouter, HTTPException, status
# from domain.services.user_service import UserService
# from schemas.users import UserCreate, UserResponse
# from core.config import settings

# # Only enable in development
# if settings.DEBUG:
#     router = APIRouter(prefix="/test", tags=["testing"])

#     @router.post("/register-user", response_model=UserResponse)
#     def test_register_user(user_data: UserCreate) -> UserResponse:
#         return UserService.create_user(user_data)

#     @router.post("/simulate-login")
#     def simulate_login(m365_oid: str, name: str = "Test User", email: str = "test@example"):
#         return UserService.get_or_create_user(m365_oid, name, email)

# else:
#     router = APIRouter()
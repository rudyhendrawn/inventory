from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from app.dependencies import get_current_user, require_role
from domain.services.user_service import UserService
from schemas.users import UserCreate, UserUpdate, UserResponse, UserListResponse, UserRole

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=UserListResponse)
def list_users(
    active_only: int = Query(1, description="Filter to only active users if set to 1"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    page_size: int = Query(10, ge=1, le=100, description="Number of users per page"),
    search: Optional[str] = Query(None, description="Search term to filter users by name or email"),
    current_user=Depends(get_current_user)
) -> UserListResponse:
    """
    Retrieve a paginated list of users with optional filtering by active status and search term.
    """
    response = UserService.get_all_users(
        active_only=active_only == 1,
        page=page,
        page_size=page_size,
        search=search
    )

    return response

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int = Path(..., description="The ID of the user to retrieve"),
    current_user=Depends(get_current_user)
) -> UserResponse:
    """
    Retrieve a single user by their ID.
    """
    response = UserService.get_user_by_id(user_id)

    return response

@router.post("/", response_model=UserResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
def create_user(
    user_data: UserCreate,
    current_user=Depends(require_role(UserRole.ADMIN))
) -> UserResponse:
    """
    Create a new user.
    """ 
    
    response = UserService.create_user(user_data)
    return response

@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
def update_user(
    user_data: UserUpdate,
    user_id: int = Path(..., description="The ID of the user to update"),
    current_user=Depends(require_role(UserRole.ADMIN))
) -> UserResponse:
    """
    Update an existing user.
    """
    response = UserService.update_user(user_id, user_data)

    return response

@router.delete("/{user_id}", dependencies=[Depends(require_role(UserRole.ADMIN))])
def delete_user(
    user_id: int = Path(..., description="The ID of the user to delete"),
    current_user=Depends(require_role(UserRole.ADMIN))
) -> None:
    """
    Delete a user.
    """
    UserService.delete_user(user_id)

    return None

# @router.patch("/{user_id}/deactivate", response_model=UserResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
def activate_user(
    user_id: int = Path(..., description="The ID of the user to activate"),
    activate: int = Query(1, description="Set to 1 to activate, 0 to deactivate"),
    current_user=Depends(require_role(UserRole.ADMIN))
) -> bool:
    """
    Activate or deactivate a user.
    """
    response = UserService.activate_user(user_id=user_id, activate=activate)

    return response

@router.patch("/{user_id}/activate", response_model=UserResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
def deactivate_user(
    user_id: int = Path(..., description="The ID of the user to activate"),
    deactivate: int = Query(0, description="Set to 0 to deactivate, 1 to activate"),
    current_user=Depends(require_role(UserRole.ADMIN))
) -> bool:
    """
    Deactivate a user.
    """
    response = UserService.deactivate_user(user_id=user_id, deactivate=deactivate)

    return response
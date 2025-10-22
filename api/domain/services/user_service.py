from typing import Optional, List
from fastapi import HTTPException, status
from db.repositories.user_repo import UserRepository
from schemas.users import UserCreate, UserUpdate, UserResponse, UserListResponse, UserRole

class UserService:
    
    @staticmethod
    def get_all_users(
        active_only: bool = True,
        page: int = 1,
        page_size: int = 10,
        search: Optional[str] = None
    ) -> UserListResponse:
        """
        Get paginated list of users with optional filtering by active status and search term.
        """
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page number must be greater than 0."
            )
        
        if page_size < 1 or page_size > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page size must be between 1 and 100."
            )
        
        offset = (page - 1) * page_size
        users_data = UserRepository.get_all(
            active_only=active_only,
            limit=page_size,
            offset=offset,
            search=search
        )

        total = UserRepository.count(active_only=active_only, search=search)
        users = [UserResponse(**user) for user in users_data]

        results = UserListResponse(
            users=users,
            total=total,
            page=page,
            page_size=page_size
        )

        return results
    
    @staticmethod
    def get_user_by_id(user_id: int) -> UserResponse:
        """
        Get a single user by their ID.
        """
        user_data = UserRepository.get_by_id(user_id)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        result = UserResponse(**user_data)

        return result

    @staticmethod
    def create_user(user_data: UserCreate) -> UserResponse:
        """
        Create a new user.
        """
        # Check for existing user with same email or m365_oid
        existing_user_by_email = UserRepository.exists_by_email(user_data.email)
        if existing_user_by_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email {user_data.email} already exists."
            )

        existing_user_by_oid = UserRepository.exists_by_oid(user_data.m365_oid)
        if existing_user_by_oid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with m365_oid {user_data.m365_oid} already exists."
            )
        
        try:
            created_user = UserRepository.create(user_data)
            if not created_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user."
                )
                
            result = UserResponse(**created_user)
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user: {str(e)}"
            )

    @staticmethod
    def update_user(user_id: int, user_data: UserUpdate) -> UserResponse:
        """
        Update an existing user.
        """
        existing_user = UserRepository.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        # Check email uniqueness if email is being updated
        if user_data.email and user_data.email != existing_user['email']:
            if UserRepository.exists_by_email(user_data.email, exclude_id=user_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"User with email {user_data.email} already exists."
                )
            
        try:
            updated_user = UserRepository.update(user_id, user_data)
            if not updated_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update user."
                )
            result = UserResponse(**updated_user)
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user: {str(e)}"
            )
        
    @staticmethod
    def delete_user(user_id: int) -> dict:
        """
        Soft delete a user by setting active to False.
        """
        existing_user = UserRepository.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        # Prevent deleting already inactive users
        if existing_user['active'] == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with ID {user_id} is already inactive."
            )
        
        try:
            success = UserRepository.delete(user_id)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete user."
                )
            
            response = {"message": f"User {existing_user['name']} has been deactivated."}
            
            return response
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete user: {str(e)}"
            )
        
    @staticmethod
    def get_or_create_user(m365_oid: str, name: str, email: str) -> UserResponse:
        """
        Get a user by m365_oid or create if not exists.
        """
        existing_user = UserRepository.get_by_oid(m365_oid)

        if existing_user:
            result = UserResponse(**existing_user)
            return result
        
        # Auto-create user with STAFF role
        user_data = UserCreate(
            m365_oid=m365_oid,
            name=name,
            email=email,
            role=UserRole.STAFF,
            active=1
        )

        try:
            created_user = UserRepository.create(user_data)
            if not created_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user."
                )
            
            result = UserResponse(**created_user)
            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to auto-create user: {str(e)}" 
            )
        
    @staticmethod
    def activate_user(user_id: int, activate: int) -> bool:
        """
        Activate a user by setting active to 1.
        """
        existing_user = UserRepository.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        try:
            activated_user = UserRepository.de_activate_user(user_id, active=activate)
            if not activated_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to activate user."
                )
            
            result = activated_user

            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to activate user: {str(e)}"
            )
        
    @staticmethod
    def deactivate_user(user_id: int, deactivate: int) -> bool:
        """
        Deactivate a user by setting active to 0.
        """
        existing_user = UserRepository.get_by_id(user_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        try:
            deactivated_user = UserRepository.de_activate_user(user_id, active=deactivate)
            if not deactivated_user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to deactivate user."
                )
            
            result = deactivated_user

            return result
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to deactivate user: {str(e)}"
            )
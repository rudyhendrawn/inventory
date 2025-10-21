from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    AUDITOR = "AUDITOR"

class User(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="The full name of the user")
    email: EmailStr = Field(..., description="The email address of the user")
    role: UserRole = Field(default=UserRole.STAFF, description="The role of the user within the system")
    active: bool = Field(default=True, description="Indicates if the user is active")

class UserCreate(User):
    m365_oid: str = Field(..., min_length=1, max_length=255, description="The Microsoft 365 Object ID of the user")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    active: Optional[bool] = None

class UserResponse(User):
    id: int
    m365_oid: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
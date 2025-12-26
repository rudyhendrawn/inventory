from typing import Optional
from pydantic import BaseModel, Field

class Category(BaseModel):
    id: int = Field(..., description="The unique identifier for the category")
    name: str = Field(..., description="The name of the category")

class CategoryCreate(BaseModel):
    name: str = Field(..., description="The name of the category to be created")

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, description="The updated name of the category")
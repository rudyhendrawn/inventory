from pydantic import BaseModel, Field

class Category(BaseModel):
    id: int = Field(..., description="The unique identifier for the category")
    name: str = Field(..., description="The name of the category")
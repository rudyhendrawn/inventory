from pydantic import BaseModel, Field
from typing import Optional

class Location(BaseModel):
    id: int = Field(..., description="The unique identifier for the location")
    name: str = Field(..., description="The name of the location")
    code: str = Field(..., description="The code representing the location")
    active: int = Field(True, description="Indicates if the location is active")
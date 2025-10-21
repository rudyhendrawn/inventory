from pydantic import BaseModel, Field
from typing import Optional

class Item(BaseModel):
    id: int = Field(..., description="The unique identifier for the item")
    sku: str = Field(..., description="The stock keeping unit for the item")
    name: str = Field(..., description="The name of the item")
    category_id: int = Field(..., description="The category ID the item belongs to")
    unit_id: int = Field(..., description="The unit ID for the item")
    owner_user_id: int = Field(..., description="The user ID of the item's owner")
    barcode: Optional[str] = Field(None, description="The barcode of the item")
    min_stock: float = Field(0.0, description="The minimum stock level for the item")
    image_url: Optional[str] = Field(None, description="The URL of the item's image")
    active: bool = Field(True, description="Indicates if the item is active")

import datetime
from pydantic import BaseModel, Field
from typing import Optional

class StockLevel(BaseModel):
    id: int = Field(..., description="The unique identifier for the stock level")
    item_id: int = Field(..., description="The ID of the item")
    location_id: int = Field(..., description="The ID of the location")
    qty_on_hand: Optional[int] = Field(0, description="The quantity on hand for the item at the location")
    updated_at: datetime.datetime = Field(..., description="The timestamp when the stock level was last updated")
import datetime
from pydantic import BaseModel, Field
from typing import Optional


class StockLevel(BaseModel):
    id: int = Field(..., description="Unique identifier for the stock level")
    item_id: int = Field(..., description="Identifier for the item")
    location_id: int = Field(..., description="Identifier for the location")
    tx_type: str = Field(..., description="Type of transaction (e.g., 'IN', 'OUT')")
    qty: Optional[int] = Field(None, description="Quantity of items in the transaction")
    ref: Optional[str] = Field(None, description="Reference for the transaction")
    note: Optional[str] = Field(None, description="Additional notes about the transaction")
    tx_at: datetime.datetime = Field(..., description="Timestamp of the transaction")
    user_id: int = Field(..., description="Identifier for the user who made the transaction")
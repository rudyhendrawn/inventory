from pydantic import BaseModel, Field

class IssueItem(BaseModel):
    id: int = Field(..., description="Unique identifier for the issue item")
    issue_id: int = Field(..., description="ID of the related issue")
    item_id: int = Field(..., description="ID of the item related to the issue")
    qty: int = Field(..., description="Quantity of the item related to the issue")
    
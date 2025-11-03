import datetime
from pydantic import BaseModel, Field
from typing import Optional


class Issue(BaseModel):
    id: int = Field(..., description="Unique identifier for the issue")
    code: str = Field(..., description="Code representing the issue type")
    status: str = Field(..., description="Current status of the issue")
    requested_by: Optional[int] = Field(None, description="ID of the user who requested the issue")
    approved_by: Optional[int] = Field(None, description="ID of the user who approved the issue")
    issued_at: Optional[datetime.datetime] = Field(None, description="Timestamp when the issue was issued")
    note: Optional[str] = Field(None, description="Additional notes regarding the issue")
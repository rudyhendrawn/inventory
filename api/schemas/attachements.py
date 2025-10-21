from pydantic import BaseModel, Field
from typing import Optional

class Attachment(BaseModel):
    id: int = Field(..., description="Unique identifier for the attachment")
    entity_type: str = Field(..., description="Type of the entity the attachment is associated with")
    entity_id: int = Field(..., description="Identifier of the associated entity")
    file_url: str = Field(..., description="URL of the attachment file")
    note: Optional[str] = Field(None, description="Optional note about the attachment")
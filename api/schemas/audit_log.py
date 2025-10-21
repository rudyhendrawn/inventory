import datetime
from pydantic import BaseModel, Field
from typing import Optional

class AuditLog(BaseModel):
    id: int = Field(..., description="Unique identifier for the audit log entry")
    actor_user_id: int = Field(..., description="ID of the user who performed the action")
    action: str = Field(..., description="Description of the action performed")
    entity_type: Optional[str] = Field(..., description="Type of entity affected by the action")
    entity_id: Optional[int] = Field(..., description="ID of the entity affected by the action")
    payload_json: Optional[dict] = Field(..., description="Additional data related to the action in JSON format")
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow, description="Timestamp when the audit log entry was created")
    
    
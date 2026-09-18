import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    project_type: str = "reforestation"
    status: str = "active"
    start_date: date | None = None
    end_date: date | None = None
    registry_standard: str | None = "Verra VM0042"
    country: str = "India"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    project_type: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    registry_standard: str | None = None


class ProjectRead(ProjectBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    site_count: int = 0
    total_area_hectares: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

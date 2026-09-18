import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SiteBase(BaseModel):
    name: str
    baseline_date: date | None = None
    land_cover_type: str | None = "Degraded Agricultural"
    notes: str | None = None


class SiteCreate(SiteBase):
    boundary: dict[str, Any]  # GeoJSON Geometry (Polygon)


class SiteUpdate(BaseModel):
    name: str | None = None
    boundary: dict[str, Any] | None = None
    baseline_date: date | None = None
    land_cover_type: str | None = None
    notes: str | None = None


class ConflictInfo(BaseModel):
    site_id: str
    site_name: str
    project_name: str
    overlap_hectares: float


class OverlapValidationResponse(BaseModel):
    is_valid: bool
    area_hectares: float
    has_overlap: bool
    conflicts: list[ConflictInfo] = []
    message: str


class SiteRead(SiteBase):
    id: uuid.UUID
    project_id: uuid.UUID
    area_hectares: float | None = None
    boundary: dict[str, Any]
    centroid: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeoJSONFeature]

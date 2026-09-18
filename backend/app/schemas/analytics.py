import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class MetricDefinitionRead(BaseModel):
    id: str
    label: str
    unit: str
    category: str
    higher_is_better: bool
    description: str | None = None
    display_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class TimeSeriesPoint(BaseModel):
    observed_on: date
    value: float
    provenance: str
    source_name: str | None = None
    confidence: float | None = None
    is_baseline: bool = False

    model_config = ConfigDict(from_attributes=True)


class MetricAnalytics(BaseModel):
    metric_id: str
    label: str
    unit: str
    category: str
    higher_is_better: bool
    baseline_value: float | None = None
    baseline_date: date | None = None
    latest_value: float | None = None
    latest_date: date | None = None
    delta_absolute: float | None = None
    delta_percent: float | None = None
    trend: str  # "improving", "declining", "stable"
    provenance: str
    source_name: str | None = None
    confidence: float | None = None
    history: list[TimeSeriesPoint] = []


class SiteAnalyticsResponse(BaseModel):
    site_id: uuid.UUID
    site_name: str
    project_id: uuid.UUID
    project_name: str
    area_hectares: float
    baseline_date: date | None = None
    metrics: list[MetricAnalytics]

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.monitoring import MetricDefinition, MonitoringRecord
from app.models.site import Site
from app.models.user import User
from app.schemas.analytics import (
    MetricDefinitionRead,
    SiteAnalyticsResponse,
    TimeSeriesPoint,
)
from app.services.analytics import AnalyticsService

router = APIRouter(tags=["Analytics & Monitoring"])


class MonitoringRecordCreate(BaseModel):
    metric_id: str
    observed_on: date
    value: float
    provenance: str = "satellite_derived"
    source_name: str | None = "Sentinel-2 L2A"
    confidence: float | None = 0.85
    is_baseline: bool = False


@router.get("/metrics", response_model=list[MetricDefinitionRead])
async def list_metric_definitions(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    query = select(MetricDefinition).order_by(MetricDefinition.display_order.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/sites/{site_id}/analytics", response_model=SiteAnalyticsResponse)
async def get_site_analytics(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    analytics = await AnalyticsService.get_site_analytics(db, site_id)
    if not analytics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Site or analytics not found"
        )
    return analytics


@router.post(
    "/sites/{site_id}/monitoring",
    response_model=TimeSeriesPoint,
    status_code=status.HTTP_201_CREATED,
)
async def add_monitoring_record(
    site_id: uuid.UUID,
    payload: MonitoringRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    site_res = await db.execute(select(Site).where(Site.id == site_id))
    if not site_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    record = MonitoringRecord(
        site_id=site_id,
        metric_id=payload.metric_id,
        observed_on=payload.observed_on,
        value=payload.value,
        provenance=payload.provenance,
        source_name=payload.source_name,
        confidence=payload.confidence,
        is_baseline=payload.is_baseline,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return TimeSeriesPoint(
        observed_on=record.observed_on,
        value=record.value,
        provenance=record.provenance,
        source_name=record.source_name,
        confidence=record.confidence,
        is_baseline=record.is_baseline,
    )

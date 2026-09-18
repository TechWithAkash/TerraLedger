import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.monitoring import MetricDefinition, MonitoringRecord
from app.models.project import Project
from app.models.site import Site
from app.schemas.analytics import (
    MetricAnalytics,
    SiteAnalyticsResponse,
    TimeSeriesPoint,
)


class AnalyticsService:
    @staticmethod
    async def get_site_analytics(
        db: AsyncSession, site_id: uuid.UUID
    ) -> SiteAnalyticsResponse | None:
        # Fetch site and project
        query = (
            select(Site, Project.name.label("project_name"))
            .join(Project, Project.id == Site.project_id)
            .where(Site.id == site_id)
        )
        result = await db.execute(query)
        row = result.first()
        if not row:
            return None

        site, project_name = row

        # Fetch metric definitions
        metric_defs_res = await db.execute(
            select(MetricDefinition).order_by(MetricDefinition.display_order)
        )
        metric_defs = metric_defs_res.scalars().all()

        # Fetch all monitoring records for this site ordered by observation date
        records_res = await db.execute(
            select(MonitoringRecord)
            .where(MonitoringRecord.site_id == site_id)
            .order_by(MonitoringRecord.observed_on.asc())
        )
        all_records = records_res.scalars().all()

        # Group records by metric_id
        records_by_metric = {}
        for record in all_records:
            records_by_metric.setdefault(record.metric_id, []).append(record)

        metrics_analytics: list[MetricAnalytics] = []

        for m_def in metric_defs:
            records = records_by_metric.get(m_def.id, [])
            if not records:
                continue

            # Identify baseline
            baseline_record = next((r for r in records if r.is_baseline), records[0])
            latest_record = records[-1]

            baseline_val = float(baseline_record.value)
            latest_val = float(latest_record.value)
            delta_abs = round(latest_val - baseline_val, 3)

            delta_pct = None
            if baseline_val != 0:
                delta_pct = round(((latest_val - baseline_val) / abs(baseline_val)) * 100.0, 1)

            # Determine trend based on whether higher is better
            if abs(delta_abs) < 0.001:
                trend = "stable"
            elif delta_abs > 0:
                trend = "improving" if m_def.higher_is_better else "declining"
            else:
                trend = "declining" if m_def.higher_is_better else "improving"

            history_points = [
                TimeSeriesPoint(
                    observed_on=r.observed_on,
                    value=float(r.value),
                    provenance=r.provenance,
                    source_name=r.source_name,
                    confidence=r.confidence,
                    is_baseline=r.is_baseline,
                )
                for r in records
            ]

            metrics_analytics.append(
                MetricAnalytics(
                    metric_id=m_def.id,
                    label=m_def.label,
                    unit=m_def.unit,
                    category=m_def.category,
                    higher_is_better=m_def.higher_is_better,
                    baseline_value=baseline_val,
                    baseline_date=baseline_record.observed_on,
                    latest_value=latest_val,
                    latest_date=latest_record.observed_on,
                    delta_absolute=delta_abs,
                    delta_percent=delta_pct,
                    trend=trend,
                    provenance=latest_record.provenance,
                    source_name=latest_record.source_name,
                    confidence=latest_record.confidence,
                    history=history_points,
                )
            )

        return SiteAnalyticsResponse(
            site_id=site.id,
            site_name=site.name,
            project_id=site.project_id,
            project_name=project_name,
            area_hectares=site.area_hectares or 0.0,
            baseline_date=site.baseline_date,
            metrics=metrics_analytics,
        )

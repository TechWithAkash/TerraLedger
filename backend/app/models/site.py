import uuid
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # GeoJSON geometry stored as structured JSON (compatible with PostGIS ST_GeomFromGeoJSON)
    boundary: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    centroid: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    area_hectares: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    land_cover_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    project = relationship("Project", back_populates="sites")
    monitoring_records = relationship(
        "MonitoringRecord", back_populates="site", cascade="all, delete-orphan"
    )

import math
import uuid
from typing import Any

from geoalchemy2.elements import WKBElement
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point, Polygon, mapping, shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.site import Site
from app.schemas.site import ConflictInfo

# Earth radius in meters (WGS84 mean authalic radius)
EARTH_RADIUS_METERS = 6371008.8


class GeometryService:
    @staticmethod
    def validate_and_parse_polygon(boundary_dict: dict[str, Any]) -> Polygon:
        """Validates that the input GeoJSON geometry is a valid, non-self-intersecting Polygon."""
        try:
            geom = shape(boundary_dict)
        except Exception as e:
            raise ValueError(f"Invalid GeoJSON geometry structure: {e}") from e

        if not isinstance(geom, Polygon):
            raise ValueError("Only single Polygon geometry is allowed for sites.")

        if not geom.is_valid:
            raise ValueError("Polygon geometry is invalid or self-intersecting.")

        if geom.is_empty:
            raise ValueError("Polygon geometry cannot be empty.")

        return geom

    @staticmethod
    def calculate_area_hectares(polygon: Polygon) -> float:
        """
        Calculates true geodesic area in hectares (1 hectare = 10,000 m²)
        using spherical polygon excess (NASA Earth observation formula).
        """
        coords = list(polygon.exterior.coords)
        if len(coords) < 3:
            return 0.0

        total = 0.0
        for i in range(len(coords) - 1):
            lon1, lat1 = math.radians(coords[i][0]), math.radians(coords[i][1])
            lon2, lat2 = math.radians(coords[i + 1][0]), math.radians(coords[i + 1][1])
            total += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2))

        # Handle inner holes if any
        for interior in polygon.interiors:
            hole_coords = list(interior.coords)
            hole_total = 0.0
            for i in range(len(hole_coords) - 1):
                lon1, lat1 = math.radians(hole_coords[i][0]), math.radians(hole_coords[i][1])
                lon2, lat2 = (
                    math.radians(hole_coords[i + 1][0]),
                    math.radians(hole_coords[i + 1][1]),
                )
                hole_total += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2))
            total -= hole_total

        area_sq_meters = abs(total * (EARTH_RADIUS_METERS**2) / 2.0)
        return round(area_sq_meters / 10000.0, 4)

    @staticmethod
    def calculate_centroid(polygon: Polygon) -> Point:
        return polygon.centroid

    @classmethod
    async def check_overlaps(
        cls,
        db: AsyncSession,
        new_polygon: Polygon,
        exclude_site_id: uuid.UUID | None = None,
    ) -> list[ConflictInfo]:
        """
        Detects overlapping sites across all registered projects to prevent double counting.
        Enforces a 100 m² (0.01 ha) tolerance threshold to allow parcels sharing adjacent borders.
        """
        conflicts: list[ConflictInfo] = []

        # Query existing sites intersecting with the new polygon
        query = select(Site, Project.name.label("project_name")).join(
            Project, Project.id == Site.project_id
        )
        if exclude_site_id:
            query = query.where(Site.id != exclude_site_id)

        result = await db.execute(query)
        rows = result.all()

        for site, project_name in rows:
            if site.boundary is None:
                continue
            try:
                existing_geom = to_shape(site.boundary)
                if new_polygon.intersects(existing_geom):
                    intersection = new_polygon.intersection(existing_geom)
                    if not intersection.is_empty and isinstance(intersection, Polygon):
                        overlap_ha = cls.calculate_area_hectares(intersection)
                        # Tolerance: > 0.01 hectares (100 square meters)
                        if overlap_ha >= 0.01:
                            conflicts.append(
                                ConflictInfo(
                                    site_id=str(site.id),
                                    site_name=site.name,
                                    project_name=project_name,
                                    overlap_hectares=overlap_ha,
                                )
                            )
            except Exception:
                continue

        # Sort conflicts by overlap size descending
        conflicts.sort(key=lambda c: c.overlap_hectares, reverse=True)
        return conflicts

    @staticmethod
    def polygon_to_wkb(polygon: Polygon) -> WKBElement:
        return from_shape(polygon, srid=4326)

    @staticmethod
    def wkb_to_geojson(wkb_element) -> dict[str, Any]:
        if wkb_element is None:
            return {}
        try:
            geom = to_shape(wkb_element)
            return mapping(geom)
        except Exception:
            return {}

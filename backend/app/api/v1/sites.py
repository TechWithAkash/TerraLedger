import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from shapely.geometry import mapping
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import GeometryOverlapException
from app.database import get_db
from app.dependencies import get_current_user
from app.models.project import Project
from app.models.site import Site
from app.models.user import User
from app.schemas.site import (
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    OverlapValidationResponse,
    SiteCreate,
    SiteRead,
)
from app.services.geometry import GeometryService

router = APIRouter(tags=["Sites & Geospatial"])


@router.post(
    "/projects/{project_id}/sites/validate",
    response_model=OverlapValidationResponse,
)
async def validate_site_geometry(
    project_id: uuid.UUID,
    payload: SiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dry-run validation endpoint used by Mapbox Draw in the frontend.
    Returns area in hectares and checks for boundary overlaps before saving.
    """
    try:
        polygon = GeometryService.validate_and_parse_polygon(payload.boundary)
    except ValueError as e:
        return OverlapValidationResponse(
            is_valid=False,
            area_hectares=0.0,
            has_overlap=False,
            conflicts=[],
            message=str(e),
        )

    area_ha = GeometryService.calculate_area_hectares(polygon)
    conflicts = await GeometryService.check_overlaps(db, polygon)

    if conflicts:
        return OverlapValidationResponse(
            is_valid=False,
            area_hectares=area_ha,
            has_overlap=True,
            conflicts=conflicts,
            message=f"Boundary overlaps with {len(conflicts)} existing site(s). Double-counting is prohibited in carbon projects.",
        )

    return OverlapValidationResponse(
        is_valid=True,
        area_hectares=area_ha,
        has_overlap=False,
        conflicts=[],
        message="Valid site boundary with no conflicts.",
    )


@router.post(
    "/projects/{project_id}/sites",
    response_model=SiteRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_site(
    project_id: uuid.UUID,
    payload: SiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project exists
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # 1. Validate Polygon
    try:
        polygon = GeometryService.validate_and_parse_polygon(payload.boundary)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # 2. Check Overlap (Key Differentiator)
    conflicts = await GeometryService.check_overlaps(db, polygon)
    if conflicts:
        raise GeometryOverlapException(
            conflicts=[c.model_dump() for c in conflicts],
            detail=f"Boundary overlaps with '{conflicts[0].site_name}' ({conflicts[0].overlap_hectares} ha overlap). Double counting is prevented.",
        )

    # 3. Calculate Area and Centroid
    area_ha = GeometryService.calculate_area_hectares(polygon)
    centroid = GeometryService.calculate_centroid(polygon)

    wkb_boundary = GeometryService.polygon_to_wkb(polygon)
    wkb_centroid = GeometryService.polygon_to_wkb(centroid)

    site = Site(
        project_id=project_id,
        name=payload.name,
        boundary=wkb_boundary,
        centroid=wkb_centroid,
        area_hectares=area_ha,
        baseline_date=payload.baseline_date,
        land_cover_type=payload.land_cover_type,
        notes=payload.notes,
    )
    db.add(site)
    await db.commit()
    await db.refresh(site)

    return SiteRead(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        boundary=mapping(polygon),
        centroid=mapping(centroid),
        area_hectares=site.area_hectares,
        baseline_date=site.baseline_date,
        land_cover_type=site.land_cover_type,
        notes=site.notes,
        created_at=site.created_at,
        updated_at=site.updated_at,
    )


@router.get(
    "/projects/{project_id}/sites",
    response_model=GeoJSONFeatureCollection,
)
async def get_project_sites_geojson(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns sites for a project as a GeoJSON FeatureCollection,
    optimized for direct consumption by Mapbox GL JS.
    """
    query = select(Site).where(Site.project_id == project_id)
    result = await db.execute(query)
    sites = result.scalars().all()

    features = []
    for site in sites:
        geom_dict = GeometryService.wkb_to_geojson(site.boundary)
        features.append(
            GeoJSONFeature(
                geometry=geom_dict,
                properties={
                    "id": str(site.id),
                    "project_id": str(site.project_id),
                    "name": site.name,
                    "area_hectares": site.area_hectares or 0.0,
                    "baseline_date": str(site.baseline_date) if site.baseline_date else None,
                    "land_cover_type": site.land_cover_type,
                },
            )
        )

    return GeoJSONFeatureCollection(features=features)


@router.get(
    "/sites/geojson",
    response_model=GeoJSONFeatureCollection,
)
async def get_all_sites_geojson(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all sites across all projects for the global overview map.
    """
    query = select(Site, Project.name.label("project_name")).join(
        Project, Project.id == Site.project_id
    )
    result = await db.execute(query)
    rows = result.all()

    features = []
    for site, project_name in rows:
        geom_dict = GeometryService.wkb_to_geojson(site.boundary)
        features.append(
            GeoJSONFeature(
                geometry=geom_dict,
                properties={
                    "id": str(site.id),
                    "project_id": str(site.project_id),
                    "project_name": project_name,
                    "name": site.name,
                    "area_hectares": site.area_hectares or 0.0,
                    "baseline_date": str(site.baseline_date) if site.baseline_date else None,
                    "land_cover_type": site.land_cover_type,
                },
            )
        )

    return GeoJSONFeatureCollection(features=features)


@router.get("/sites/{site_id}", response_model=SiteRead)
async def get_site(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalars().first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    geom_dict = GeometryService.wkb_to_geojson(site.boundary)
    centroid_dict = GeometryService.wkb_to_geojson(site.centroid)

    return SiteRead(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        boundary=geom_dict,
        centroid=centroid_dict,
        area_hectares=site.area_hectares,
        baseline_date=site.baseline_date,
        land_cover_type=site.land_cover_type,
        notes=site.notes,
        created_at=site.created_at,
        updated_at=site.updated_at,
    )


@router.delete("/sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(
    site_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalars().first()
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    await db.delete(site)
    await db.commit()

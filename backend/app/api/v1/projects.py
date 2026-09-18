import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.project import Project
from app.models.site import Site
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectRead

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).order_by(Project.created_at.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    response = []
    for p in projects:
        # Get site count and total area
        stats_query = select(
            func.count(Site.id).label("count"),
            func.coalesce(func.sum(Site.area_hectares), 0.0).label("total_area"),
        ).where(Site.project_id == p.id)
        stats_res = await db.execute(stats_query)
        count, total_area = stats_res.first() or (0, 0.0)

        p_read = ProjectRead(
            id=p.id,
            owner_id=p.owner_id,
            name=p.name,
            description=p.description,
            project_type=p.project_type,
            status=p.status,
            start_date=p.start_date,
            end_date=p.end_date,
            registry_standard=p.registry_standard,
            country=p.country,
            created_at=p.created_at,
            updated_at=p.updated_at,
            site_count=count,
            total_area_hectares=round(float(total_area), 2),
        )
        response.append(p_read)

    return response


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        project_type=payload.project_type,
        status=payload.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        registry_standard=payload.registry_standard,
        country=payload.country,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return ProjectRead(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        start_date=project.start_date,
        end_date=project.end_date,
        registry_standard=project.registry_standard,
        country=project.country,
        created_at=project.created_at,
        updated_at=project.updated_at,
        site_count=0,
        total_area_hectares=0.0,
    )


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    stats_query = select(
        func.count(Site.id).label("count"),
        func.coalesce(func.sum(Site.area_hectares), 0.0).label("total_area"),
    ).where(Site.project_id == project.id)
    stats_res = await db.execute(stats_query)
    count, total_area = stats_res.first() or (0, 0.0)

    return ProjectRead(
        id=project.id,
        owner_id=project.owner_id,
        name=project.name,
        description=project.description,
        project_type=project.project_type,
        status=project.status,
        start_date=project.start_date,
        end_date=project.end_date,
        registry_standard=project.registry_standard,
        country=project.country,
        created_at=project.created_at,
        updated_at=project.updated_at,
        site_count=count,
        total_area_hectares=round(float(total_area), 2),
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)
    await db.commit()

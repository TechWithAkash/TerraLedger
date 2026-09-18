from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api.v1.router import api_v1_router
from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.models.monitoring import MetricDefinition


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created on startup (or via migrations)
    try:
        async with engine.begin() as conn:
            # Enable PostGIS extension if running on PostgreSQL
            if "postgresql" in settings.DATABASE_URL:
                import contextlib

                with contextlib.suppress(Exception):
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            await conn.run_sync(Base.metadata.create_all)

        # Seed standard metric definitions if not present
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(MetricDefinition))
            if not res.scalars().first():
                default_metrics = [
                    MetricDefinition(
                        id="canopy_cover",
                        label="Canopy Cover",
                        unit="%",
                        category="biophysical",
                        higher_is_better=True,
                        description="Percentage of ground covered by vertical projection of tree crowns",
                        display_order=1,
                    ),
                    MetricDefinition(
                        id="ndvi_mean",
                        label="Mean NDVI",
                        unit="index (-1 to 1)",
                        category="biophysical",
                        higher_is_better=True,
                        description="Normalized Difference Vegetation Index from Sentinel-2",
                        display_order=2,
                    ),
                    MetricDefinition(
                        id="carbon_stock",
                        label="Above-ground Carbon Stock",
                        unit="tCO2e/ha",
                        category="carbon",
                        higher_is_better=True,
                        description="Modelled above-ground biomass carbon density",
                        display_order=3,
                    ),
                    MetricDefinition(
                        id="soil_organic_carbon",
                        label="Soil Organic Carbon",
                        unit="%",
                        category="carbon",
                        higher_is_better=True,
                        description="Topsoil organic carbon concentration",
                        display_order=4,
                    ),
                    MetricDefinition(
                        id="species_richness",
                        label="Species Richness",
                        unit="species count",
                        category="biodiversity",
                        higher_is_better=True,
                        description="Estimated native flora and fauna species count",
                        display_order=5,
                    ),
                    MetricDefinition(
                        id="habitat_intactness",
                        label="Habitat Intactness",
                        unit="index (0-1)",
                        category="biodiversity",
                        higher_is_better=True,
                        description="Biodiversity Intactness Index",
                        display_order=6,
                    ),
                ]
                session.add_all(default_metrics)
                await session.commit()
    except Exception as e:
        print(f"Warning during DB startup: {e}")

    yield

    # Teardown
    await engine.dispose()


app = FastAPI(
    title="Darukaa.Earth Platform API",
    description="Geospatial Data Analytics Platform for Carbon & Biodiversity Project MRV",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits Vercel previews & local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "darukaa-backend"}


@app.get("/ready", tags=["Health"])
async def readiness_check():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "error": str(e)},
        )

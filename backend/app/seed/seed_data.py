import asyncio
import math
from datetime import date, timedelta

from shapely.geometry import Polygon, mapping
from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import AsyncSessionLocal, Base, engine
from app.models.monitoring import MetricDefinition, MonitoringRecord
from app.models.project import Project
from app.models.site import Site
from app.models.user import User
from app.services.geometry import GeometryService


async def run_seed():
    print("Starting database seeding...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Database connection or schema creation skipped: {e}")
        return

    async with AsyncSessionLocal() as session:
        # 1. Check or Create Demo User
        user_res = await session.execute(select(User).where(User.email == "admin@darukaa.earth"))
        user = user_res.scalars().first()
        if not user:
            user = User(
                email="admin@darukaa.earth",
                password_hash=get_password_hash("demo1234"),
                full_name="Akash Darukaa Admin",
                role="admin",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print("Created demo admin: admin@darukaa.earth")

        # 1.5 Ensure Metric Definitions are present
        default_metrics = [
            MetricDefinition(
                id="canopy_cover",
                label="Canopy Cover",
                unit="%",
                category="biophysical",
                higher_is_better=True,
                description="Canopy Cover %",
                display_order=1,
            ),
            MetricDefinition(
                id="ndvi_mean",
                label="Mean NDVI",
                unit="index",
                category="biophysical",
                higher_is_better=True,
                description="Normalized Difference Vegetation Index",
                display_order=2,
            ),
            MetricDefinition(
                id="carbon_stock",
                label="Above-ground Carbon Stock",
                unit="tCO2e/ha",
                category="carbon",
                higher_is_better=True,
                description="Biomass Carbon",
                display_order=3,
            ),
            MetricDefinition(
                id="soil_organic_carbon",
                label="Soil Organic Carbon",
                unit="%",
                category="carbon",
                higher_is_better=True,
                description="Soil Carbon",
                display_order=4,
            ),
            MetricDefinition(
                id="species_richness",
                label="Species Richness",
                unit="species",
                category="biodiversity",
                higher_is_better=True,
                description="Species Count",
                display_order=5,
            ),
            MetricDefinition(
                id="habitat_intactness",
                label="Habitat Intactness",
                unit="index",
                category="biodiversity",
                higher_is_better=True,
                description="Intactness Index",
                display_order=6,
            ),
        ]
        for m in default_metrics:
            m_chk = await session.execute(
                select(MetricDefinition).where(MetricDefinition.id == m.id)
            )
            if not m_chk.scalars().first():
                session.add(m)
        await session.commit()

        # 2. Check or Create Projects
        projects_data = [
            {
                "name": "Marathwada Agroforestry & Reforestation Initiative",
                "description": "Restoration of degraded farmland across Beed and Osmanabad with indigenous agroforestry species.",
                "project_type": "agroforestry",
                "status": "active",
                "start_date": date(2022, 1, 15),
                "registry_standard": "Verra VM0042",
                "country": "India",
            },
            {
                "name": "Western Ghats Ecological Corridor",
                "description": "High-canopy native evergreen reforestation and elephant corridor habitat restoration.",
                "project_type": "reforestation",
                "status": "active",
                "start_date": date(2022, 6, 1),
                "registry_standard": "Plan Vivo",
                "country": "India",
            },
            {
                "name": "Sundarbans Coastal Mangrove Restoration",
                "description": "Tidal mangrove regeneration for blue carbon sequestration and cyclone barrier resilience.",
                "project_type": "wetland_restoration",
                "status": "monitoring",
                "start_date": date(2023, 3, 10),
                "registry_standard": "Gold Standard",
                "country": "India",
            },
        ]

        created_projects = []
        for p_data in projects_data:
            p_res = await session.execute(select(Project).where(Project.name == p_data["name"]))
            proj = p_res.scalars().first()
            if not proj:
                proj = Project(owner_id=user.id, **p_data)
                session.add(proj)
                await session.commit()
                await session.refresh(proj)
                print(f"Created project: {proj.name}")
            created_projects.append(proj)

        # 3. Add Realistic Sites with real coordinates
        # Coordinates in [Longitude, Latitude]
        sites_data = [
            # Project 1 (Marathwada, Maharashtra ~ 18.99 N, 75.76 E)
            {
                "project_idx": 0,
                "name": "Beed Sector 14 Agro-Parcel",
                "land_cover_type": "Degraded Rainfed Farmland",
                "baseline_date": date(2022, 2, 1),
                "coords": [
                    [75.7412, 18.9810],
                    [75.7525, 18.9815],
                    [75.7518, 18.9912],
                    [75.7405, 18.9905],
                    [75.7412, 18.9810],
                ],
            },
            {
                "project_idx": 0,
                "name": "Osmanabad North Buffer Zone",
                "land_cover_type": "Dry Scrubland",
                "baseline_date": date(2022, 3, 15),
                "coords": [
                    [75.7650, 18.9950],
                    [75.7780, 18.9955],
                    [75.7770, 19.0060],
                    [75.7640, 19.0050],
                    [75.7650, 18.9950],
                ],
            },
            # Project 2 (Western Ghats ~ 12.42 N, 75.73 E)
            {
                "project_idx": 1,
                "name": "Coorg Riverine Native Forest Site",
                "land_cover_type": "Degraded Forest Fringe",
                "baseline_date": date(2022, 6, 1),
                "coords": [
                    [75.7210, 12.4110],
                    [75.7320, 12.4115],
                    [75.7315, 12.4220],
                    [75.7205, 12.4215],
                    [75.7210, 12.4110],
                ],
            },
            # Project 3 (Sundarbans ~ 21.94 N, 88.89 E)
            {
                "project_idx": 2,
                "name": "Gosaba Island Mangrove Mudflat",
                "land_cover_type": "Intertidal Mudflat",
                "baseline_date": date(2023, 3, 10),
                "coords": [
                    [88.8820, 21.9310],
                    [88.8940, 21.9315],
                    [88.8930, 21.9420],
                    [88.8810, 21.9410],
                    [88.8820, 21.9310],
                ],
            },
        ]

        created_sites = []
        for s_data in sites_data:
            p = created_projects[s_data["project_idx"]]
            s_res = await session.execute(select(Site).where(Site.name == s_data["name"]))
            site = s_res.scalars().first()
            if not site:
                polygon = Polygon(s_data["coords"])
                area_ha = GeometryService.calculate_area_hectares(polygon)
                centroid = GeometryService.calculate_centroid(polygon)

                site = Site(
                    project_id=p.id,
                    name=s_data["name"],
                    boundary=mapping(polygon),
                    centroid=mapping(centroid),
                    area_hectares=area_ha,
                    baseline_date=s_data["baseline_date"],
                    land_cover_type=s_data["land_cover_type"],
                )
                session.add(site)
                await session.commit()
                await session.refresh(site)
                print(f"Created site: {site.name} ({area_ha} ha)")
            created_sites.append(site)

        # 4. Generate 24-36 Monthly Monitoring Observations with seasonal curves
        metrics = [
            ("canopy_cover", 8.5, 26.4, "satellite_derived", "Sentinel-2 L2A", 0.90),
            ("ndvi_mean", 0.32, 0.68, "satellite_derived", "Sentinel-2 L2A", 0.92),
            ("carbon_stock", 14.2, 38.5, "modelled", "Allometric Equation Verra VM0042", 0.85),
            ("soil_organic_carbon", 0.45, 0.98, "field_survey", "Soil Core Sampling Batch 4", 0.95),
            ("species_richness", 12.0, 31.0, "field_survey", "Ecological Transect Survey", 0.88),
            ("habitat_intactness", 0.35, 0.74, "modelled", "Biodiversity Intactness Model", 0.82),
        ]

        for site in created_sites:
            # Check if records already seeded
            rec_check = await session.execute(
                select(MonitoringRecord).where(MonitoringRecord.site_id == site.id)
            )
            if rec_check.scalars().first():
                continue

            start_dt = site.baseline_date or date(2022, 1, 1)
            num_months = 30  # 2.5 years of monthly series

            for m_id, base_val, max_gain, prov, src, conf in metrics:
                for i in range(num_months):
                    obs_date = start_dt + timedelta(days=i * 30.5)
                    # Logistic recovery + monsoon seasonality (peak around month 8-9)
                    progress = 1.0 / (1.0 + math.exp(-0.25 * (i - 12)))
                    seasonality = 0.08 * math.sin((obs_date.month / 12.0) * 2 * math.pi)
                    val = base_val + (max_gain - base_val) * progress + (base_val * seasonality)
                    val = round(max(0.1, val), 2)

                    record = MonitoringRecord(
                        site_id=site.id,
                        metric_id=m_id,
                        observed_on=obs_date,
                        value=val,
                        provenance=prov,
                        source_name=src,
                        confidence=conf,
                        is_baseline=(i == 0),
                    )
                    session.add(record)
            await session.commit()
            print(f"Seeded 180 monitoring time-series records for {site.name}")

    print("Seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_seed())

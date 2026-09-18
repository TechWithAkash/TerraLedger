# TerraLedger

**A Geospatial MRV Dashboard for Carbon and Biodiversity Projects**

Built for the Darukaa.Earth Full-Stack Developer Hackathon Challenge.

---

## Table of Contents

1. [What We Are Building](#1-what-we-are-building)
2. [How This Assignment Is Actually Scored](#2-how-this-assignment-is-actually-scored)
3. [The Five Differentiators](#3-the-five-differentiators)
4. [High Level Architecture](#4-high-level-architecture)
5. [Repository Structure](#5-repository-structure)
6. [The Domain Model](#6-the-domain-model)
7. [Database Schema](#7-database-schema)
8. [Geospatial Handling with PostGIS](#8-geospatial-handling-with-postgis)
9. [Data Sourcing Strategy](#9-data-sourcing-strategy)
10. [Backend Design](#10-backend-design)
11. [API Reference](#11-api-reference)
12. [Authentication and Security](#12-authentication-and-security)
13. [Frontend Design](#13-frontend-design)
14. [Data Visualization](#14-data-visualization)
15. [Code Quality and Pre-commit Hooks](#15-code-quality-and-pre-commit-hooks)
16. [Testing Strategy](#16-testing-strategy)
17. [CI/CD Pipeline](#17-cicd-pipeline)
18. [Deployment](#18-deployment)
19. [Local Setup](#19-local-setup)
20. [Build Order](#20-build-order)
21. [Trade-offs and Decisions](#21-trade-offs-and-decisions)
22. [Submission Checklist](#22-submission-checklist)

---

## 1. What We Are Building

### The problem in plain words

A carbon or biodiversity project is not one piece of land. It is a portfolio: a project developer runs a reforestation programme across forty separate parcels in three districts. Each parcel was in a different condition when it started, each is monitored on its own schedule, and each contributes a different amount to the total carbon or biodiversity claim.

Right now that lives in spreadsheets. Boundaries live in one file, monitoring data in another, and nobody can answer "how is site 23 doing compared to when we started" without ten minutes of manual work.

### What TerraLedger does

TerraLedger is an administrator dashboard for managing those portfolios:

- Create a project and draw its constituent sites directly on a map
- See every project and every site on one interactive map
- Click a site to see how its metrics have moved over time, against its own baseline
- Roll site level numbers up into project level totals

### Framing that matters

The brief calls this a "geospatial data analytics platform." That is accurate but it undersells what Darukaa actually does. Their business is **MRV**: Measurement, Reporting and Verification for carbon removal and biodiversity credits. Every number in a system like this eventually gets defended to a verifier.

So the design decision that runs through this entire document is: **treat every metric as a dated, sourced, auditable observation rather than a current value on a row**. That single choice is what turns a CRUD app into something that looks like their product.

---

## 2. How This Assignment Is Actually Scored

Read the rubric carefully. There are three categories and only one of them is about code.

| Category                           | What they are really asking                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| **Code Quality**                   | Is this readable by someone who did not write it                                           |
| **System Architecture**            | Does the data model reflect understanding of the domain, or is it just tables behind forms |
| **CI/CD and Developer Experience** | Does the pipeline actually work, or is there just a yaml file in the repo                  |
| **Technical Execution**            | Did you use Mapbox and Highcharts properly, or wrap them in a div and hope                 |
| **Problem-Solving**                | Did you understand what an administrator of a carbon project actually needs                |
| **UI/UX Design**                   | Can someone use this without a tutorial                                                    |
| **Trade-offs**                     | Can you explain why you built it this way instead of another way                           |

Two observations worth acting on.

**"Trade-offs" is an explicit scoring line.** It is the cheapest points in the entire assignment and almost nobody writes it honestly. Section 21 of this document is a filled-in template for exactly that.

**"This is a crucial requirement"** appears exactly once in the whole brief, attached to the pre-commit hooks. When a brief emphasises one specific thing, that thing gets checked first. Do not treat hooks as an afterthought.

### What this assignment is NOT

It is not an AI assignment. Do not add RAG, LLM features or a chatbot. Different brief, different rubric. Grafting AI onto a "build this correctly" challenge reads as not having understood the ask.

One line in the README is the right amount of cross-reference:

> This submission is deliberately scoped to the full-stack brief. My AI Engineer submission covers the reasoning and knowledge-system work separately.

---

## 3. The Five Differentiators

Most submissions will be: users table, projects table, sites table with a lat/lng, a map with pins, a chart of random numbers, and a GitHub Action that runs tests. That clears the bar and nothing more.

Here is where to actually pull ahead. Each of these maps to a specific rubric line.

### 3.1 Time-series monitoring records, not current values on a row

The user story says "performance over time." If your `sites` table has columns like `carbon_stock` and `species_count`, you have already failed that story, because there is no history to plot.

Instead: `sites` holds identity and geometry. `monitoring_records` holds one row per site, per metric, per observation date, with provenance. The chart is then just a query, and the baseline comparison falls out for free.

### 3.2 Overlap detection to prevent double counting

**This is the single strongest domain signal you can send.** In carbon markets, double counting is the integrity problem. If two project boundaries overlap, the same tonne of carbon gets claimed twice, and that is how registries lose credibility.

So when an administrator draws a new site polygon, validate it server-side with PostGIS:

- Is the geometry valid and closed
- Does it overlap an existing site, in this project or any other project
- If it overlaps, reject it with the name of the conflicting site and the overlap area in hectares

Ten lines of SQL. A reviewer from a climate-tech company will notice immediately, because it proves you thought about what the data means rather than just storing it.

### 3.3 Provenance on every metric

Every monitoring record carries how it was obtained: `satellite_derived`, `field_survey`, `modelled` or `estimated`, plus the source name and a confidence band. Show it in the UI as a small badge next to each data point.

This costs almost nothing to build and it is exactly how verification-grade data is handled in the real world.

### 3.4 Baseline versus current, everywhere

Never display a bare number. A site's soil carbon is not "0.58 percent." It is "0.58 percent, up from a 0.31 percent baseline set in March 2024."

Store a `baseline_date` on each site and mark the baseline records. Every chart gets a baseline reference line. Every stat card gets a delta. This is how credit claims are expressed and it makes the dashboard read as purpose-built rather than generic.

### 3.5 A CI/CD pipeline you can prove works

Not just present. Working, and demonstrated:

- Pre-commit hooks that genuinely block a badly formatted commit
- CI that lints, type-checks, tests and only then builds
- Automatic deploy on green main
- A screenshot or short GIF in the README of a commit being rejected by the hook

Two minutes of effort to record, and it converts a claim into evidence.

---

## 4. High Level Architecture

```mermaid
flowchart TB
    subgraph CLIENT["Browser"]
        direction LR
        R1["React 18 + TypeScript<br/>Vite"]
        R2["Mapbox GL JS<br/>plus mapbox-gl-draw"]
        R3["Highcharts"]
        R4["TanStack Query<br/>server state and cache"]
    end

    subgraph EDGE["Vercel"]
        CDN["Static SPA<br/>global CDN"]
    end

    subgraph API["Render - FastAPI container"]
        A1["Auth Router<br/>JWT issue and refresh"]
        A2["Projects Router"]
        A3["Sites Router<br/>polygon validation"]
        A4["Analytics Router<br/>time series and rollups"]
        A5["Middleware<br/>CORS, request id, logging"]
    end

    subgraph SVC["Service Layer"]
        S1["Geometry Service<br/>validate, area, overlap"]
        S2["Analytics Service<br/>aggregation and deltas"]
        S3["Audit Service"]
    end

    subgraph DB["Render PostgreSQL 16"]
        D1[("Core tables")]
        D2[("PostGIS<br/>geometry + GIST index")]
        D3[("monitoring_records<br/>time series")]
    end

    subgraph DATA["Data Pipeline - offline"]
        P1["Sentinel-2 NDVI extraction"]
        P2["Metric derivation"]
        P3["Seed loader"]
    end

    CLIENT --> CDN
    CDN -->|HTTPS + JWT| API
    API --> SVC
    SVC --> DB
    DATA --> DB

    subgraph CICD["GitHub Actions"]
        C1["lint, typecheck, test"]
        C2["build"]
        C3["deploy"]
    end
    CICD -.->|on green main| EDGE
    CICD -.->|on green main| API
```

### Why this shape

| Choice                                   | Reason                                                                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| SPA on a CDN, API on a container         | The frontend is static and cacheable. Only the API needs to scale with data. Cheap, simple, and the split is easy to explain. |
| Service layer between routers and models | Routers stay thin and testable. Geometry logic is not tangled into HTTP handling.                                             |
| Offline data pipeline                    | Satellite extraction is slow and rate limited. It should never happen inside a request.                                       |
| Single Postgres with PostGIS             | Geospatial and relational data in one place, one transaction boundary, no sync problem.                                       |

---

## 5. Repository Structure

A monorepo, because the pre-commit hooks need to cover both sides and a single CI file is easier to reason about.

```
terraledger/
├── README.md
├── docker-compose.yml
├── Makefile
├── package.json              # root, for Husky + lint-staged only
├── .husky/
│   ├── pre-commit
│   └── commit-msg
├── .lintstagedrc.json
├── .pre-commit-config.yaml   # optional python-side mirror
│
├── backend/
│   ├── pyproject.toml        # uv managed
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py       # get_db, get_current_user
│   │   ├── middleware.py         # request id, timing, error handler
│   │   │
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── sites.py
│   │   │   ├── monitoring.py
│   │   │   └── analytics.py
│   │   │
│   │   ├── models/               # SQLAlchemy 2.0 ORM
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── site.py
│   │   │   ├── monitoring.py
│   │   │   └── audit.py
│   │   │
│   │   ├── schemas/              # Pydantic v2
│   │   ├── services/
│   │   │   ├── geometry.py       # PostGIS validation and overlap
│   │   │   ├── analytics.py      # time series and rollups
│   │   │   └── audit.py
│   │   ├── core/
│   │   │   ├── security.py       # hashing, JWT
│   │   │   └── exceptions.py
│   │   └── seed/
│   │       ├── seed.py
│   │       └── data/
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_geometry.py      # the important one
│       ├── test_sites.py
│       └── test_analytics.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/                  # typed client, generated from OpenAPI
│   │   ├── hooks/                # TanStack Query hooks
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── MapView.tsx
│   │   │   │   ├── DrawControl.tsx
│   │   │   │   └── SiteLayer.tsx
│   │   │   ├── charts/
│   │   │   │   ├── MetricTimeSeries.tsx
│   │   │   │   ├── BaselineComparison.tsx
│   │   │   │   └── ProjectRollup.tsx
│   │   │   ├── site/
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   └── SiteDetail.tsx
│   │   ├── store/                # Zustand, UI state only
│   │   └── types/
│   └── tests/
│
├── data_pipeline/
│   ├── extract_ndvi.py
│   ├── derive_metrics.py
│   └── README.md             # documents the dataset choice, required by the brief
│
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

---

## 6. The Domain Model

### 6.1 The entities

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ SITES : "contains"
    SITES ||--o{ MONITORING_RECORDS : "measured by"
    METRIC_DEFINITIONS ||--o{ MONITORING_RECORDS : "typed by"
    USERS ||--o{ AUDIT_LOG : "acts"

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string role
        timestamp created_at
    }

    PROJECTS {
        uuid id PK
        uuid owner_id FK
        string name
        string project_type
        string status
        date start_date
        string registry_standard
        timestamp created_at
    }

    SITES {
        uuid id PK
        uuid project_id FK
        string name
        geometry boundary
        numeric area_hectares
        date baseline_date
        string land_cover_type
        timestamp created_at
    }

    METRIC_DEFINITIONS {
        string id PK
        string label
        string unit
        string category
        boolean higher_is_better
    }

    MONITORING_RECORDS {
        uuid id PK
        uuid site_id FK
        string metric_id FK
        date observed_on
        numeric value
        string provenance
        string source_name
        numeric confidence
        boolean is_baseline
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        string entity_type
        uuid entity_id
        string action
        jsonb changes
        timestamp created_at
    }
```

### 6.2 Why this model and not the obvious one

The obvious model puts metrics on the site:

```sql
-- DO NOT DO THIS
CREATE TABLE sites (
    ...
    carbon_stock NUMERIC,
    species_count INT,
    canopy_cover NUMERIC
);
```

It fails for four reasons, and being able to say this out loud is worth real points:

1. **No history.** The user story explicitly asks for performance over time. This schema has one value per metric, ever.
2. **Schema churn.** Adding a new metric means an ALTER TABLE and a migration. With `metric_definitions` you insert a row.
3. **No provenance.** You cannot record that canopy cover came from Sentinel-2 while species count came from a field survey.
4. **No baseline.** There is nowhere to say "this is the value we started from," which is the basis of every credit claim.

The normalised version costs one extra join and buys all four. That is a trade-off worth making and worth documenting.

### 6.3 Metric definitions as data

Seed these rather than hardcoding them. Eight is plenty.

| id                    | label                     | unit         | category     | higher_is_better |
| --------------------- | ------------------------- | ------------ | ------------ | ---------------- |
| `canopy_cover`        | Canopy Cover              | percent      | biophysical  | yes              |
| `ndvi_mean`           | Mean NDVI                 | index        | biophysical  | yes              |
| `carbon_stock`        | Above-ground Carbon Stock | tCO2e per ha | carbon       | yes              |
| `soil_organic_carbon` | Soil Organic Carbon       | percent      | carbon       | yes              |
| `species_richness`    | Species Richness          | count        | biodiversity | yes              |
| `habitat_intactness`  | Habitat Intactness        | index 0-1    | biodiversity | yes              |
| `tree_cover_loss`     | Tree Cover Loss           | ha per year  | risk         | no               |
| `survival_rate`       | Seedling Survival Rate    | percent      | operations   | yes              |

---

## 7. Database Schema

PostgreSQL 16 with PostGIS 3.4.

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          CITEXT UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    full_name      TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'admin'
                   CHECK (role IN ('admin', 'viewer')),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------
CREATE TABLE projects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name              TEXT NOT NULL,
    description       TEXT,
    project_type      TEXT NOT NULL
                      CHECK (project_type IN ('afforestation','reforestation',
                                              'agroforestry','wetland_restoration',
                                              'soil_carbon','biodiversity_conservation')),
    status            TEXT NOT NULL DEFAULT 'planning'
                      CHECK (status IN ('planning','active','monitoring','completed','suspended')),
    start_date        DATE,
    end_date          DATE,
    registry_standard TEXT,          -- Verra VM0042, Plan Vivo, Gold Standard ...
    country           TEXT DEFAULT 'India',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT project_dates_sane CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ---------------------------------------------------------------
-- Sites. Geometry is first class, not a JSON blob.
-- ---------------------------------------------------------------
CREATE TABLE sites (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    boundary         GEOMETRY(POLYGON, 4326) NOT NULL,
    area_hectares    NUMERIC(12,4),        -- computed server side, never trusted from client
    centroid         GEOMETRY(POINT, 4326), -- denormalised for fast map fly-to
    baseline_date    DATE,
    land_cover_type  TEXT,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- reject self-intersecting or malformed polygons at the database level
    CONSTRAINT boundary_is_valid CHECK (ST_IsValid(boundary)),
    CONSTRAINT site_name_unique_per_project UNIQUE (project_id, name)
);
CREATE INDEX idx_sites_boundary ON sites USING GIST (boundary);
CREATE INDEX idx_sites_centroid ON sites USING GIST (centroid);
CREATE INDEX idx_sites_project ON sites(project_id);

-- ---------------------------------------------------------------
-- Metric definitions. Adding a metric is an INSERT, not a migration.
-- ---------------------------------------------------------------
CREATE TABLE metric_definitions (
    id               TEXT PRIMARY KEY,
    label            TEXT NOT NULL,
    unit             TEXT NOT NULL,
    category         TEXT NOT NULL
                     CHECK (category IN ('biophysical','carbon','biodiversity',
                                         'risk','operations')),
    higher_is_better BOOLEAN NOT NULL DEFAULT TRUE,
    description      TEXT,
    display_order    INT DEFAULT 0
);

-- ---------------------------------------------------------------
-- The time series. This table is the heart of the application.
-- ---------------------------------------------------------------
CREATE TABLE monitoring_records (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    metric_id    TEXT NOT NULL REFERENCES metric_definitions(id),
    observed_on  DATE NOT NULL,
    value        NUMERIC(14,4) NOT NULL,

    -- PROVENANCE. Every number knows where it came from.
    provenance   TEXT NOT NULL
                 CHECK (provenance IN ('satellite_derived','field_survey',
                                       'modelled','estimated')),
    source_name  TEXT,                  -- "Sentinel-2 L2A", "Field survey Batch 3"
    confidence   NUMERIC(3,2)           -- 0.00 to 1.00
                 CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),

    is_baseline  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- one observation per site, per metric, per date
    CONSTRAINT unique_observation UNIQUE (site_id, metric_id, observed_on)
);
CREATE INDEX idx_monitoring_site_metric_date
    ON monitoring_records (site_id, metric_id, observed_on DESC);
CREATE INDEX idx_monitoring_baseline
    ON monitoring_records (site_id, metric_id) WHERE is_baseline;

-- only one baseline per site per metric
CREATE UNIQUE INDEX idx_one_baseline_per_series
    ON monitoring_records (site_id, metric_id) WHERE is_baseline;

-- ---------------------------------------------------------------
-- Audit log. MRV systems need traceability.
-- ---------------------------------------------------------------
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    entity_type TEXT NOT NULL,       -- project | site | monitoring_record
    entity_id   UUID NOT NULL,
    action      TEXT NOT NULL        -- created | updated | deleted
                CHECK (action IN ('created','updated','deleted')),
    changes     JSONB,               -- before/after diff
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

### 7.1 Schema decisions worth defending

| Decision                                 | Reasoning                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEOMETRY(POLYGON, 4326)` not JSON       | Lets the database do spatial work: area, overlap, containment, indexed proximity search. Storing GeoJSON in a text column throws all of that away.          |
| GIST index on`boundary`                  | Without it, overlap checks are a sequential scan over every site. With it they are milliseconds.                                                            |
| `area_hectares` computed server side     | Never trust a number the client could have tampered with, and never make the client recompute what the database already knows.                              |
| `centroid` denormalised                  | The map needs a point to fly to and to cluster on. Computing`ST_Centroid` on every list request is wasteful when it only changes when the boundary changes. |
| Partial unique index on`is_baseline`     | Enforces "exactly one baseline per series" in the database rather than in application code, where it will eventually be forgotten.                          |
| `CHECK (ST_IsValid(boundary))`           | A self-intersecting polygon silently breaks every area and overlap calculation downstream. Catch it at the boundary of the system.                          |
| Cascade from project to sites to records | Deleting a project should not leave orphaned geometry. Restrict on user delete, because losing ownership history is worse.                                  |

---

## 8. Geospatial Handling with PostGIS

This is where you demonstrate that PostGIS is being used, not merely installed.

### 8.1 Area calculation

Polygons are stored in EPSG:4326, which is degrees, so `ST_Area` on it returns square degrees, which is meaningless. Cast to geography to get square metres:

```sql
SELECT ST_Area(boundary::geography) / 10000.0 AS area_hectares
FROM sites WHERE id = :site_id;
```

Getting this wrong is the most common PostGIS mistake and getting it right is a quiet competence signal.

### 8.2 Overlap detection, the differentiator

```sql
-- Called before INSERT or UPDATE of a site boundary
SELECT
    s.id,
    s.name,
    p.name AS project_name,
    ST_Area(ST_Intersection(s.boundary, ST_GeomFromGeoJSON(:new_geom))::geography)
        / 10000.0 AS overlap_hectares
FROM sites s
JOIN projects p ON p.id = s.project_id
WHERE s.id <> COALESCE(:exclude_site_id, '00000000-0000-0000-0000-000000000000'::uuid)
  AND ST_Intersects(s.boundary, ST_GeomFromGeoJSON(:new_geom))
  AND ST_Area(ST_Intersection(s.boundary, ST_GeomFromGeoJSON(:new_geom))::geography) > 100
ORDER BY overlap_hectares DESC;
```

The `> 100` square metre threshold exists because two adjacent parcels sharing a border will produce a sliver intersection from floating point rounding. Rejecting those would make the app unusable. Explaining that tolerance in your README is a nice detail.

On a hit, return a 409 with a useful body:

```json
{
  "detail": "Site boundary overlaps an existing site",
  "conflicts": [
    {
      "site_id": "…",
      "site_name": "Beed Parcel 12",
      "project_name": "Marathwada Agroforestry Phase 1",
      "overlap_hectares": 2.34
    }
  ],
  "why_this_matters": "Overlapping boundaries can cause the same land to be counted twice in carbon or biodiversity claims."
}
```

Surface that message in the UI, with the conflicting polygon highlighted in red on the map. That is a thirty minute feature that will be remembered.

### 8.3 Other PostGIS uses worth including

| Use                            | Function                               | Where                                                     |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------- |
| Validate drawn geometry        | `ST_IsValid`, `ST_IsSimple`            | Site create and update                                    |
| Repair minor issues            | `ST_MakeValid`                         | Optional, offer as a "fix it" action                      |
| Map bounding box for a project | `ST_Extent` over its sites             | Auto-fit the map on project open                          |
| Centroid for markers           | `ST_Centroid`                          | Stored on write                                           |
| Viewport filtering             | `ST_Intersects` with `ST_MakeEnvelope` | Only fetch sites in view, matters once there are hundreds |
| Simplify for the list view     | `ST_SimplifyPreserveTopology`          | Send lighter geometry to the map at low zoom              |

The viewport filtering endpoint is worth building even with only thirty seeded sites, because it shows you designed for a portfolio of thousands.

### 8.4 GeoJSON in and out

Accept and return GeoJSON, since that is what Mapbox Draw produces and consumes.

```python
# Reading: let the database do the conversion
stmt = select(
    Site.id, Site.name, Site.area_hectares,
    func.ST_AsGeoJSON(Site.boundary).label("boundary")
)
```

```python
# Writing: validate with shapely before it touches the database
from shapely.geometry import shape
from geoalchemy2.shape import from_shape

geom = shape(payload.boundary)          # raises on malformed GeoJSON
if not geom.is_valid:
    raise HTTPException(422, "Polygon is self-intersecting")
if geom.geom_type != "Polygon":
    raise HTTPException(422, "Only single polygons are supported")
db_geom = from_shape(geom, srid=4326)
```

Two layers of validation, application and database. Say so in the trade-offs section: it is belt and braces, and it is deliberate.

---

## 9. Data Sourcing Strategy

The brief says: _"There are no limitations on datasets and mocks you would want to use in the project, feel free to use any datasets and document why this choice was made."_

That sentence is a test. It is the one place where they check whether you think about data provenance, which is the core of their business. Most people will use `Math.random()` and say nothing. **Write a real `data_pipeline/README.md` explaining your choice.**

### 9.1 The recommended approach: a hybrid

| Layer                                       | Source                                                                                                                             | Why                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Site boundaries**                         | Hand-drawn polygons over real degraded land in Maharashtra and Madhya Pradesh, using visible field boundaries on satellite imagery | Real coordinates make the map demo credible instantly. Fake polygons in the ocean do not. |
| **NDVI and canopy cover**                   | Sentinel-2 L2A via Copernicus Browser or Google Earth Engine, monthly means over 3 years                                           | Real, free, well documented, and directly relevant to their business                      |
| **Carbon stock**                            | Derived from canopy cover using published allometric relationships, clearly labelled`provenance: modelled`                         | Honest about being a derivation rather than a measurement                                 |
| **Species richness and habitat intactness** | GBIF occurrence counts for the site vicinity, or clearly labelled synthetic                                                        | Real where practical, labelled where not                                                  |
| **Survival rate and field observations**    | Synthetic, generated with a documented model, labelled`provenance: estimated`                                                      | No public source exists, so be explicit                                                   |

### 9.2 If time is short, synthetic is fine, but do it properly

A defensible synthetic generator beats a badly sourced real dataset. What "properly" means:

```python
def generate_ndvi_series(
    start: date, months: int, baseline: float,
    growth_rate: float, seasonality_amplitude: float, noise_sd: float, seed: int
) -> list[tuple[date, float]]:
    """
    NDVI under a restoration intervention.

    Model:
      value(t) = baseline
                 + logistic_growth(t, rate, ceiling)      # restoration effect
                 + seasonal(t, amplitude)                 # monsoon cycle, peaks Sep
                 + noise(sd)                              # sensor and atmospheric

    Growth is logistic, not linear, because vegetation recovery saturates.
    Seasonality peaks in September for the Indian monsoon.
    Noise sd of 0.03 approximates Sentinel-2 L2A NDVI variability.
    """
```

Three properties make synthetic data look intentional rather than lazy:

1. **Seasonality.** Indian NDVI peaks post-monsoon. A flat upward line is obviously fake.
2. **Saturation.** Growth curves flatten. Straight lines do not occur in ecology.
3. **A fixed seed.** Your demo produces identical charts on every run, and the reviewer can reproduce them.

### 9.3 What to write in `data_pipeline/README.md`

Structure it as: what we used, why we used it, what its limitations are, and what we would use in production. Roughly 400 words. Something like:

> Site boundaries are hand-digitised over real degraded agricultural land in Beed and Osmanabad districts, Maharashtra, chosen because they fall in AEZ 6 (hot semi-arid Deccan plateau) where restoration projects are actively being developed.
>
> NDVI and canopy cover are real, extracted from Sentinel-2 L2A monthly composites between January 2022 and December 2024 using the Copernicus Data Space API. Cloud masking uses the SCL band. Resolution is 10m, resampled to the site polygon mean.
>
> Carbon stock is modelled, not measured. It is derived from canopy cover using a published allometric relationship for dry deciduous systems, and is flagged with `provenance: modelled` and `confidence: 0.6` in the database. It should not be read as a verification-grade figure.
>
> Species richness and survival rate are synthetic. No public per-parcel dataset exists at this resolution. They are generated with a seeded logistic-plus-seasonal model documented in `derive_metrics.py`, and flagged `provenance: estimated`.
>
> **Limitation:** Sentinel-2 at 10m cannot resolve individual trees, so canopy cover for sparse agroforestry is systematically underestimated. In production this would be supplemented with drone or PlanetScope imagery and ground-truth plots.
>
> **Why this matters for the UI:** because provenance varies by metric, the interface displays a provenance badge on every data point. A user should always be able to tell a satellite measurement from a model output.

That final paragraph is what connects your data choice to your product design, and it is exactly the kind of thinking the Product Mindedness criterion is looking for.

---

## 10. Backend Design

FastAPI, because it gives you automatic OpenAPI docs (which means a free typed frontend client), Pydantic validation at the boundary, and native async. Say that in the trade-offs section rather than just picking it silently.

### 10.1 Layering

```mermaid
flowchart LR
    REQ["HTTP Request"] --> MW["Middleware<br/>request id, CORS, timing"]
    MW --> RT["Router<br/>validation and auth only"]
    RT --> SV["Service<br/>business logic"]
    SV --> RP["Repository / ORM"]
    RP --> DB[("PostgreSQL + PostGIS")]
    SV --> AU["Audit Service"]
    AU --> DB
```

**The rule:** routers contain no business logic. A router parses input, checks permission, calls one service method, and shapes the response. Everything interesting lives in `services/`, which means it is unit testable without spinning up HTTP.

A reviewer reading `api/v1/sites.py` should be able to understand what the endpoint does in ten seconds.

```python
@router.post("", response_model=SiteRead, status_code=201)
async def create_site(
    project_id: UUID,
    payload: SiteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SiteRead:
    await projects.assert_owner(db, project_id, user.id)
    site = await site_service.create(db, project_id, payload, actor=user)
    return SiteRead.model_validate(site)
```

That is the whole handler. Overlap checking, area computation, centroid derivation and audit logging all happen inside `site_service.create`.

### 10.2 Error handling

One exception handler, consistent error envelope, no stack traces leaking to the client.

```python
class AppError(Exception):
    status_code: int = 400
    code: str = "app_error"
    detail: str = "Something went wrong"
    extra: dict | None = None

class GeometryOverlapError(AppError):
    status_code = 409
    code = "geometry_overlap"
    detail = "Site boundary overlaps an existing site"
```

```json
{
  "error": {
    "code": "geometry_overlap",
    "detail": "Site boundary overlaps an existing site",
    "request_id": "01JBQ...",
    "extra": { "conflicts": [ ... ] }
  }
}
```

Including `request_id` in every error response and every log line is a small thing that makes an app feel operationally serious.

### 10.3 Structured logging

```python
logger.info(
    "site_created",
    extra={"site_id": str(site.id), "project_id": str(project_id),
           "area_ha": float(site.area_hectares), "request_id": request_id},
)
```

JSON logs, not f-strings. Render aggregates them and they become searchable.

---

## 11. API Reference

Versioned under `/api/v1`. Full OpenAPI at `/docs`.

### 11.1 Endpoints

| Method   | Path                            | Purpose                                                      |
| -------- | ------------------------------- | ------------------------------------------------------------ |
| `POST`   | `/auth/register`                | Create an account                                            |
| `POST`   | `/auth/login`                   | Returns access and refresh tokens                            |
| `POST`   | `/auth/refresh`                 | Exchange refresh for a new access token                      |
| `GET`    | `/auth/me`                      | Current user                                                 |
| `GET`    | `/projects`                     | List, paginated, filter by status and type                   |
| `POST`   | `/projects`                     | Create                                                       |
| `GET`    | `/projects/{id}`                | Detail, including site count and aggregate area              |
| `PATCH`  | `/projects/{id}`                | Update                                                       |
| `DELETE` | `/projects/{id}`                | Delete, cascades to sites                                    |
| `GET`    | `/projects/{id}/sites`          | Sites in a project, as a GeoJSON FeatureCollection           |
| `POST`   | `/projects/{id}/sites`          | Create a site from a drawn polygon. Runs overlap validation. |
| `POST`   | `/projects/{id}/sites/validate` | Dry run the overlap check without saving                     |
| `GET`    | `/sites/{id}`                   | Site detail with latest metric values                        |
| `PATCH`  | `/sites/{id}`                   | Update, re-runs validation if geometry changed               |
| `DELETE` | `/sites/{id}`                   | Delete                                                       |
| `GET`    | `/sites/{id}/monitoring`        | Time series. Filter by`metric_id`, `from`, `to`.             |
| `POST`   | `/sites/{id}/monitoring`        | Add an observation                                           |
| `POST`   | `/sites/{id}/monitoring/bulk`   | Bulk insert, used by the seed pipeline                       |
| `GET`    | `/sites/{id}/analytics`         | Baseline, latest, delta and trend per metric                 |
| `GET`    | `/projects/{id}/analytics`      | Project level rollup across sites                            |
| `GET`    | `/map/sites`                    | Viewport query, takes a bbox, returns simplified geometry    |
| `GET`    | `/metrics`                      | Metric definitions, for building the UI dynamically          |
| `GET`    | `/audit`                        | Recent activity feed                                         |
| `GET`    | `/health`                       | Liveness, no DB touch                                        |
| `GET`    | `/ready`                        | Readiness, checks DB and PostGIS                             |

### 11.2 The two endpoints that carry the demo

**`POST /projects/{id}/sites/validate`** lets the frontend check a polygon the moment the user finishes drawing, before they fill in the name field. Instant red highlight on conflict. Very small backend change, disproportionately good UX.

**`GET /sites/{id}/analytics`** returns everything the detail panel needs in one call:

```json
{
  "site_id": "…",
  "name": "Beed Parcel 12",
  "area_hectares": 4.32,
  "baseline_date": "2022-03-15",
  "metrics": [
    {
      "metric_id": "canopy_cover",
      "label": "Canopy Cover",
      "unit": "percent",
      "baseline": { "value": 8.2, "observed_on": "2022-03-15" },
      "latest": { "value": 19.7, "observed_on": "2024-12-01" },
      "delta_absolute": 11.5,
      "delta_percent": 140.2,
      "trend": "improving",
      "provenance": "satellite_derived",
      "source_name": "Sentinel-2 L2A",
      "confidence": 0.85,
      "observation_count": 34
    }
  ],
  "project": { "id": "…", "name": "Marathwada Agroforestry Phase 1" }
}
```

One request, everything the panel needs, no N+1 from the frontend. Compute the deltas in SQL with a window function rather than pulling every row into Python.

### 11.3 List response convention

Every list endpoint returns the same envelope. Consistency is a code quality signal.

```json
{
  "items": [ ... ],
  "total": 142,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

Except `/projects/{id}/sites` and `/map/sites`, which return a GeoJSON `FeatureCollection` because that is what Mapbox consumes directly. Note that exception explicitly in the README so it reads as a decision rather than an inconsistency.

---

## 12. Authentication and Security

JWT, as the brief requires. Keep it standard and boring.

### 12.1 Design

| Piece            | Choice                                                      | Reason                                                         |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Password hashing | Argon2id via`passlib`                                       | Current best practice. bcrypt is acceptable, plain SHA is not. |
| Access token     | JWT, 30 minute expiry, HS256                                | Short lived so a leaked token has a small blast radius         |
| Refresh token    | Opaque random string, 7 days, stored hashed in the database | Can be revoked, unlike a stateless JWT                         |
| Transport        | `Authorization: Bearer` header                              | Simple, works cleanly with a separate-origin SPA               |
| Token payload    | `sub`, `role`, `exp`, `iat`, `jti`                          | No PII beyond the user id                                      |

### 12.2 Why not httpOnly cookies

Cookies are more secure against XSS but require CSRF protection and careful `SameSite` configuration when the frontend is on Vercel and the API is on Render, which are different origins. For a single-admin dashboard, bearer tokens in memory (not localStorage) is the right complexity trade-off.

**Put that paragraph in your trade-offs section.** Knowing that cookies are more secure and choosing bearer tokens anyway for a stated reason scores better than either choice made silently.

### 12.3 The security basics to actually implement

- Rate limit `/auth/login` (`slowapi`, 5 attempts per minute per IP)
- Same generic error for wrong email and wrong password, so you do not leak which accounts exist
- Every project and site query scoped by `owner_id`, enforced in the service layer, not the router
- Pydantic validation on every input, `extra="forbid"` on write schemas
- CORS locked to the deployed frontend origin, not `*`
- No secrets in the repository. `.env.example` with empty values, real values in Render and Vercel dashboards.
- Rotate and never commit the Mapbox token; restrict it by URL in the Mapbox dashboard

### 12.4 A note on roles

The brief only needs an administrator. Include a `role` column with `admin` and `viewer` and enforce it in one dependency, but do not build a permissions matrix. Mention in the trade-offs that the column exists so that read-only stakeholder access is a small change later. That reads as forethought without scope creep.

---

## 13. Frontend Design

React 18 with TypeScript and Vite. Mapbox GL JS. Highcharts. That is what the brief specifies, so use exactly that.

### 13.1 Stack decisions

| Concern      | Choice                                                             | Reason                                                                                                                                |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Build        | Vite                                                               | Fast, simple, and the brief says React rather than Next.js. A SPA is the right shape for an authenticated dashboard with no SEO need. |
| Server state | TanStack Query                                                     | Caching, refetch, optimistic updates and loading states handled for you. Do not hand roll this with`useEffect`.                       |
| UI state     | Zustand                                                            | Small store for selected site, map viewport, drawer open. No Redux boilerplate for four values.                                       |
| Styling      | Tailwind plus a few shadcn primitives                              | Fast, consistent, and does not require designing a system from scratch                                                                |
| Types        | Generated from the backend OpenAPI schema with`openapi-typescript` | The frontend and backend cannot drift. This is a strong code quality signal and takes ten minutes to set up.                          |
| Forms        | react-hook-form plus zod                                           | Validation that mirrors the backend Pydantic schemas                                                                                  |

### 13.2 Screens

```mermaid
flowchart LR
    L["Login"] --> D["Dashboard<br/>project list + overview map"]
    D --> P["Project Detail<br/>map with sites, draw tool,<br/>rollup charts"]
    P --> S["Site Detail Drawer<br/>metric time series,<br/>baseline comparison,<br/>provenance badges"]
    P --> N["New Site Flow<br/>draw polygon, live validation,<br/>name and baseline date"]
```

Four screens. Do not build more.

### 13.3 The project detail screen, which is where the demo happens

```
+--------------------------------------------------------------+
|  TerraLedger      Marathwada Agroforestry Phase 1      [user] |
+-------------------+------------------------------------------+
|  SITES (12)       |                                          |
|                   |                                          |
|  [+ Draw new site]|          MAPBOX GL MAP                   |
|                   |     site polygons, colour coded          |
|  ■ Beed P12  4.3ha|     by metric performance                |
|  ■ Beed P14  2.8ha|                                          |
|  ■ Osm P03   6.1ha|     click a polygon to open the drawer   |
|  ...              |                                          |
|                   |                                          |
+-------------------+------------------------------------------+
|  PROJECT ROLLUP                                              |
|  Total area 48.2 ha | Sites 12 | Mean canopy gain +11.5pp    |
|  [Highcharts: project level metric trend, all sites stacked] |
+--------------------------------------------------------------+
```

### 13.4 The map layer, done properly

Colour polygons by performance rather than making them all the same blue. A data-driven Mapbox fill expression on a `delta_percent` property in the GeoJSON:

```ts
map.addLayer({
  id: "site-fill",
  type: "fill",
  source: "sites",
  paint: {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "delta_percent"],
      -20,
      "#b91c1c",
      0,
      "#fbbf24",
      50,
      "#65a30d",
      150,
      "#15803d",
    ],
    "fill-opacity": 0.55,
  },
});
```

Now the map itself is a visualisation rather than a location display. A reviewer sees at a glance which parcels are underperforming. That is Technical Execution and UI/UX in one change.

### 13.5 The draw flow with live validation

```mermaid
sequenceDiagram
    participant U as User
    participant D as MapboxDraw
    participant A as API
    U->>D: draws a polygon
    D->>A: POST /sites/validate with the GeoJSON
    A-->>D: 200 ok, area 4.32 ha
    Note over D: outline turns green,<br/>area shown live
    D->>U: form opens: name, baseline date, land cover
    U->>A: POST /sites
    A-->>U: 201 created
```

On a conflict, the response comes back 409, the drawn outline turns red, the conflicting polygon is highlighted, and a toast explains the double-counting reason. This flow takes maybe two hours and is the most memorable thirty seconds of your demo.

### 13.6 The things that make a dashboard feel finished

Cheap to build, disproportionately rewarded under UI/UX:

- Skeleton loaders, not spinners
- Empty states with a call to action, not a blank panel ("No sites yet. Draw your first one on the map.")
- Optimistic updates on create, with rollback on failure
- Keyboard escape to cancel drawing
- A map legend explaining the colour scale
- Toasts for every mutation, success and failure
- A responsive layout that does not break at 1280px

---

## 14. Data Visualization

Highcharts, since the brief names it. Four chart types, each doing a specific job.

### 14.1 The four charts

| Chart                    | Type                           | Purpose                                                                                         |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Metric time series**   | Line with a baseline plot line | The core view. One metric over time for one site, with the baseline as a dashed reference line. |
| **Baseline comparison**  | Grouped column                 | Baseline versus latest for every metric on a site, side by side                                 |
| **Project rollup**       | Stacked area or multi-line     | All sites in a project for one metric, showing portfolio-level trend                            |
| **Provenance breakdown** | Small donut                    | How much of this site's data is satellite versus field versus modelled                          |

The fourth one is unusual and worth including. It makes data quality visible, which is exactly what an MRV platform should do.

### 14.2 The time series chart, with the details that matter

```ts
const options: Highcharts.Options = {
  chart: { type: "line", height: 320 },
  title: { text: `${metric.label} over time` },
  xAxis: { type: "datetime" },
  yAxis: {
    title: { text: metric.unit },
    plotLines: [
      {
        value: baseline.value,
        color: "#94a3b8",
        dashStyle: "Dash",
        width: 1,
        label: {
          text: `Baseline ${baseline.value} ${metric.unit}`,
          align: "right",
        },
        zIndex: 3,
      },
    ],
  },
  tooltip: {
    // provenance in the tooltip. This is the MRV touch.
    pointFormatter() {
      const p = this as PointWithProvenance;
      return `<b>${p.y} ${metric.unit}</b><br/>
              Source: ${p.provenance.replace("_", " ")}<br/>
              ${p.source_name ?? ""}<br/>
              Confidence: ${(p.confidence * 100).toFixed(0)}%`;
    },
  },
  series: [
    {
      type: "line",
      name: metric.label,
      data: records.map((r) => ({
        x: new Date(r.observed_on).getTime(),
        y: Number(r.value),
        provenance: r.provenance,
        source_name: r.source_name,
        confidence: r.confidence,
        // modelled points drawn hollow so they are visually distinct
        marker: {
          fillColor: r.provenance === "modelled" ? "#fff" : undefined,
          lineWidth: r.provenance === "modelled" ? 2 : 0,
        },
      })),
    },
  ],
};
```

Two details doing real work there: the baseline plot line, and provenance surfaced in the tooltip with modelled points drawn as hollow markers. Anyone can render a line chart. Rendering one where you can immediately see which points are measured and which are inferred is a product decision.

### 14.3 Chart hygiene

- Always label axes with units
- Fixed colours per metric category so charts across screens are comparable
- Handle the single-data-point case without crashing
- Handle the zero-data case with an empty state, not an empty chart frame
- Do not animate on every re-render, it looks cheap and feels slow
- Export enabled, since MRV users genuinely want to download

---

## 15. Code Quality and Pre-commit Hooks

The brief calls this "a crucial requirement." It is the single most explicitly emphasised sentence in the document. Build it first, not last.

### 15.1 What runs where

```mermaid
flowchart LR
    W["git commit"] --> H1["Husky pre-commit"]
    H1 --> LS["lint-staged<br/>only touched files"]
    LS --> F1["Prettier<br/>ts, tsx, json, css, md"]
    LS --> F2["ESLint --fix<br/>ts, tsx"]
    LS --> F3["Ruff format + check<br/>py"]
    F1 --> OK{"all pass?"}
    F2 --> OK
    F3 --> OK
    OK -->|No| BLOCK["commit rejected"]
    OK -->|Yes| H2["Husky commit-msg"]
    H2 --> CM["commitlint<br/>conventional commits"]
    CM --> DONE["commit created"]
```

### 15.2 Configuration

Root `package.json`:

```json
{
  "name": "terraledger",
  "private": true,
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.1.6",
    "lint-staged": "^15.2.10",
    "prettier": "^3.3.3",
    "@commitlint/cli": "^19.5.0",
    "@commitlint/config-conventional": "^19.5.0"
  }
}
```

`.lintstagedrc.json`:

```json
{
  "frontend/**/*.{ts,tsx}": [
    "prettier --write",
    "eslint --fix --max-warnings=0"
  ],
  "**/*.{json,css,md,yml,yaml}": ["prettier --write"],
  "backend/**/*.py": ["ruff format", "ruff check --fix"]
}
```

`.husky/pre-commit`:

```bash
npx lint-staged
```

`.husky/commit-msg`:

```bash
npx --no -- commitlint --edit $1
```

`commitlint.config.js`:

```js
export default { extends: ["@commitlint/config-conventional"] };
```

### 15.3 Why conventional commits

The brief asks for "a logical commit history." Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`) enforced by a hook means your history is automatically readable and you can generate a changelog. It is also visible proof that the hooks do something, because a reviewer scrolling your commit list sees the consistency.

This matters more than it sounds. The reviewer will scroll your commits. A history of `update`, `fix stuff`, `final`, `final2` undoes a lot of good work elsewhere.

### 15.4 Python side configuration

`backend/pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "SIM", "RUF", "ASYNC"]
ignore = ["E501"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

Ruff replaces black, isort and flake8 in one fast tool. Say that in the trade-offs section; tooling consolidation is a real engineering decision.

### 15.5 Prove it works

Record a short GIF: make a badly formatted change, try to commit, watch it get rejected and auto-fixed. Embed it in the README under the code quality section.

Every candidate will claim they set up hooks. Almost none will show them working. This is thirty seconds of effort for a disproportionate trust gain.

---

## 16. Testing Strategy

You do not need 90 percent coverage. You need tests that clearly cover the things that would actually break.

### 16.1 What to test, in priority order

| Priority | Area                  | Why                                                                                                                                                |
| -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **Geometry service**  | Area computation, overlap detection, invalid polygon rejection, the sliver tolerance. This is your differentiator and it must be provably correct. |
| 2        | **Auth**              | Register, login, wrong password, expired token, accessing another user's project                                                                   |
| 3        | **Analytics service** | Baseline delta computation, trend direction, empty series, single point series                                                                     |
| 4        | **Site CRUD**         | Create with valid polygon, reject overlap with 409, cascade delete                                                                                 |
| 5        | Frontend components   | A few Vitest + Testing Library tests on the chart data transform and the draw flow state machine                                                   |

### 16.2 The geometry test that sells the whole submission

```python
@pytest.mark.asyncio
async def test_overlapping_site_is_rejected(db, project, existing_site):
    """Two sites claiming the same land would cause double counting."""
    overlapping = polygon_overlapping(existing_site.boundary, fraction=0.4)

    with pytest.raises(GeometryOverlapError) as exc:
        await site_service.create(db, project.id, SiteCreate(
            name="Overlapping Parcel", boundary=overlapping,
        ), actor=project.owner)

    assert exc.value.extra["conflicts"][0]["site_name"] == existing_site.name
    assert exc.value.extra["conflicts"][0]["overlap_hectares"] > 0


@pytest.mark.asyncio
async def test_adjacent_sites_sharing_a_border_are_allowed(db, project, existing_site):
    """Shared borders produce sliver intersections from float rounding.
    Below the 100 sq m tolerance these must not be treated as overlaps."""
    adjacent = polygon_sharing_edge(existing_site.boundary)
    site = await site_service.create(db, project.id, SiteCreate(
        name="Adjacent Parcel", boundary=adjacent,
    ), actor=project.owner)
    assert site.id is not None
```

That second test is the one that shows judgment. Anyone can reject overlaps. Knowing that shared borders are not overlaps, and testing for it, is the difference.

### 16.3 Test infrastructure

- `pytest-asyncio` with an async session fixture
- A real PostGIS container in CI via GitHub Actions `services`, not a mock. Spatial functions cannot be faked meaningfully.
- Transaction rollback per test for isolation, which is much faster than recreating the schema
- `factory-boy` or simple fixture helpers for building polygons

---

## 17. CI/CD Pipeline

The rubric has a dedicated line for this. Make it genuinely good.

### 17.1 The pipeline

```mermaid
flowchart TD
    PUSH["push or PR"] --> SPLIT{"which paths<br/>changed?"}

    SPLIT --> BE["Backend Job"]
    SPLIT --> FE["Frontend Job"]

    subgraph BEJ["Backend"]
        B1["ruff format --check"] --> B2["ruff check"]
        B2 --> B3["mypy --strict"]
        B3 --> B4["pytest<br/>against real PostGIS service"]
        B4 --> B5["coverage report"]
    end

    subgraph FEJ["Frontend"]
        F1["prettier --check"] --> F2["eslint --max-warnings=0"]
        F2 --> F3["tsc --noEmit"]
        F3 --> F4["vitest run"]
        F4 --> F5["vite build"]
    end

    BE --> BEJ
    FE --> FEJ

    BEJ --> GATE{"both green<br/>and branch is main?"}
    FEJ --> GATE

    GATE -->|No| STOP["stop"]
    GATE -->|Yes| DEP["Deploy Job"]

    subgraph DEPJ["Deploy"]
        D1["build and push Docker image"] --> D2["run alembic migrations"]
        D2 --> D3["deploy API to Render"]
        D3 --> D4["deploy SPA to Vercel"]
        D4 --> D5["smoke test /ready"]
        D5 --> D6{"healthy?"}
        D6 -->|No| RB["rollback to previous"]
        D6 -->|Yes| OKD["done"]
    end

    DEP --> DEPJ
```

### 17.2 `ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend:
    name: Backend
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: terraledger_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/terraledger_test
      JWT_SECRET: test-secret-not-used-in-production
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with: { enable-cache: true }
      - name: Install dependencies
        working-directory: backend
        run: uv sync --all-extras
      - name: Format check
        working-directory: backend
        run: uv run ruff format --check .
      - name: Lint
        working-directory: backend
        run: uv run ruff check .
      - name: Type check
        working-directory: backend
        run: uv run mypy app
      - name: Run migrations
        working-directory: backend
        run: uv run alembic upgrade head
      - name: Tests
        working-directory: backend
        run: uv run pytest -v --cov=app --cov-report=term-missing --cov-fail-under=70

  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: Install
        working-directory: frontend
        run: npm ci
      - name: Format check
        working-directory: frontend
        run: npx prettier --check "src/**/*.{ts,tsx,css}"
      - name: Lint
        working-directory: frontend
        run: npm run lint -- --max-warnings=0
      - name: Type check
        working-directory: frontend
        run: npx tsc --noEmit
      - name: Tests
        working-directory: frontend
        run: npm run test -- --run
      - name: Build
        working-directory: frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
          VITE_MAPBOX_TOKEN: ${{ secrets.MAPBOX_TOKEN }}
```

### 17.3 `deploy.yml`

```yaml
name: Deploy

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Render deploy
        run: |
          curl -fsS -X POST \
            "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": "do_not_clear"}'

      - name: Wait for API to become ready
        run: |
          for i in $(seq 1 30); do
            if curl -fsS "${{ vars.API_URL }}/ready" > /dev/null; then
              echo "API is ready"; exit 0
            fi
            echo "Attempt $i failed, retrying in 10s"; sleep 10
          done
          echo "API never became ready"; exit 1

      - name: Deploy frontend to Vercel
        run: |
          npm i -g vercel@latest
          vercel deploy --prod --yes --token=${{ secrets.VERCEL_TOKEN }}

      - name: Smoke test
        run: |
          curl -fsS "${{ vars.API_URL }}/health"
          curl -fsS "${{ vars.FRONTEND_URL }}" > /dev/null
```

### 17.4 Details that make the pipeline look professional

| Detail                                  | Why it matters                                                                         |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `concurrency` with `cancel-in-progress` | Stops wasting runner minutes on superseded pushes                                      |
| Real PostGIS service container          | Spatial tests run against real PostGIS, not a mock. Essential and easy.                |
| Dependency caching                      | Turns a four minute run into ninety seconds                                            |
| Separate backend and frontend jobs      | They run in parallel and failures are immediately attributable                         |
| Deploy gated on`workflow_run` success   | Deploys cannot happen on a red build, structurally                                     |
| Readiness poll before declaring success | Catches a container that starts and then crashes                                       |
| `environment: production`               | Enables GitHub deployment protection rules and shows the deploy history in the repo UI |
| Migrations run as part of deploy        | Schema and code never drift apart                                                      |

### 17.5 Branch protection

Set it on `main`, and mention it in your README:

- Require the CI check to pass before merge
- Require at least one approving review (even on a solo project, it forces you through PRs and your commit history shows it)
- No force push

A repository whose main branch is protected and whose history is a series of merged PRs reads completely differently from one with 60 direct commits to main.

---

## 18. Deployment

### 18.1 Topology

| Component | Platform                     | Notes                                                           |
| --------- | ---------------------------- | --------------------------------------------------------------- |
| Frontend  | Vercel                       | Static SPA, global CDN, preview deploy per PR                   |
| API       | Render Web Service           | Docker container, health check on`/ready`                       |
| Database  | Render PostgreSQL            | Enable PostGIS with`CREATE EXTENSION postgis;` on first connect |
| Secrets   | Render and Vercel dashboards | Never in the repository                                         |

Supabase is a reasonable alternative for the database since PostGIS is enabled by default, which removes one setup step. Either is defensible. Pick one and say why.

### 18.2 The free tier problem, and how to handle it well

Render's free tier spins containers down after inactivity, so the first request after a quiet period takes 30 to 50 seconds. A reviewer opening your live demo link will hit exactly this.

Three ways to handle it, in order of preference:

1. Use a paid instance for the review period if you can spare a few dollars. Cleanest solution.
2. Add a GitHub Actions cron job that pings `/health` every 10 minutes to keep it warm. Include the workflow in the repo, which doubles as evidence you anticipated the problem.
3. At minimum, put a line in your README and in the submission document: "The API is hosted on Render's free tier, so the first request after inactivity may take up to 50 seconds to cold start. Subsequent requests are fast."

Option 3 alone turns "this app is broken" into "this candidate anticipated the reviewer's experience."

### 18.3 Dockerfile

Multi-stage, non-root, small.

```dockerfile
FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 appuser
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser alembic alembic.ini ./
ENV PATH="/app/.venv/bin:$PATH"
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -fsS http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Non-root user, multi-stage build and a healthcheck. Three small things that signal you have deployed real services before.

---

## 19. Local Setup

The goal: a reviewer clones and is running in under five minutes with two commands. **Test this on a clean machine before you submit.** A broken setup is the fastest possible way to lose a reviewer.

```bash
git clone https://github.com/<you>/terraledger.git
cd terraledger

cp .env.example .env
# add your Mapbox token

make setup    # docker compose up, migrations, seed data, npm install, husky install
make dev      # API on :8000, frontend on :5173
```

Demo credentials in the README:

```
Email:    admin@terraledger.demo
Password: demo1234
```

Seed 3 projects, 30 sites and roughly 3 years of monthly monitoring records so the charts look real the moment the reviewer logs in. **An empty app is a failed demo.** This is the highest return-on-effort item in the entire build.

`.env.example`:

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://terraledger:terraledger@localhost:5432/terraledger
JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
VITE_MAPBOX_TOKEN=
```

---

## 20. Build Order

Build in this order so that whenever you stop, you have something that works end to end.

### Phase 1: Skeleton and the crucial requirement

1. Monorepo, docker-compose with PostGIS, Makefile
2. **Husky, lint-staged, prettier, ruff, commitlint.** Do this on day one, not day six, so your entire commit history is clean.
3. `ci.yml` with lint and typecheck only, so CI is green from the first commit
4. FastAPI skeleton with `/health` and `/ready`, Alembic baseline
5. Vite React skeleton, deployed to Vercel, hitting the health endpoint

**At the end of Phase 1 you have an empty app that is fully deployed with a working pipeline.** That is the correct order. Most people leave deployment to the last day and then discover CORS problems at 2am.

### Phase 2: Core domain

6. Users, auth, JWT, login screen
7. Projects CRUD plus dashboard list
8. Sites model with PostGIS geometry, area and centroid computation
9. **Overlap detection service, with tests.** This is your differentiator.

### Phase 3: Map and data

10. Mapbox map, render site polygons from GeoJSON
11. mapbox-gl-draw, the draw flow with live validation
12. `metric_definitions` and `monitoring_records`, bulk insert endpoint
13. Data pipeline plus seed script with 3 years of records

### Phase 4: Analytics and charts

14. Site analytics endpoint with baseline deltas
15. Highcharts time series with the baseline plot line and provenance tooltips
16. Baseline comparison and project rollup charts
17. Data-driven polygon colouring by performance

### Phase 5: Polish and proof

18. Empty states, skeletons, toasts, map legend
19. Audit log and activity feed
20. Full test suite, coverage gate in CI
21. README with architecture, schema, setup, CI/CD, trade-offs
22. GIF of the pre-commit hook blocking a commit
23. Keep-warm cron, final deploy, clean-machine test

### What to cut if time runs short

Audit log UI (keep the table and the write path). Project rollup chart. Provenance donut. Viewport-filtered map queries. Refresh token rotation. Viewer role enforcement.

### What never to cut

Working deployment. Working pre-commit hooks. Seed data. Overlap detection. The trade-offs section of the README.

---

## 21. Trade-offs and Decisions

The rubric scores this explicitly. Write it honestly. A candid decision log reads as far more senior than a feature list. Here is a filled-in version you can adapt.

### 21.1 Architecture

**SPA plus separate API instead of a full-stack framework.**
Chose a Vite SPA on a CDN with a FastAPI container behind it. The brief specifies React rather than Next.js, and this is an authenticated internal dashboard where SEO and server rendering add nothing. The cost is a CORS configuration and a separate deployment target. The benefit is that the frontend is a static artifact that costs nothing to serve and scales for free, while only the API needs a running server.

**Monorepo instead of two repositories.**
Pre-commit hooks need to cover both Python and TypeScript, and a single CI file is easier to reason about. The cost is slightly more complex path filtering in CI. For a project this size the simplicity wins.

**Service layer between routers and models.**
Adds a layer of indirection that a smaller app could skip. Justified here because the geometry logic (validation, overlap, area, centroid) is genuinely complex and needs to be unit testable without HTTP. Routers stay under fifteen lines each.

### 21.2 Data model

**Normalised time series instead of metric columns on the site row.**
The obvious design puts `carbon_stock` and `canopy_cover` directly on `sites`. That is simpler and faster to query for the current value. I chose a separate `monitoring_records` table because the core user story is performance over time, which needs history; because new metrics should be an INSERT rather than a migration; and because every observation needs provenance and a baseline flag that have nowhere to live on a wide row. The cost is one extra join and a slightly more complex analytics query.

**Denormalised `centroid` and `area_hectares` on `sites`.**
Both are derivable from `boundary`. I store them because the map list view needs a point per site on every request and recomputing `ST_Centroid` and `ST_Area` for every row is wasteful when they only change on boundary write. The cost is that they must be recomputed on every geometry update, which is handled in one place in the geometry service.

**Audit log as a single table with a JSONB diff.**
Not a full event-sourcing model. A single denormalised audit table covers the traceability requirement of an MRV system at a fraction of the complexity. It would not support rebuilding state from events, which is not needed here.

### 21.3 Geospatial

**Validation in both the application and the database.**
Shapely validates GeoJSON at the API boundary, and a `CHECK (ST_IsValid(boundary))` constraint backs it in the database. This is deliberate duplication. The application check gives a good error message, the database check guarantees the invariant even if a future code path forgets.

**A 100 square metre overlap tolerance.**
Two adjacent parcels sharing a border produce a tiny intersection from floating point rounding in coordinate transforms. Treating those as overlaps would make the app unusable for contiguous land. 100 square metres is a judgment call, roughly a 10m by 10m square, small enough to catch genuine double counting and large enough to ignore rounding artifacts. In production this should be configurable per project.

**EPSG:4326 storage with geography casts for measurement.**
Storing in 4326 keeps GeoJSON interchange simple. Casting to geography for area and distance is slightly slower than storing in a projected CRS, but avoids picking a projection that would be wrong for sites in different parts of the country.

### 21.4 Authentication

**Bearer tokens in memory rather than httpOnly cookies.**
Cookies are more resistant to XSS. I chose bearer tokens because the SPA and API are on different origins (Vercel and Render), which makes cookie configuration and CSRF protection noticeably more complex for a single-admin dashboard. Tokens are held in memory rather than localStorage, which limits XSS exposure to the current tab session. For a multi-tenant production system I would revisit this and move to httpOnly cookies with CSRF tokens.

**Opaque refresh tokens stored hashed, rather than JWT refresh tokens.**
A stateless JWT refresh token cannot be revoked. Storing an opaque token hashed in the database means a compromised session can be terminated. The cost is a database lookup on refresh, which happens rarely.

### 21.5 Data

**Hybrid real and synthetic data.**
Boundaries and NDVI are real. Carbon stock is modelled from canopy cover. Species and survival data are synthetic. Every record carries its provenance and this is surfaced in the UI. The alternative, all-synthetic data, would have been faster but would not have demonstrated handling of mixed-provenance data, which is the actual condition of every real MRV system.

### 21.6 Tooling

**Ruff instead of black plus isort plus flake8.**
One tool, one config, roughly an order of magnitude faster, and it covers formatting, import sorting and linting. The cost is a slightly smaller rule ecosystem than flake8 plugins.

**TanStack Query instead of hand-rolled fetching.**
Caching, background refetch, loading and error states, and optimistic updates are all things I would otherwise write badly with `useEffect`. The cost is a dependency and a mental model to learn.

**Types generated from the OpenAPI schema.**
The frontend types are generated from the backend's own schema rather than hand-written. This makes drift between frontend and backend structurally impossible. The cost is a generation step in the build.

### 21.7 What I deliberately did not build

| Not built                       | Why                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-tenancy and organisations | The brief specifies a single administrator role. The`role` column exists so read-only access is a small change later.                     |
| Real-time collaboration         | No requirement, and it would add websocket infrastructure for no user benefit here.                                                       |
| Full RBAC permissions matrix    | Two roles enforced by one dependency covers the stated need. A matrix would be speculative.                                               |
| File upload for shapefiles      | Nice to have, but polygon drawing is what the brief asks for.                                                                             |
| Server-side raster analysis     | Out of scope and genuinely hard. The data pipeline handles it offline instead.                                                            |
| Caching layer (Redis)           | Premature at this data volume. Postgres with proper indexes handles it comfortably. I would add it when the viewport query exceeds 100ms. |

### 21.8 What I would do next with more time

1. Move the data pipeline into a scheduled job so metrics refresh automatically rather than being seeded once
2. Add shapefile and KML import, since project developers already have their boundaries in those formats
3. Viewport-based map queries with geometry simplification at low zoom, for portfolios of thousands of sites
4. A verification workflow: mark a monitoring record as verified by a third party, with the verifier identity recorded
5. Time-partition `monitoring_records` once it passes a few million rows

---

## 22. Submission Checklist

Work through this the day before you submit, not the hour before.

### The repository

- [ ] Private repo, with access granted to all four Darukaa email addresses
- [ ] Clean commit history, conventional commits throughout, no `final2` commits
- [ ] `main` branch protected, work merged via PRs
- [ ] No secrets committed anywhere. Check with `git log -p | grep -i "key\|secret\|token"`.
- [ ] `.env.example` present with every variable, all values empty
- [ ] License file, since it costs nothing

### The application

- [ ] Live URL works from a fresh browser with no cache
- [ ] Demo credentials in the README and they actually work
- [ ] Seed data is present so nothing is empty on first login
- [ ] Cold start warning in the README if you are on a free tier
- [ ] Tested on a clean machine with only the two setup commands

### The README

- [ ] High-level architecture with a diagram
- [ ] Database schema with the reasoning, not just the DDL
- [ ] Local setup instructions, verified on a clean machine
- [ ] CI/CD explanation with the workflow file walked through
- [ ] Trade-offs section, written honestly
- [ ] GIF or screenshot of the pre-commit hook rejecting a commit
- [ ] Screenshots of the main screens, so a reviewer can see it without logging in
- [ ] The data sourcing note the brief asked for

### The Word document

- [ ] GitHub repository link
- [ ] Live demo URL
- [ ] Condensed README overview covering architecture, schema, setup and CI/CD
- [ ] Demo credentials
- [ ] Cold start note
- [ ] One line cross-referencing your AI Engineer submission, if you submit both

### The final pass

- [ ] Open the live URL on your phone. It does not need to be perfect on mobile, but it should not be broken.
- [ ] Click every button. Something is always broken.
- [ ] Draw a site that overlaps an existing one and confirm the error is clear and helpful.
- [ ] Read your own README start to finish as if you had never seen the project.

---

## Appendix: The 90 Second Demo Script

Reviewers do not explore. They click three things and form an opinion. Design that path deliberately, and put it at the top of your README so they follow it.

1. **Log in.** Dashboard loads with three real projects and a populated map. Not empty.
2. **Open a project.** Map fits to its sites. Polygons are colour coded by performance, so the underperforming parcels are immediately visible. Rollup stats across the top.
3. **Click a site.** Drawer opens with a canopy cover time series, baseline plot line, and hollow markers on the modelled points. Hover a point and the tooltip shows the source and confidence.
4. **Draw a new site overlapping an existing one.** It turns red instantly, with a message explaining the double-counting risk and naming the conflicting parcel.
5. **Draw one that does not overlap.** Turns green, shows the area live, form opens, site saves and appears on the map.

Step 4 is the moment that separates your submission from everything else in the pile. Make sure it is the first thing in the README, ideally as a GIF.

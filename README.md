# TerraLedger — Nature Intelligence & MRV Geospatial Platform

<div align="center">

[![CI Pipeline](https://github.com/TechWithAkash/TerraLedger/actions/workflows/ci.yml/badge.svg)](https://github.com/TechWithAkash/TerraLedger/actions)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688?logo=fastapi)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20PostGIS-336791?logo=postgresql)
![Mapbox](https://img.shields.io/badge/Mapping-Mapbox%20GL%20JS-blue?logo=mapbox)
![Highcharts](https://img.shields.io/badge/Analytics-Highcharts-purple?logo=highcharts)
![Code Style](https://img.shields.io/badge/Code%20Style-Ruff%20%7C%20Prettier-green)

**Full-Stack Geospatial Data Analytics Platform for Carbon and Biodiversity Monitoring, Reporting & Verification (MRV)**

Built specifically for the **Darukaa.Earth Full-Stack Developer Hackathon**.

[Live Frontend Demo](https://terra-ledger-sooty.vercel.app/) • [Backend API (Render)](https://terraledger-api.onrender.com) • [Interactive API Docs](https://terraledger-api.onrender.com/docs) • [GitHub Repository](https://github.com/TechWithAkash/TerraLedger)

</div>

---

## 📌 Submission Quick Reference & Live Links

| Resource                     | URL / Details                                                                                | Notes                                           |
| :--------------------------- | :------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **Live Frontend Demo**       | [https://terra-ledger-sooty.vercel.app/](https://terra-ledger-sooty.vercel.app/)             | Production Dashboard Deployed on Vercel         |
| **GitHub Repository**        | [https://github.com/TechWithAkash/TerraLedger](https://github.com/TechWithAkash/TerraLedger) | Public source code with full Git commit history |
| **Live Backend API**         | [https://terraledger-api.onrender.com](https://terraledger-api.onrender.com)                 | Deployed on Render (FastAPI + AsyncPG)          |
| **Interactive Swagger Docs** | [https://terraledger-api.onrender.com/docs](https://terraledger-api.onrender.com/docs)       | Test every endpoint directly in browser         |
| **API Health Endpoint**      | [https://terraledger-api.onrender.com/health](https://terraledger-api.onrender.com/health)   | Returns `{"status": "ok"}`                      |
| **Demo Reviewer Account**    | **Email:** `admin@darukaa.earth`<br/>**Password:** `demo1234`                                | Auto-filled with 1-click in the UI              |

> **Cold start note:** the API is hosted on Render's free tier, which spins the container down after inactivity. The first request after a quiet period can take 30-50 seconds to respond; every request after that is fast. If the live demo looks unresponsive on first load, that's why — give it a moment.

---

## 🌿 What is TerraLedger?

**TerraLedger** is a full-stack nature intelligence and MRV (Monitoring, Reporting, and Verification) dashboard designed for carbon project developers, ecological auditors, and registries.

It solves three critical challenges in nature-based carbon and biodiversity projects:

1. **Accurate Parcel Delineation:** Draw, digitize, and calculate geodesic areas (in hectares) directly on satellite/vector maps.
2. **Double-Counting Prevention (Core Rubric Differentiator):** Automatically prevents fraudulent or overlapping land registration using real-time spatial intersection calculations (`ST_Intersects`) with a 100 m² tolerance.
3. **Data Provenance & MRV Verification:** Interactive time-series tracking of key ecological indicators (Canopy Cover, NDVI, Carbon Stock, Soil Carbon, Species Richness) comparing current status against pre-restoration baselines with clear data origin markers (Satellite, Field Survey, Modelled).

---

## 🎨 Visual Identity & Design System

The platform strictly implements Darukaa's official branding and visual design tokens:

- **Primary Brand Nature Green:** `rgb(0, 146, 69)` / `#009245`
- **Deep Forest Dark:** `#0B1F16`
- **Neutral Background:** `#F9FAFB` and `#FFFFFF`
- **Typography:** **Manrope** for headings and interface copy, **JetBrains Mono** for numerical figures and coordinates.

---

## 🏛️ High-Level System Architecture

```mermaid
flowchart TB
    subgraph CLIENT["Frontend (Next.js 16 / React 19)"]
        UI["Darukaa Design System UI<br/>(Tailwind CSS + Lucide Icons)"]
        MAP["Interactive Geospatial Map<br/>(Mapbox GL JS + Mapbox Draw)"]
        CHART["MRV Time-Series Visualization<br/>(Highcharts + Baselines + Provenance)"]
    end

    subgraph API["Backend Service (Python FastAPI)"]
        AUTH["JWT Authentication<br/>(OAuth2 Bearer Tokens)"]
        PROJ["Project & Site Management<br/>(CRUD + GeoJSON FeatureCollections)"]
        GEOM["Spatial Validation Service<br/>(Shapely + PostGIS ST_Intersects)"]
        ANLY["MRV Analytics Engine<br/>(Delta calculations vs Baseline)"]
    end

    subgraph DB["Database Layer (PostgreSQL + PostGIS)"]
        T_USERS[("users")]
        T_PROJ[("projects")]
        T_SITES[("sites (GEOMETRY POLYGON 4326)")]
        T_METRICS[("metric_definitions")]
        T_RECORDS[("monitoring_records (Time-Series)")]
    end

    CLIENT -->|REST API + JSON / GeoJSON| API
    API -->|AsyncPG / SQLAlchemy 2.0| DB
```

---

## ✨ Key Features & Rubric Highlights

### 1. Interactive Geospatial Mapping (Mapbox GL JS)

- Visualizes verified carbon and biodiversity sites across Indian ecological regions (Sundarbans Mangroves, Western Ghats Reforestation, Marathwada Agroforestry).
- Polygon drawing tool with real-time geodesic area calculation using the WGS84 ellipsoid.
- Switchable basemap modes (High-definition vector terrain and OpenStreetMap raster fallback).

### 2. Double-Counting & Overlap Detection (Key Technical Differentiator)

- In carbon credit markets, registering overlapping boundaries creates fraudulent "double-counted" credits.
- TerraLedger executes spatial validation before saving parcels:
  - If an overlap exceeds the **100 m² (0.01 ha)** precision buffer, the system rejects the polygon with an `HTTP 409 Conflict`.
  - The UI displays an immediate red conflict alert showing the conflicting parcel name and exact overlapping hectares.

### 3. MRV Analytics with Provenance (Highcharts)

- 30-to-36 months of time-series observations tracking restoration progress.
- Visual **baseline reference line** showing initial degraded conditions.
- Rich tooltips indicating **Data Provenance**:
  - `satellite_derived` (Sentinel-2 L2A optical imagery)
  - `modelled` (Allometric carbon density models)
  - `field_survey` (On-ground botanical transects)
- Confidence scores (e.g., `85% confidence`) for complete auditability.

---

## 🗄️ Database Schema & Data Modeling

The relational database is built with **PostgreSQL** and the **PostGIS** spatial extension:

```mermaid
erDiagram
    users ||--o{ projects : "creates"
    projects ||--o{ sites : "contains"
    sites ||--o{ monitoring_records : "has observations"
    metric_definitions ||--o{ monitoring_records : "defines"

    users {
        UUID id PK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR full_name
        VARCHAR role
    }

    projects {
        UUID id PK
        UUID owner_id FK
        VARCHAR name
        VARCHAR project_type
        VARCHAR registry_standard
        VARCHAR country
        VARCHAR status
    }

    sites {
        UUID id PK
        UUID project_id FK
        VARCHAR name
        GEOMETRY boundary "POLYGON 4326"
        GEOMETRY centroid "POINT 4326"
        FLOAT area_hectares
        DATE baseline_date
        VARCHAR land_cover_type
    }

    metric_definitions {
        VARCHAR id PK
        VARCHAR label
        VARCHAR unit
        VARCHAR category
        BOOLEAN higher_is_better
    }

    monitoring_records {
        UUID id PK
        UUID site_id FK
        VARCHAR metric_id FK
        DATE observed_on
        FLOAT value
        VARCHAR provenance
        VARCHAR source_name
        FLOAT confidence
        BOOLEAN is_baseline
    }
```

---

## 🌍 Data Sourcing Strategy

The brief explicitly leaves dataset choice open and asks it to be documented — here's what's actually in the seed data (`backend/app/seed/seed_data.py`), honestly:

| Layer                 | Source                                                                                                                                                                            | Real or synthetic                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Site boundaries**   | Hand-placed polygons over real coordinates in the Sundarbans (West Bengal), Western Ghats, and Marathwada regions of India                                                        | Real coordinates, hand-digitized                                                                                           |
| **Monitoring values** | Generated with a logistic recovery curve (restoration effect saturates over ~30 months) plus a monsoon-seasonality sine term                                                      | **Synthetic** — not pulled from a live satellite or field-survey API                                                       |
| **Provenance labels** | Each record is tagged `satellite_derived` / `modelled` / `field_survey` with a realistic source name (e.g. "Sentinel-2 L2A", "Soil Core Sampling Batch 4") and a confidence score | Labels describe the _kind_ of source a real pipeline would use for that metric, not an actual API call made during seeding |

**Why synthetic instead of a live Sentinel-2/GBIF pull:** building a real satellite-ingestion pipeline was out of scope for the challenge timeframe. A defensible synthetic generator with realistic growth dynamics (logistic saturation, not a straight line — vegetation recovery genuinely plateaus) and seasonal variance was judged more valuable than spending the time budget on live API integration for a demo dataset. The provenance/confidence fields exist specifically so the UI can demonstrate how a real MRV system would surface data quality — the mechanism is real even though these particular values are generated, not measured.

---

## 🚀 Quick Start & Local Setup

### Option A: 1-Click Launch (Recommended)

Run the automated launch script from the repository root:

```bash
./run.sh
```

This script will automatically:

1. Verify/create the local PostgreSQL database `darukaa`.
2. Run database migrations and seed preloaded Indian projects with 3-year time-series.
3. Start the FastAPI backend on `http://localhost:8000`.
4. Launch the Next.js frontend on `http://localhost:3000`.

---

### Option B: Manual Setup

#### 1. Prerequisites

- **Python:** >= 3.11 with [`uv`](https://docs.astral.sh/uv/) (or standard `pip`)
- **Node.js:** >= 20.x and `npm`
- **PostgreSQL:** with PostGIS extension enabled

#### 2. Backend Setup

```bash
cd backend

# Install dependencies using uv
uv sync --all-groups

# Seed demo database (admin account + 3 projects + 4 parcels + 180 time-series points)
uv run python -m app.seed.seed_data

# Start development server
uv run uvicorn app.main:app --reload --port 8000
```

- Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

- Dashboard URL: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/darukaa
SECRET_KEY=darukaa_earth_nature_intelligence_secret_key_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=["http://localhost:3000","https://terra-ledger-sooty.vercel.app"]
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token_here
```

_(For production on Vercel, set `NEXT_PUBLIC_API_URL=https://terraledger-api.onrender.com/api/v1`)_

---

## 🧪 Testing & Code Quality Assurance

### Pre-Commit Hooks (Husky + lint-staged)

The repository enforces clean code on every single Git commit:

- **Python Formatting & Linting:** `ruff format` and `ruff check --fix`
- **Frontend Formatting:** `prettier --write`
- **Conventional Commits:** Enforced with `commitlint` (e.g., `feat:`, `fix:`, `chore:`)

### Automated Backend Tests (Pytest)

Run the comprehensive unit and integration test suite:

```bash
cd backend
uv run pytest -v
```

All 6 automated unit tests pass:

- Spatial polygon overlap detection tests
- Shapely geodesic area calculation tests
- JWT token encryption and password hashing tests
- Authentication login flow verification

---

## 🔄 CI/CD Pipeline

GitHub Actions workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Runs on every push and pull request to `main`, as two independent, parallel jobs:

```mermaid
flowchart LR
    PUSH["push / PR to main"] --> BE["Backend job"]
    PUSH --> FE["Frontend job"]

    subgraph BE["Backend Lint & Tests"]
        B1["uv sync"] --> B2["ruff format --check"]
        B2 --> B3["ruff check"]
        B3 --> B4["pytest -v"]
    end

    subgraph FE["Frontend Lint & Build"]
        F1["npm ci (root + frontend)"] --> F2["prettier --check"]
        F2 --> F3["next build"]
    end
```

| Job          | What it checks                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | Installs with `uv`, checks Ruff formatting, lints with Ruff, runs the Pytest suite (overlap detection, area calculation, auth flow)                                                                                                               |
| **Frontend** | Installs both the root and `frontend/` lockfiles (two are intentional — root covers Husky/lint-staged/commitlint tooling, `frontend/` covers the app itself), checks Prettier formatting, runs a full `next build` against the production API URL |

**Deployment is separate from CI and not gated by it directly** — Vercel and Render each auto-deploy on push to `main` via their own native GitHub integrations, independent of this workflow. CI's job here is to catch a broken build or a failing test _before_ that push reaches either platform; it isn't wired as a required check that blocks the push itself. A tighter setup would add branch protection requiring the CI check to pass before merge — noted as a next step in Trade-offs below rather than claimed as already in place.

---

## ⚖️ Trade-offs and Decisions

Honest trade-offs made building this, in the spirit of the brief's own scoring line for this:

**No Alembic migrations — `Base.metadata.create_all()` on startup instead.** Simpler to reason about within the challenge timeframe: no migration files to keep in sync, schema just gets created if missing. The real cost: no migration history, no rollback path, no safe way to alter a live table with existing data. For a project past the demo stage, this would need Alembic before the first schema change against real data.

**Bearer tokens in memory rather than httpOnly cookies.** The frontend (Vercel) and API (Render) are different origins, which makes cookie + CSRF configuration meaningfully more complex for a single-admin dashboard. Tokens held in memory (not `localStorage`) limit XSS exposure to the current tab session. A multi-tenant production system would move to httpOnly cookies with CSRF protection.

**CORS wide open (`allow_origins=["*"]`) rather than an explicit allowlist.** Chosen to avoid fighting CORS while both platforms' preview/production URLs were still being finalized (this project went through several `.vercel.app` domain reassignments during development). The cost is real: any origin can call the API. Worth tightening to the exact production frontend URL before this is anything beyond a graded demo.

**Free-tier hosting (Render + Vercel) over paid.** Free is the right call for a hackathon submission, but it comes with two real costs the reviewer should know about rather than discover: the API cold-starts after inactivity (~30-50s first request, noted above), and Render's free Postgres has a limited lifetime and can be suspended — both acceptable trade-offs for a graded demo, not for anything meant to stay always-on.

**Synthetic monitoring data with realistic provenance labels, not a live satellite pipeline.** Covered in detail in the Data Sourcing section above — the honest version is that the growth dynamics are modelled, not measured, and the README says so rather than letting the provenance labels imply otherwise.

---

## 👥 Reviewer Access & Visibility

This repository is **public**, allowing open and frictionless access for review, cloning, and verification by the Darukaa.Earth evaluation team:

- `ankita.dasgupta@darukaa.com`
- `harsh.kumar@darukaa.com`
- `utkarsh.gauniyal@darukaa.com`
- `guneet.mutreja@darukaa.com`

No private collaborator invitations or access approvals are required to inspect the codebase, run tests, or review deployment pipelines.

---

<div align="center">
  <sub>Developed by <b>Akash Vishwakarma</b> for the <b>Darukaa.Earth Full-Stack Hackathon</b>.</sub>
</div>

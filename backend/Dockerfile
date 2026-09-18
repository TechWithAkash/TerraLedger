FROM python:3.13-slim

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install python dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY app ./app

# Expose port (Render automatically provides $PORT)
EXPOSE 8000

ENV PATH="/app/.venv/bin:$PATH"

# Run migrations and start uvicorn
CMD ["sh", "-c", "uv run python -m app.seed.seed_data && uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

#!/usr/bin/env bash

# Darukaa.Earth Platform Launcher
# Starts both Backend (FastAPI :8000) and Frontend (Next.js :3000) seamlessly.

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  Darukaa.Earth — Nature Intelligence & MRV Platform  ${NC}"
echo -e "${GREEN}======================================================${NC}"

# 1. Ensure PostgreSQL database 'darukaa' exists
echo -e "\n${BLUE}[1/4] Checking PostgreSQL database 'darukaa'...${NC}"
if which psql > /dev/null 2>&1; then
  createdb -U postgres darukaa 2>/dev/null || createdb darukaa 2>/dev/null || true
fi

# 2. Seed database with Indian projects and monitoring time-series
echo -e "${BLUE}[2/4] Seeding initial portfolio data...${NC}"
cd "$BACKEND_DIR"
uv run python -m app.seed.seed_data

# 3. Start Backend in background
echo -e "\n${BLUE}[3/4] Launching FastAPI Backend on http://localhost:8000 ...${NC}"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 4. Start Frontend
echo -e "${BLUE}[4/4] Launching Next.js Frontend on http://localhost:3000 ...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down Darukaa.Earth services...${NC}"
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}  Application is Live!${NC}"
echo -e "  - Frontend URL:   ${BLUE}http://localhost:3000${NC}"
echo -e "  - Backend API:    ${BLUE}http://localhost:8000${NC}"
echo -e "  - Swagger Docs:   ${BLUE}http://localhost:8000/docs${NC}"
echo -e ""
echo -e "  ${YELLOW}Reviewer Credentials (1-click Auto-fill in UI):${NC}"
echo -e "  Email:    admin@darukaa.earth"
echo -e "  Password: demo1234"
echo -e "${GREEN}======================================================${NC}"
echo -e "Press [Ctrl+C] to stop both servers.\n"

# Wait for background processes
wait

#!/usr/bin/env bash
# Start the Helix backend (FastAPI) and frontend (Next.js) together for local dev.
set -euo pipefail
cd "$(dirname "$0")"

# --- Backend ---
if [ ! -d backend/.venv ]; then
  echo "Creating Python virtualenv..."
  python3 -m venv backend/.venv
  backend/.venv/bin/python -m pip install -q --upgrade pip
  backend/.venv/bin/python -m pip install -q -r backend/requirements.txt
fi

echo "Starting backend on http://127.0.0.1:8000 ..."
(cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

# --- Frontend ---
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

echo "Starting frontend on http://127.0.0.1:3000 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' EXIT
wait

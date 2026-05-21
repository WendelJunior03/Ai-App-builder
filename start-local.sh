#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="${ROOT_DIR}/.workspace"

cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in $(jobs -p); do kill "$pid" 2>/dev/null; done
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "=== AI App Builder (Local Mode) ==="

# Clean up stale ports
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true

# Step 1: Setup workspace with template
echo "[1/5] Setting up workspace..."
mkdir -p "$WORKSPACE_DIR"
if [ ! -f "$WORKSPACE_DIR/package.json" ]; then
  cp -r "$ROOT_DIR/templates/react-shadcn/"* "$WORKSPACE_DIR/"
  cp "$ROOT_DIR/templates/react-shadcn/".* "$WORKSPACE_DIR/" 2>/dev/null || true
fi
cd "$WORKSPACE_DIR" && npm install --silent

# Step 2: Ensure server deps
echo "[2/5] Checking server dependencies..."
cd "$ROOT_DIR/server" && npm install --silent

# Step 3: Ensure web is built
echo "[3/5] Building frontend..."
cd "$ROOT_DIR/web"
if [ ! -d "node_modules" ]; then npm install --silent; fi
npm run build --silent

# Step 4: Start services
echo "[4/5] Starting services..."
export WORKSPACE_DIR="$WORKSPACE_DIR"

# Vite preview (template workspace)
cd "$WORKSPACE_DIR"
npx vite --host 0.0.0.0 --port 5173 --strictPort &
sleep 3

# Hono backend
cd "$ROOT_DIR/server"
npx tsx src/index.ts &
sleep 2

echo ""
echo "[5/5] All services started!"
echo ""
echo "  API + Frontend: http://localhost:3000"
echo "  Preview (app):  http://localhost:5173"
echo ""
echo "Open http://localhost:3000 in your browser."
echo "Press Ctrl+C to stop all services."
echo ""

wait

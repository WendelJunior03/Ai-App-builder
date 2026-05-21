#!/bin/sh

WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
mkdir -p "$WORKSPACE_DIR" 2>/dev/null || true

# Initialize workspace from template if empty
if [ -z "$(ls -A "$WORKSPACE_DIR" 2>/dev/null)" ]; then
  echo "Initializing workspace with template..."
  cp -r /templates/react-shadcn/* "$WORKSPACE_DIR/" 2>/dev/null || true
  cp /templates/react-shadcn/.* "$WORKSPACE_DIR/" 2>/dev/null || true
fi

# Always ensure workspace dependencies are installed
if [ -f "$WORKSPACE_DIR/package.json" ]; then
  echo "Installing workspace dependencies..."
  cd "$WORKSPACE_DIR" && npm install --silent 2>/dev/null || echo "npm install skipped"
fi

# Install approval plugin for opencode
OPCODE_PLUGIN_DIR="${HOME}/.opencode/plugins"
mkdir -p "$OPCODE_PLUGIN_DIR" 2>/dev/null || true
if [ -d "/plugins/approval-plugin" ]; then
  # Remove any stale symlink first
  rm -f "$OPCODE_PLUGIN_DIR/approval-plugin" 2>/dev/null || true
  echo "Installing approval plugin..."
  ln -sf /plugins/approval-plugin "$OPCODE_PLUGIN_DIR/approval-plugin" 2>/dev/null || true
fi

# Start Vite preview server using local binary
echo "Starting Vite preview..."
cd "$WORKSPACE_DIR"
if [ -f "./node_modules/.bin/vite" ]; then
  ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 &
else
  npx vite --host 0.0.0.0 --port 5173 &
fi
VITE_PID=$!

# Start our Hono server
cd /app/server
echo "Starting API server..."
npx tsx src/index.ts &
SERVER_PID=$!

# Start opencode serve for web UI
echo "Starting Opencode serve on port 4096..."
opencode serve --hostname 0.0.0.0 --port 4096 &
OPENCODE_PID=$!

echo ""
echo "All services started!"
echo "  API Server: http://0.0.0.0:${PORT:-3000}"
echo "  Opencode UI: http://0.0.0.0:4096"
echo "  Preview: http://0.0.0.0:5173"
echo ""

# Wait for any process to exit
wait

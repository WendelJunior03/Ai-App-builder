FROM node:20-alpine

# Install opencode CLI
RUN npm install -g opencode-ai --ignore-scripts 2>/dev/null; npm install -g opencode-ai 2>&1 || true

# Create app directory
WORKDIR /app/server

# Copy server package.json and install deps
COPY server/package.json /app/server/package.json
RUN npm install

# Copy entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000 4096 5173

ENTRYPOINT ["/entrypoint.sh"]

# syntax=docker/dockerfile:1.7
# ProxyLab Dockerfile — works for HuggingFace Spaces, Render, and any container host.
#
# Build:
#   docker build -t proxylab .
# Run:
#   docker run -p 3000:3000 -e DATABASE_URL=file:/data/proxies.db -v proxylab-data:/data proxylab
#
# Platform notes:
#   - HuggingFace Spaces: read-only filesystem except /data. Set DATABASE_URL=file:/data/proxies.db.
#   - Render: mount a Disk at /var/data. Set DATABASE_URL=file:/var/data/proxies.db.
#   - The container auto-runs `prisma db push` on startup to create/migrate the SQLite schema.

# ---- Builder stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for sharp / socks
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy lockfile first for better layer caching
COPY package.json bun.lock* yarn.lock* package-lock.json* ./
COPY prisma ./prisma

# Install dependencies (use npm for max compatibility across hosts)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Build Next.js (produces .next/standalone)
# Also runs `prisma generate` via postinstall hook
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runner stage ----
FROM node:20-slim AS runner

WORKDIR /app

# Install openssl (needed by Prisma SQLite) and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl curl \
    && rm -rf /var/lib/apt/lists/*

# Create data directory (HuggingFace mounts /data, Render mounts /var/data)
RUN mkdir -p /data /var/data

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and CLI for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Default env — can be overridden by the host platform
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
# Default DB path — points to /data which is persistent on HuggingFace
# Override with -e DATABASE_URL=file:/var/data/proxies.db on Render
ENV DATABASE_URL=file:/data/proxies.db

# HuggingFace Spaces runs the container as user "user" (uid 1000) with home /home/user
# Pre-create /data and /var/data and chown them so the runtime user can write
RUN chown -R 1000:1000 /data /var/data /app 2>/dev/null || true

# Healthcheck — hit the lightweight /healthz endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/healthz || exit 1

EXPOSE 3000

# Entrypoint: run prisma db push to create/migrate the SQLite schema, then start the server
# This ensures the DB exists before the app tries to read/write
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node server.js"]

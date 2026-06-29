# HuggingFace Space Dockerfile — pulls prebuilt image from GHCR
#
# This file is intended to be uploaded as the Dockerfile in your HuggingFace Space.
# It does NOT build anything — it just pulls the prebuilt image from GitHub Container Registry.
# This makes HuggingFace deployments fast (seconds to pull, no build step).
#
# Supports two modes:
#   1. WITH Persistent Storage (recommended): DATABASE_URL=file:/data/proxies.db
#      - Data survives Space restarts
#      - Requires paid Persistent Storage (~$5/month for 20GB)
#   2. WITHOUT Persistent Storage (free): DATABASE_URL=file:/tmp/proxies.db
#      - Data is LOST on every Space restart/redeploy
#      - User must trigger a new test after each restart to repopulate /api/latest/txt
#      - App itself still works perfectly (just no history)

FROM ghcr.io/zhu748/youhua:latest

# HuggingFace runs containers as user 1000 — make sure /data is writable
# (The base image already handles this, but we repeat for clarity)
RUN mkdir -p /data /var/data /tmp && \
    chown -R 1000:1000 /data /var/data /tmp 2>/dev/null || true

# HuggingFace Spaces expect the app to listen on $PORT (default 7860)
# Our image listens on 3000 — we override via env to use 7860
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

# ┌─────────────────────────────────────────────────────────────────────────┐
# │  CHOOSE YOUR DATABASE MODE BELOW (uncomment ONE of the two options)     │
# └─────────────────────────────────────────────────────────────────────────┘

# Option A: WITH Persistent Storage (recommended if you paid for it)
# Requires Persistent Storage enabled on the Space (Settings → Persistent storage)
ENV DATABASE_URL=file:/data/proxies.db

# Option B: WITHOUT Persistent Storage (free tier — data lost on restart)
# To use this, comment out the line above and uncomment the line below:
# ENV DATABASE_URL=file:/tmp/proxies.db

EXPOSE 7860

# The base image's CMD already starts the server, but we override to ensure prisma db push runs first
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node server.js"]

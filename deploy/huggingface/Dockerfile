# HuggingFace Space Dockerfile — just pulls the prebuilt image from GHCR
#
# This file is intended to be used as the Dockerfile in your HuggingFace Space.
# It does NOT build anything — it just pulls the prebuilt image from GitHub Container Registry.
# This makes HuggingFace deployments fast (a few seconds to pull, no build step).
#
# Usage:
#   1. Make sure the GitHub Action has built and pushed the image (see .github/workflows/docker-publish.yml)
#   2. In HuggingFace Space, upload this file as the Dockerfile (replace any existing one)
#   3. Set environment variable DATABASE_URL=file:/data/proxies.db in Space Settings
#   4. That's it! HuggingFace will pull and run the image.
#
# To update: push to GitHub → GitHub Action rebuilds → bump the tag below → HF auto-redownloads

FROM ghcr.io/zhu748/youhua:latest

# HuggingFace runs containers as user 1000 — make sure /data is writable
# (The base image already handles this, but we repeat for clarity)
RUN mkdir -p /data /var/data && \
    chown -R 1000:1000 /data /var/data 2>/dev/null || true

# HuggingFace Spaces expect the app to listen on $PORT (default 7860)
# Our image listens on 3000 — we override via env to use 7860
ENV PORT=7860
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/proxies.db

EXPOSE 7860

# The base image's CMD already starts the server, but we override to ensure prisma db push runs first
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node server.js"]

#!/bin/sh
set -e

echo "[API Entrypoint] Starting JKS-IT-Hub API..."

# Run database migrations if DATABASE_URL is available
if [ -n "$DATABASE_URL" ]; then
    echo "[API Entrypoint] Applying Prisma database migrations..."
    pnpm --filter api exec prisma migrate deploy
    echo "[API Entrypoint] Database migrations applied successfully."
else
    echo "[API Entrypoint] WARNING: DATABASE_URL not set. Skipping migrations."
fi

# Execute the main command passed to the container
exec "$@"

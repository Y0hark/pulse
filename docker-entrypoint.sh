#!/bin/sh
set -e

echo "Applying database migrations..."
migrate -path db/migrations -database "$DATABASE_URL" up

echo "Starting Pulse..."
exec node dist/server.js

#!/bin/sh
set -eu

# Use first argument, or SERVICE env var, or default to "api"
if [ -n "${1:-}" ]; then
  SERVICE="$1"
elif [ -n "${SERVICE:-}" ]; then
  SERVICE="$SERVICE"
else
  SERVICE="api"
fi

# Convert to lowercase
SERVICE=$(echo "$SERVICE" | tr 'A-Z' 'a-z')

case "$SERVICE" in
  api)
    echo "Starting API server..."
    exec node dist/main.js
    ;;
  migrations|migrate)
    echo "Running database migrations..."
    exec npx prisma migrate deploy --schema=/app/apps/api/prisma/schema.prisma
    ;;
  *)
    # Allow running arbitrary commands for debugging/one-off tasks
    exec "$@"
    ;;
esac

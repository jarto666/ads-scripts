#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE="${1:-${SERVICE:-api}}"
SERVICE="$(echo "$SERVICE" | tr '[:upper:]' '[:lower:]')"

case "$SERVICE" in
  api)
    echo "Starting API server..."
    exec node dist/main.js
    ;;
  migrations|migrate)
    echo "Running database migrations..."
    exec npx prisma migrate deploy
    ;;
  *)
    # Allow running arbitrary commands for debugging/one-off tasks
    exec "$@"
    ;;
esac

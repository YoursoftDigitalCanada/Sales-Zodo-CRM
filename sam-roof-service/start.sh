#!/bin/bash
# SAM Roof Segmentation Service – launcher
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment if present
if [ -d "venv" ]; then
    source venv/bin/activate
fi

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-5002}"
export DEVICE="${DEVICE:-cpu}"

echo "🚀 Starting SAM Roof Segmentation Service on ${HOST}:${PORT} (${DEVICE})"

exec gunicorn \
    --bind "${HOST}:${PORT}" \
    --workers 1 \
    --threads 2 \
    --timeout 120 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    "app:app"

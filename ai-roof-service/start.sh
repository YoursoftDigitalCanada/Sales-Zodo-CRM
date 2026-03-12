#!/usr/bin/env bash
# ============================================================================
# AI Roof Service — Startup Script
# ============================================================================
#
# Usage:
#   ./start.sh             # Start with Flask dev server
#   ./start.sh production  # Start with gunicorn
#   ./start.sh docker      # Build and start with Docker
#
# Before running:
#   1. Install Python 3.8+ and pip
#   2. pip install -r requirements.txt
#   3. Download checkpoints:
#      https://drive.google.com/drive/folders/1DMv5N5BE8Zcp8gLNU24Ylr9jZSnLxp9V
#      Extract to: heat-model/2.- TRAINING-TESTING/heat-master/checkpoints/
#   4. Compile deformable attention ops (GPU only):
#      cd heat-model/2.- TRAINING-TESTING/heat-master/models/ops && sh make.sh
#
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-dev}"

export PORT="${PORT:-5001}"
export HOST="${HOST:-0.0.0.0}"
export HEAT_IMAGE_SIZE="${HEAT_IMAGE_SIZE:-256}"

echo "═══════════════════════════════════════════════"
echo "  AI Roof Service — HEAT Plane Extraction"
echo "═══════════════════════════════════════════════"
echo "  Mode:       $MODE"
echo "  Port:       $PORT"
echo "  Image Size: $HEAT_IMAGE_SIZE"
echo "═══════════════════════════════════════════════"

case "$MODE" in
  dev)
    echo "Starting Flask dev server..."
    python api/server.py
    ;;
  production)
    echo "Starting gunicorn production server..."
    # Preload to load model once, then serve
    exec gunicorn \
      --bind "${HOST}:${PORT}" \
      --workers 1 \
      --threads 2 \
      --timeout 120 \
      --preload \
      --access-logfile - \
      --error-logfile - \
      "api.server:app"
    ;;
  docker)
    echo "Building and starting Docker container..."
    docker-compose up --build -d
    echo "Container started. Check logs: docker-compose logs -f"
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [dev|production|docker]"
    exit 1
    ;;
esac

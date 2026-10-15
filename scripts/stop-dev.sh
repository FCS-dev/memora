#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "==> Deteniendo contenedor PostgreSQL..."
docker compose down

echo "==> Deteniendo procesos de desarrollo..."
pkill -f "memora-backend-.*\.jar" 2>/dev/null || true
pkill -f "frontend/node_modules/.bin/vite" 2>/dev/null || true
pkill -f "npm exec vite" 2>/dev/null || true
pkill -f "sh -c vite" 2>/dev/null || true

echo "==> Entorno detenido."

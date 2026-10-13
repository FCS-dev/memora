#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "==> Deteniendo contenedor PostgreSQL..."
docker compose down

echo "==> Deteniendo procesos de desarrollo..."
pkill -f "java -jar.*memora-backend" 2>/dev/null || true
pkill -f "npx vite" 2>/dev/null || true

echo "==> Entorno detenido."

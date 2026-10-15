#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RUN_DB=true
BUILD_BACKEND=true
RUN_BACKEND=true
RUN_FRONTEND=true
WAIT_FOR_BACKEND=true

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$port" 2>/dev/null | grep -q LISTEN
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && { exec 3>&- 3<&-; return 0; } || return 1
  fi
}

usage() {
  cat <<EOF
Uso: $(basename "$0") [OPCIONES]

Levanta el entorno de desarrollo de Memora.

Opciones:
  -b, --backend-only    Solo backend y base de datos.
  -f, --frontend-only   Solo frontend (asume backend ya corriendo).
      --no-build        No compilar el backend (usa el jar existente).
      --no-db           No levantar PostgreSQL con Docker.
      --no-wait         No esperar a que el backend responda.
  -h, --help            Muestra esta ayuda.

Ejemplos:
  $(basename "$0")              # Todo: DB, backend y frontend
  $(basename "$0") -b           # Solo DB y backend
  $(basename "$0") -f           # Solo frontend
  $(basename "$0") --no-build   # Usa target/*.jar sin recompilar
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--backend-only) RUN_FRONTEND=false; shift ;;
    -f|--frontend-only) RUN_DB=false; RUN_BACKEND=false; shift ;;
    --no-build) BUILD_BACKEND=false; shift ;;
    --no-db) RUN_DB=false; shift ;;
    --no-wait) WAIT_FOR_BACKEND=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; usage; exit 1 ;;
  esac
done

cd "$PROJECT_DIR"

BACKEND_PID=""
FRONTEND_PID=""
CLEANUP_DONE=false

cleanup() {
  if [[ "$CLEANUP_DONE" == true ]]; then
    return 0
  fi
  CLEANUP_DONE=true

  if [[ -n "$FRONTEND_PID" || -n "$BACKEND_PID" ]]; then
    echo ""
    echo "==> Deteniendo servicios..."

    if [[ -n "$FRONTEND_PID" ]]; then
      pkill -P "$FRONTEND_PID" 2>/dev/null || true
      kill "$FRONTEND_PID" 2>/dev/null || true
      wait "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [[ -n "$BACKEND_PID" ]]; then
      kill "$BACKEND_PID" 2>/dev/null || true
      wait "$BACKEND_PID" 2>/dev/null || true
    fi

    echo "==> Servicios detenidos."
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ "$RUN_DB" == true ]]; then
  echo "==> Levantando PostgreSQL..."
  docker compose up -d
  echo "==> PostgreSQL listo."
fi

if [[ "$RUN_BACKEND" == true ]]; then
  if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    echo "ERROR: No se encontró .env en $PROJECT_DIR" >&2
    exit 1
  fi

  echo "==> Cargando variables de entorno..."
  set -a
  # shellcheck source=/dev/null
  source "$PROJECT_DIR/.env"
  set +a

  cd "$PROJECT_DIR/backend"

  if [[ "$BUILD_BACKEND" == true ]]; then
    echo "==> Compilando backend..."
    mvn clean package -DskipTests
  fi

  JAR_FILE=$(ls -t target/memora-backend-*.jar 2>/dev/null | head -n1)
  if [[ -z "$JAR_FILE" ]]; then
    echo "ERROR: No se encontró el jar del backend. Compila primero o quita --no-build." >&2
    exit 1
  fi

  SERVER_PORT="${SERVER_PORT:-8080}"
  if port_in_use "$SERVER_PORT"; then
    echo "ERROR: el puerto $SERVER_PORT ya está en uso (¿hay otra instancia corriendo?)." >&2
    echo "       Ejecuta scripts/stop-dev.sh y vuelve a intentar." >&2
    exit 1
  fi

  echo "==> Iniciando backend desde $JAR_FILE..."
  java -jar "$JAR_FILE" &
  BACKEND_PID=$!

  cd "$PROJECT_DIR"

  if [[ "$WAIT_FOR_BACKEND" == true ]]; then
    SERVER_PORT="${SERVER_PORT:-8080}"
    echo "==> Esperando backend en http://localhost:$SERVER_PORT ..."
    for _ in $(seq 1 60); do
      if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "ERROR: el backend terminó durante el arranque. Revisa el log anterior." >&2
        exit 1
      fi
      if curl -fsS "http://localhost:$SERVER_PORT/v3/api-docs" >/dev/null 2>&1; then
        echo "==> Backend responde."
        break
      fi
      sleep 1
    done
  fi
fi

if [[ "$RUN_FRONTEND" == true ]]; then
  cd "$PROJECT_DIR/frontend"
  echo "==> Iniciando frontend..."
  npx vite &
  FRONTEND_PID=$!
  cd "$PROJECT_DIR"
fi

echo ""
echo "==> Entorno de desarrollo activo."
if [[ "$RUN_BACKEND" == true ]]; then
  echo "    Backend:   http://localhost:${SERVER_PORT:-8080}"
  echo "    OpenAPI:   http://localhost:${SERVER_PORT:-8080}/swagger-ui/index.html"
fi
if [[ "$RUN_FRONTEND" == true ]]; then
  echo "    Frontend:  http://localhost:5173"
fi
echo "    Presiona Ctrl+C para detener."
echo ""

wait

#!/usr/bin/env bash
# Install Docker Engine (if missing) and pre-pull the slim local-Supabase images
# so they land in the Cloud Environment snapshot. Do not leave containers running;
# start-local-supabase.sh brings the stack up on every boot.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

if ! command -v docker >/dev/null 2>&1; then
  echo "install-docker: installing docker.io"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io
else
  echo "install-docker: docker already present ($(docker --version))"
fi

if [ -n "${USER:-}" ]; then
  sudo usermod -aG docker "$USER" 2>/dev/null || true
fi

ensure_dockerd

echo "install-docker: pulling ${PG_IMAGE}"
docker_cmd pull "$PG_IMAGE"
echo "install-docker: pulling ${PGRST_IMAGE}"
docker_cmd pull "$PGRST_IMAGE"

echo "install-docker: images ready"
docker_cmd images --format '{{.Repository}}:{{.Tag}}' | grep -E 'supabase/(postgres|postgrest)' || true

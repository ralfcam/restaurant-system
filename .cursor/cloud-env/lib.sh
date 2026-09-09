# Shared helpers for Cloud Agent local-Supabase bootstrap.
# Sourced by install-docker.sh and start-local-supabase.sh.

# Official local-demo JWT secret + keys (same as `npx supabase status`).
# Public demo material — never point a hosted project at these.
export PG_IMAGE="${PG_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.167}"
export PGRST_IMAGE="${PGRST_IMAGE:-public.ecr.aws/supabase/postgrest:v16.2}"
export PG_CONTAINER="${PG_CONTAINER:-sb-pg-test}"
export PGRST_CONTAINER="${PGRST_CONTAINER:-sb-rest}"
export PG_HOST_PORT="${PG_HOST_PORT:-54322}"
export PGRST_HOST_PORT="${PGRST_HOST_PORT:-54323}"
export API_PROXY_PORT="${API_PROXY_PORT:-54321}"
export JWT_SECRET="${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
export ANON_KEY="${ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
export SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"
export RUNTIME_ENV_FILE="${RUNTIME_ENV_FILE:-/tmp/local-supabase.env}"

docker_ok() {
  docker info >/dev/null 2>&1
}

sudo_docker_ok() {
  sudo docker info >/dev/null 2>&1
}

docker_cmd() {
  if docker_ok; then
    docker "$@"
  elif sudo_docker_ok; then
    sudo docker "$@"
  else
    echo "docker_cmd: docker engine is not reachable" >&2
    return 1
  fi
}

ensure_dockerd() {
  if docker_ok || sudo_docker_ok; then
    return 0
  fi
  if ! command -v dockerd >/dev/null 2>&1 && ! sudo command -v dockerd >/dev/null 2>&1; then
    echo "ensure_dockerd: dockerd is not installed" >&2
    return 1
  fi
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    sudo rm -f /var/run/docker.pid
    # Nested Cloud Agent VM: no systemd. iptables=true is required for published ports.
    sudo dockerd --host=unix:///var/run/docker.sock --iptables=true >/tmp/dockerd.log 2>&1 &
  fi
  local i
  for i in $(seq 1 40); do
    if docker_ok || sudo_docker_ok; then
      return 0
    fi
    sleep 0.5
  done
  echo "ensure_dockerd: timed out waiting for docker.sock" >&2
  tail -n 40 /tmp/dockerd.log >&2 || true
  return 1
}

write_runtime_env() {
  local dest="$1"
  cat >"$dest" <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${API_PROXY_PORT}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
RESTAURANT_INTEGRATION_STRICT=true
EOF
}

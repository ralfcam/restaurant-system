#!/usr/bin/env bash
# Idempotent Cloud Agent start: dockerd + slim local Supabase (Postgres +
# PostgREST + /rest/v1 proxy on :54321). Official `npx supabase start` hangs
# on Realtime Elixir migrate in this nested-Docker VM; this is the stack that
# actually reaches READY. Confirms readiness, then returns.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

BASELINE_SQL="${REPO_ROOT}/supabase/migrations/00000000000000_baseline.sql"
SEED_SQL="${REPO_ROOT}/supabase/seed.sql"
PROXY_JS="${SCRIPT_DIR}/rest-v1-proxy.mjs"
STUB_SQL="${SCRIPT_DIR}/storage-stub.sql"
PROXY_PID_FILE="${PROXY_PID_FILE:-/tmp/rest-v1-proxy.pid}"
PROXY_LOG="${PROXY_LOG:-/tmp/rest-v1-proxy.log}"

psql_admin() {
  docker_cmd exec -i "$PG_CONTAINER" psql -U supabase_admin -d postgres "$@"
}

wait_for_postgres() {
  local i
  for i in $(seq 1 60); do
    if docker_cmd exec "$PG_CONTAINER" pg_isready -U supabase_admin -d postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "start-local-supabase: postgres did not become ready" >&2
  docker_cmd logs --tail 40 "$PG_CONTAINER" >&2 || true
  return 1
}

ensure_postgres() {
  if docker_cmd inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -qx true; then
    echo "start-local-supabase: ${PG_CONTAINER} already running"
  else
    if docker_cmd inspect "$PG_CONTAINER" >/dev/null 2>&1; then
      echo "start-local-supabase: starting existing ${PG_CONTAINER}"
      docker_cmd start "$PG_CONTAINER" >/dev/null
    else
      echo "start-local-supabase: creating ${PG_CONTAINER} from ${PG_IMAGE}"
      docker_cmd run -d --name "$PG_CONTAINER" \
        -p "${PG_HOST_PORT}:5432" \
        "$PG_IMAGE" >/dev/null
    fi
  fi
  wait_for_postgres
  # authenticator is a reserved role on this image; alter as supabase_admin.
  psql_admin -v ON_ERROR_STOP=1 -c "ALTER USER authenticator WITH PASSWORD 'postgres';" >/dev/null
}

schema_present() {
  local found
  found="$(psql_admin -tAc "SELECT to_regclass('public.restaurant_settings') IS NOT NULL;" | tr -d '[:space:]')"
  [ "$found" = "t" ]
}

apply_schema() {
  if schema_present; then
    echo "start-local-supabase: baseline already applied"
    return 0
  fi
  echo "start-local-supabase: applying storage stub + baseline"
  psql_admin -v ON_ERROR_STOP=1 <"$STUB_SQL"
  psql_admin -v ON_ERROR_STOP=1 <"$BASELINE_SQL"
  if [ -f "$SEED_SQL" ]; then
    echo "start-local-supabase: applying seed.sql"
    psql_admin -v ON_ERROR_STOP=0 <"$SEED_SQL" >/tmp/local-supabase-seed.log 2>&1 \
      || echo "start-local-supabase: seed.sql had errors (see /tmp/local-supabase-seed.log); continuing"
  fi
}

postgrest_on_desired_port() {
  local port
  port="$(docker_cmd inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$PGRST_CONTAINER" 2>/dev/null \
    | awk -F= '$1=="PGRST_SERVER_PORT"{print $2; exit}')"
  [ "$port" = "$PGRST_HOST_PORT" ]
}

ensure_postgrest() {
  if docker_cmd inspect -f '{{.State.Running}}' "$PGRST_CONTAINER" 2>/dev/null | grep -qx true \
    && postgrest_on_desired_port; then
    echo "start-local-supabase: ${PGRST_CONTAINER} already on :${PGRST_HOST_PORT}"
    return 0
  fi
  if docker_cmd inspect "$PGRST_CONTAINER" >/dev/null 2>&1; then
    echo "start-local-supabase: recreating ${PGRST_CONTAINER} on :${PGRST_HOST_PORT}"
    docker_cmd rm -f "$PGRST_CONTAINER" >/dev/null
  fi
  # Host network: bridge publish of PostgREST reset connections on this VM.
  docker_cmd run -d --name "$PGRST_CONTAINER" --network host \
    -e "PGRST_DB_URI=postgres://authenticator:postgres@127.0.0.1:${PG_HOST_PORT}/postgres" \
    -e "PGRST_DB_SCHEMAS=public,graphql_public" \
    -e "PGRST_DB_ANON_ROLE=anon" \
    -e "PGRST_DB_EXTRA_SEARCH_PATH=public,extensions" \
    -e "PGRST_JWT_SECRET=${JWT_SECRET}" \
    -e "PGRST_SERVER_PORT=${PGRST_HOST_PORT}" \
    "$PGRST_IMAGE" >/dev/null
}

proxy_healthy() {
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout 2 --max-time 5 \
    "http://127.0.0.1:${API_PROXY_PORT}/rest/v1/" 2>/dev/null || true)"
  [ "$code" = "200" ]
}

api_healthy() {
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout 2 --max-time 8 \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    "http://127.0.0.1:${API_PROXY_PORT}/rest/v1/restaurant_settings?select=id&limit=1" 2>/dev/null || true)"
  [ "$code" = "200" ]
}

ensure_proxy() {
  if proxy_healthy; then
    echo "start-local-supabase: /rest/v1 proxy already on :${API_PROXY_PORT}"
    return 0
  fi
  if [ -f "$PROXY_PID_FILE" ]; then
    local old
    old="$(cat "$PROXY_PID_FILE" 2>/dev/null || true)"
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
      kill "$old" 2>/dev/null || true
    fi
    rm -f "$PROXY_PID_FILE"
  fi
  # Free :54321 if a previous PostgREST host-network container still owns it.
  if ss -ltn | awk '{print $4}' | grep -Eq ":${API_PROXY_PORT}\$"; then
    echo "start-local-supabase: :${API_PROXY_PORT} is busy; expecting recreate of PostgREST to have released it"
  fi
  API_PROXY_PORT="$API_PROXY_PORT" PGRST_HOST_PORT="$PGRST_HOST_PORT" \
    nohup node "$PROXY_JS" >"$PROXY_LOG" 2>&1 &
  echo $! >"$PROXY_PID_FILE"
  local i
  for i in $(seq 1 20); do
    if proxy_healthy; then
      return 0
    fi
    sleep 0.25
  done
  echo "start-local-supabase: proxy did not become ready" >&2
  cat "$PROXY_LOG" >&2 || true
  return 1
}

reload_postgrest_schema() {
  psql_admin -c "NOTIFY pgrst, 'reload schema';" >/dev/null 2>&1 || true
}

echo "start-local-supabase: ensuring Docker engine"
ensure_dockerd

echo "start-local-supabase: ensuring Postgres on :${PG_HOST_PORT}"
ensure_postgres
apply_schema

echo "start-local-supabase: ensuring PostgREST on :${PGRST_HOST_PORT}"
ensure_postgrest
reload_postgrest_schema

echo "start-local-supabase: ensuring /rest/v1 proxy on :${API_PROXY_PORT}"
ensure_proxy

if ! api_healthy; then
  echo "start-local-supabase: waiting for Data API after schema reload"
  waited=0
  while [ "$waited" -lt 20 ]; do
    if api_healthy; then
      break
    fi
    waited=$((waited + 1))
    sleep 0.5
  done
fi

if ! api_healthy; then
  echo "start-local-supabase: Data API health check failed" >&2
  curl -sS -D - -o - \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    "http://127.0.0.1:${API_PROXY_PORT}/rest/v1/restaurant_settings?select=id&limit=1" >&2 || true
  echo >&2
  exit 1
fi

write_runtime_env "$RUNTIME_ENV_FILE"
if [ -n "${HOME:-}" ]; then
  write_runtime_env "${HOME}/.local-supabase.env"
fi

echo "READY local Supabase"
echo "  API      http://127.0.0.1:${API_PROXY_PORT}  (supabase-js /rest/v1)"
echo "  Postgres 127.0.0.1:${PG_HOST_PORT}"
echo "  env      ${RUNTIME_ENV_FILE}"
echo "  source   set -a; source ${RUNTIME_ENV_FILE}; set +a"

# Cloud Agent local Supabase

Persists Docker Engine plus a slim local stack so Cloud Agents do not spend
the run installing Docker and waiting on `npx supabase start`.

Official `npx supabase start` hangs in this nested-Docker VM during Realtime
Elixir migrate. The start script therefore brings up:

| Port  | Process                                      |
| ----- | -------------------------------------------- |
| 54321 | `/rest/v1` rewrite proxy → PostgREST         |
| 54322 | Supabase Postgres                            |
| 54323 | PostgREST (host network)                     |

`install-docker.sh` (via `.cursor/environment.json` `install`) installs
`docker.io` if missing and pre-pulls the Postgres / PostgREST images into the
environment snapshot. `start-local-supabase.sh` (`start`) is idempotent: it
starts `dockerd` without systemd, creates the containers if needed, applies
`storage-stub.sql` + `supabase/migrations/00000000000000_baseline.sql` on an
empty database, writes `/tmp/local-supabase.env`, prints `READY`, and returns.

Windows / local workstation flow is still `npx supabase start` — see
`docs/testing/Vitest-Integration-Guide.md`.

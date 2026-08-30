# Vitest integration guide

**Status:** Reference  
**Last updated:** 2026-08-30

## Prerequisites

Most suites assume a local stack:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --fail-on error
```

`db reset --local` applies `supabase/migrations/00000000000000_baseline.sql`
(already defines `replace_operating_windows`) plus later files, then loads
`supabase/seed.sql` when `[db.seed] enabled = true` in `supabase/config.toml`.

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`. `vitest.integration.config.ts` does not load
dotenv or call Vite's `loadEnv`, and does not set `envPrefix` (which would
only affect `import.meta.env`, not `process.env`, anyway) — it never reads
`.env.local` at all. Strict runs need those vars exported in the shell.

## Local-only mutating coverage (OH-SAVE)

The test target for
`tests/integration/scheduling/replace-operating-windows.integ.test.ts` is
**local** Supabase (`http://127.0.0.1:54321`), not the linked remote. Per
[../specs/scheduling.md](../specs/scheduling.md) §15, mutating coverage
(snapshot, RPC replace, table insert/delete restore) MUST run only against a
local host (`127.0.0.1`, `localhost`, or `[::1]`) and fails closed via
`assertIsolatedHoursMutationTarget` (`lib/scheduling/hours-mutation-target.ts`)
if `NEXT_PUBLIC_SUPABASE_URL` points at the shared linked project
`tilcqrudqxznnpepxjqq` or any other non-local host. A deployed PostgREST
schema-cache miss (PGRST202) on the linked project remains a real invariant,
but it is verified by manual UAT (click Save Changes on `/admin/scheduling`
against the linked project) and by applying
`20260818162000_operating_hour_segments.sql` per
[../runbooks/deploy.md](../runbooks/deploy.md) — not by mutating
`operating_windows` on that shared project from CI. Snapshot/restore recipe:
[Design-And-Patterns.md](./Design-And-Patterns.md). The same file also pins
OH-PRIV: after a docker `GRANT SELECT, INSERT, UPDATE, DELETE` overlay (local
postgres Dxtm defaults otherwise hide the linked-remote surface), an
authenticated Data API client must not persist INSERT/UPDATE/DELETE. Isolation
is the same `assertIsolatedHoursMutationTarget` guard. Spec:
[../specs/scheduling.md](../specs/scheduling.md) §16.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<local-anon-key>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<local-service-role-key>'
$env:RESTAURANT_INTEGRATION_STRICT = 'true'
pnpm test:integration tests/integration/scheduling/replace-operating-windows.integ.test.ts
```

## Layout

- Config: `vitest.integration.config.ts`
- Setup: `tests/integration/setup.ts` (honours `RESTAURANT_INTEGRATION_STRICT`)
- Helpers: `tests/integration/helpers/`
- Tests: `tests/integration/**/*.integ.test.ts`
- Occupancy window trigger:
  `tests/integration/reservations/occupancy-window.integ.test.ts` (assignment-feasible
  holds — one occupying reservation per table, `party_size = seats` — then
  `createReservation`; mocks `next/cache`). Linked-remote apply of
  `20260827180000_occupancy_duration_buffer.sql` is manual-UAT —
  [../runbooks/deploy.md](../runbooks/deploy.md).
- Table-fit trigger:
  `tests/integration/reservations/table-fit.integ.test.ts` (second overlapping
  party of 8 vs held 8-top). Local `db reset` applies
  `20260828121224_table_fit_availability.sql`; already-baselined remotes that
  recorded occupancy apply that forward the same way as occupancy —
  [../runbooks/deploy.md](../runbooks/deploy.md).
- Guest email PII (PV-9):
  `tests/integration/reservations/review-email-pii.integ.test.ts` (service-role
  insert of nullable `reservations.email`; anon `select("email")` is empty +
  42501/PGRST301). RES-PRIV unchanged — no `GRANT SELECT`.

## Skip vs strict

Suites use `describe.skipIf(!authEnvReady)` when Supabase env is absent.
With `RESTAURANT_INTEGRATION_STRICT=true`, missing env **throws** at setup (no silent skip).

```powershell
$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration
```

## Running

```powershell
pnpm test:integration
pnpm test:integration tests/integration/smoke.integ.test.ts
```

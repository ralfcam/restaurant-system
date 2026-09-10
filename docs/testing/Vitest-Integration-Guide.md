# Vitest integration guide

**Status:** Reference  
**Last updated:** 2026-09-10

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
`.env.local` at all. Strict runs need those vars exported in the same shell
from `npx supabase status` (local `127.0.0.1` URL + anon + service_role).

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
[../specs/scheduling.md](../specs/scheduling.md) §16. The same suite pins
OH-SAVE-PATH: every `CREATE OR REPLACE FUNCTION replace_operating_windows`
carries exact `SET search_path = ''` and qualified
`public.operating_windows` writes, and after local reset
`pg_proc.proconfig` contains `search_path=""` (`prosecdef` false;
`service_role` EXECUTE only). Spec:
[../specs/scheduling.md](../specs/scheduling.md) §15.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = '<local-anon-key>'
$env:SUPABASE_SERVICE_ROLE_KEY = '<local-service-role-key>'
$env:RESTAURANT_INTEGRATION_STRICT = 'true'
pnpm test:integration tests/integration/scheduling/replace-operating-windows.integ.test.ts
```

## Local-only mutating coverage (RES-ISO)

Mutating coverage under `tests/integration/reservations/*.integ.test.ts`
(cleanup deletes, service-role inserts, `createReservation`, `blocked_dates`
probes) is **local** Supabase only. Per
[../specs/booking-rules.md](../specs/booking-rules.md) RES-ISO, each suite
imports `assertIsolatedHoursMutationTarget` from
`lib/scheduling/hours-mutation-target.ts` (same helper as scheduling.md §15 /
OH-SAVE above) and calls it as the **first statement** of `beforeAll` and of
every write-cleanup hook (`afterEach` / `afterAll`). The call is
**zero-argument** (`assertIsolatedHoursMutationTarget()`). The unit scan
rejects `arguments.length !== 0` — an explicit local URL would pass the
helper’s “explicit URL wins” rule while `createServiceClient()` still
follows `NEXT_PUBLIC_SUPABASE_URL`. The guard fails closed when
`NEXT_PUBLIC_SUPABASE_URL` is the linked project `tilcqrudqxznnpepxjqq`
or any other non-local host — it does not skip. Do not put the guard in
`createServiceClient` (staff/admin against the linked project remains valid
production). A new file matching that glob MUST include the same pin. Unit
glob-scan:
`tests/unit/reservations/reservation-integ-isolation.test.ts`. Helper
fail-closed behavior stays owned by scheduling §15 /
`tests/unit/scheduling/hours-mutation-target.test.ts`.

## Local-only mutating coverage (PV-ISO)

Mutating coverage under `tests/integration/marketing/*.integ.test.ts`
(settings upsert/restore, `review_email_sends` / `reservations` inserts and
cleanup) is **local** Supabase only. Per
[../specs/post-visit-review-email.md](../specs/post-visit-review-email.md)
PV-ISO, each suite imports the same
`assertIsolatedHoursMutationTarget` helper and calls it as the **first
statement** of every write hook that exists (`beforeAll`, `beforeEach`,
`afterEach`, `afterAll`). The call is zero-argument. The guard fails closed
on a non-local host — it does not skip. Do not put the guard in
`createServiceClient`. A new file matching that glob MUST include the same
pin. Unit glob-scan:
`tests/unit/marketing/review-email-schema-isolation.test.ts`.

## Local-only mutating coverage (ORD-ISO)

Mutating coverage under `tests/integration/pos/*.integ.test.ts`
(service-role `orders` / `order_items` insert and cleanup delete) is
**local** Supabase only. Per
[../specs/menu-availability.md](../specs/menu-availability.md) ORD-ISO, each
suite calls `assertIsolatedHoursMutationTarget()` as the **first statement**
of `beforeAll` and of every write-cleanup hook (`afterEach` / `afterAll`).
When the only mutating write lives in `it()`, add a pin-only `beforeAll` —
`afterEach` alone is too late. The call is zero-argument. Do not put the
guard in `createServiceClient`. A new file matching that glob MUST include
the same pin. Unit glob-scan:
`tests/unit/pos/orders-persistence-isolation.test.ts`.

## Layout

- Config: `vitest.integration.config.ts`
- Setup: `tests/integration/setup.ts` (honours `RESTAURANT_INTEGRATION_STRICT`;
  `vi.mock("server-only", () => ({}))` so suites can import fenced modules)
- Helpers: `tests/integration/helpers/`
- Tests: `tests/integration/**/*.integ.test.ts`
- Reservation isolation (RES-ISO): every
  `tests/integration/reservations/*.integ.test.ts` pins
  `assertIsolatedHoursMutationTarget()` (zero-arg) as the first statement of
  `beforeAll` and write-cleanup hooks (see Local-only mutating coverage
  above).
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
- Review-email schema (PV-11–PV-13 / PV-ISO):
  `tests/integration/marketing/review-email-schema.integ.test.ts` (service-role
  upsert of `review_email_*` settings; `review_email_sends` insert + anon
  denial; `reservations.completed_at` persist). Every
  `tests/integration/marketing/*.integ.test.ts` pins
  `assertIsolatedHoursMutationTarget()` as the first statement of each write
  hook, including `beforeEach` (see Local-only mutating coverage above).
- POS/KDS orders (AC-5 / ORD-ISO):
  `tests/integration/pos/orders-persistence.integ.test.ts` (service-role insert
  - nested `order_items` select after local reset). Every
    `tests/integration/pos/*.integ.test.ts` pins
    `assertIsolatedHoursMutationTarget()` in `beforeAll` (pin-only when the
    write is in `it()`) and write-cleanup hooks.
- Catalog privileges (RES-PRIV / PUBLIC-READ-PRIV / SIB-PRIV):
  `tests/integration/reservations/public-privileges.integ.test.ts` (`REVOKE ALL`
  then guest `GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code)`;
  no table-wide `GRANT INSERT`; no authenticated `FOR ALL`; hostile insert
  of server-owned columns denied).
- Sibling role matrix (RES-42):
  `tests/integration/security/sibling-privileges.integ.test.ts` (live
  `pg_policies` + `has_table_privilege` / `has_sequence_privilege` after local
  reset; reservations guest table INSERT false, `has_column_privilege` INSERT
  true only for those eight guest columns; `validate_reservation_availability`
  trigger-only with guest `has_function_privilege` EXECUTE false).

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

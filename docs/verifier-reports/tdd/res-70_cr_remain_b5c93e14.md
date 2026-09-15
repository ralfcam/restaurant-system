# TDD log — res-70_cr_remain_b5c93e14

### C1

Suggested review order:
- hosted seed [schema] `supabase/migrations/20260915180000_menus_bootstrap.sql:51`
- five-id INSERT [schema] `supabase/migrations/20260915180000_menus_bootstrap.sql:53`
- companion RLS before GRANT [security] `supabase/migrations/20260825140000_operating_windows_privilege.sql:53`
- companion RLS before GRANT [security] `supabase/migrations/20260827160000_public_catalog_privileges.sql:43`
- header accuracy `supabase/migrations/20260915180000_menus_bootstrap.sql:13`

Reusable pattern: Hosted catalog seed belongs on the dated forward that still applies (`INSERT … ON CONFLICT (id) DO NOTHING`); copy ENABLE RLS + the two named policies onto every `CREATE TABLE IF NOT EXISTS` companion before GRANT — and do not leave a header claiming those companions stay privilege-only.

### C2

Suggested review order:
- fail-closed STRICT default [security] `vitest.integration.config.ts:9`
- STRICT string `"true"` [security] `vitest.integration.config.ts:10`
- existing throw gate (unchanged; one gate only) `tests/integration/setup.ts:6`

Reusable pattern: Put `RESTAURANT_INTEGRATION_STRICT: "true"` on `vitest.integration.config.ts` `test.env` so bare `pnpm test:integration` fail-closes; keep the throw in `tests/integration/setup.ts` (do not add a second throw in the suite file).

## Suggested Review Order (collated)

Highest-risk first:

1. **schema / hosted catalog** — five-id INSERT on the dated forward that still applies: `supabase/migrations/20260915180000_menus_bootstrap.sql:51`, `:53`
2. **security / RLS** — companion ENABLE RLS + policies before GRANT: `supabase/migrations/20260825140000_operating_windows_privilege.sql:53`, `supabase/migrations/20260827160000_public_catalog_privileges.sql:43`
3. **security / test integrity** — STRICT default on the config that collects the menus privilege suite: `vitest.integration.config.ts:9-10`; throw gate unchanged: `tests/integration/setup.ts:6`
4. **header accuracy** — dated-forward comment no longer claims companions stay privilege-only: `supabase/migrations/20260915180000_menus_bootstrap.sql:13`

## Traceability (final)

Run: 2026-09-15 · plan: res-70_cr_remain_b5c93e14 · issue: RES-70

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-4c | menus-bootstrap.test.ts::hosted menus bootstrap enables RLS and seeds the five tab ids | supabase/migrations/20260915180000_menus_bootstrap.sql, supabase/migrations/20260825140000_operating_windows_privilege.sql, supabase/migrations/20260827160000_public_catalog_privileges.sql | P0 | shipped |
| C2 | menu-availability.md MT-4d | menus-integ-strict.test.ts::integration config sets STRICT so menus privilege integ cannot skip-green | vitest.integration.config.ts | P0 | shipped |

## Run metrics

Run: 2026-09-15 → 2026-09-15 · plan: res-70_cr_remain_b5c93e14
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 (C1 red/green/refactor, C2 red/green/refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 4 left on ledger (below floor) — cap 3/run

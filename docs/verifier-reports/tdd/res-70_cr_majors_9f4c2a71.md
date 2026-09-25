# TDD log: res-70_cr_majors_9f4c2a71

Run: 2026-09-15 · plan: res-70_cr_majors_9f4c2a71 · issue: RES-70
Mode: FIX · spec: docs/specs/menu-availability.md (MT-6a, MT-4a, MT-4b)

Per-criterion Refactor close-out sections are appended below as each phase exits.

### C1

Suggested review order:
- authz + single write [auth] [public-api] `app/actions/menu.ts:356`
- atomic SQL + grants [schema] [security] `supabase/migrations/00000000000000_baseline.sql:477`
- GRANT/REVOKE surface [security] `supabase/migrations/00000000000000_baseline.sql:491`
- one-operation pin `tests/unit/menu/menu-tab-persistence.test.ts:283`
- identity harness still applies rpc `tests/unit/menu/menu-tab-identity.test.ts:138`

Reusable pattern: Atomic catalog reorder = `requireStaffUser` + `createServiceClient().rpc` into a `plpgsql` function with `SET search_path = ''`, qualified `UPDATE public.<table> … FROM jsonb_array_elements_text(…) WITH ORDINALITY`, `REVOKE ALL` from PUBLIC/anon/authenticated, `GRANT EXECUTE` to `service_role` only, not SECURITY DEFINER (sibling: `replace_operating_windows`).

### C2

Suggested review order:
- hosted `menus` bootstrap [schema] [security] `supabase/migrations/20260915180000_menus_bootstrap.sql:20`
- RLS + public-read / service_role policies [security] `supabase/migrations/20260915180000_menus_bootstrap.sql:27`
- privilege trio (REVOKE then GRANT) [security] `supabase/migrations/20260915180000_menus_bootstrap.sql:46`
- `reorder_menu_tabs` hosted copy `supabase/migrations/20260915180000_menus_bootstrap.sql:51`
- companion CREATE-before-GRANT `supabase/migrations/20260825140000_operating_windows_privilege.sql:46`
- unit pin `tests/unit/menu/menus-bootstrap.test.ts:11`

Reusable pattern: Dated-forward public-table bootstrap = `CREATE TABLE IF NOT EXISTS` + `ENABLE ROW LEVEL SECURITY` + idempotent `DROP`/`CREATE` public-read + `DROP` authenticated FOR ALL (no `CREATE`) + `DROP`/`CREATE` service_role FOR ALL + `REVOKE ALL` then `GRANT SELECT` / `GRANT ALL` to `service_role` + `NOTIFY pgrst` (sibling: `20260818155638_restaurant_branding_cms.sql`).

### C3

Suggested review order:
- Fail-closed harness [security] `tests/integration/setup.ts:6`
- env helpers `tests/integration/helpers/env.ts:2` (`authEnvReady`) and `:7` (`integrationStrict`)
- Integration config include + setupFiles [public-api] `vitest.integration.config.ts:5-6`
- PRE-SATISFIED pin `tests/unit/menu/menus-integ-strict.test.ts:11`
- `skipIf` left in place `tests/integration/menu/menus-privileges.integ.test.ts:58`

Reusable pattern: PRE-SATISFIED STRICT pin: assert `vitest.integration.config.ts` `include` + `setupFiles` strings, `setup.ts` `/if (integrationStrict && !authEnvReady) {\s*throw new Error(/`, and `globSync(include)` contains the named `*.integ.test.ts` — do not add a second throw or rewrite `skipIf`.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from the last Refactor close-out of each criterion.

- **[security] [schema]** Hosted `menus` bootstrap — `supabase/migrations/20260915180000_menus_bootstrap.sql:20` (CREATE TABLE); `:27` (RLS + public-read / service_role policies); `:46` (REVOKE then GRANT SELECT / GRANT ALL service_role); `:51` (`reorder_menu_tabs` copy)
- **[security] [schema]** Companion CREATE-before-GRANT — `supabase/migrations/20260825140000_operating_windows_privilege.sql:46`; `supabase/migrations/20260827160000_public_catalog_privileges.sql:36`
- **[schema] [security]** Baseline `reorder_menu_tabs` — `supabase/migrations/00000000000000_baseline.sql:477` (function); `:491` (REVOKE/GRANT EXECUTE service_role)
- **[auth] [public-api]** One staff reorder write — `app/actions/menu.ts:356` (`requireStaffUser` then `.rpc("reorder_menu_tabs", { p_ordered_ids })`)
- **[security]** STRICT fail-closed harness (PRE-SATISFIED, untouched) — `tests/integration/setup.ts:6`; `vitest.integration.config.ts:5-6`
- **[public-api]** Unit pins — `tests/unit/menu/menu-tab-persistence.test.ts:283` (one operation); `tests/unit/menu/menus-bootstrap.test.ts:11` (CREATE before GRANT); `tests/unit/menu/menus-integ-strict.test.ts:11` (STRICT coverage)

## Traceability (final)

Run: 2026-09-15 · plan: res-70_cr_majors_9f4c2a71 · issue: RES-70

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-6a | tests/unit/menu/menu-tab-persistence.test.ts::reorder menu tabs applies sort_order in one operation | app/actions/menu.ts, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C2 | menu-availability.md MT-4a | tests/unit/menu/menus-bootstrap.test.ts::menus privilege migrations create the table before granting | supabase/migrations/20260825140000_operating_windows_privilege.sql, supabase/migrations/20260827160000_public_catalog_privileges.sql, supabase/migrations/20260915180000_menus_bootstrap.sql | P0 | shipped |
| C3 | menu-availability.md MT-4b | tests/unit/menu/menus-integ-strict.test.ts::menus privilege integ is covered by STRICT fail-closed setup | tests/integration/setup.ts, vitest.integration.config.ts | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-15 → 2026-09-15 · plan: res-70_cr_majors_9f4c2a71
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 9 tdd-red/green/refactor Task calls (C3 Green skipped PRE-SATISFIED)
Back-loops: C1: 1 extra Red (sibling `rpc` mocks after Green BLOCKED)
BLOCKED events: 1 — C1 Green: sibling `{ from }`-only mocks threw; resolved by harness Red
Issues: 0 filed · 0 attached-to-existing · 15 this-run left on ledger (below floor) — cap 3/run unused

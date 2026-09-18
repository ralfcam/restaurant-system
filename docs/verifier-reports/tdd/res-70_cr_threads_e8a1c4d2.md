# TDD log: res-70_cr_threads_e8a1c4d2

## C1 — MT-4e every CREATE menus file seeds five ids

Suggested review order:
- companion replay seed [schema] — `supabase/migrations/20260827160000_public_catalog_privileges.sql:70`
- other CREATE menus companion [schema] — `supabase/migrations/20260825140000_operating_windows_privilege.sql:80`
- local-reset seed [schema] — `supabase/migrations/00000000000000_baseline.sql:191`

Reusable pattern: Copy the dated-forward five-id `INSERT … ON CONFLICT (id) DO NOTHING` onto every `CREATE TABLE IF NOT EXISTS menus` file, immediately after that file’s menus GRANT/REVOKE trio, using the same hosted-apply comment (`MT-4e` vs `MT-4c`). Do not add a new dated migration.

## Suggested Review Order (collated)

- schema/security → companion replay seed in `20260827160000_public_catalog_privileges.sql` (deploy apply path)
- schema → `20260825140000_operating_windows_privilege.sql` five-id INSERT
- schema → baseline INSERT now duplicates `seed.sql` (ON CONFLICT)

## Traceability (final)

Run: 2026-09-15 · plan: res-70_cr_threads_e8a1c4d2 · issue: RES-70

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-4e | menus-bootstrap.test.ts::every CREATE menus migration seeds the five tab ids | `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`, `20260827160000_public_catalog_privileges.sql` | P0 | shipped |

## Run metrics

Run: 2026-09-15 → 2026-09-15 · plan: res-70_cr_threads_e8a1c4d2
Criteria: 1 shipped · 0 manual-UAT
Phases: C1 Red RED ✓ · C1 Green GREEN ✓ · C1 Refactor REFACTOR ✓
Infra: unit pins; `npx supabase db reset --local` BLOCKED (Docker not installed / LegacyLocalDbRunningError)

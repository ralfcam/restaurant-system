# TDD verifier report — REAZED-297 service_role GRANT (`reazed-297_service-role_grant_5bde11c5`)

FIX run. Linear: [REAZED-297](https://linear.app/realized/issue/REAZED-297).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — GRANT ALL to service_role on operating_windows

Suggested review order:
- Privilege surface [security]: `supabase/migrations/00000000000000_baseline.sql:42-45`
- Privilege surface [security]: `supabase/migrations/20260825140000_operating_windows_privilege.sql:12-17`
- RLS unchanged (DROP authenticated FOR ALL; keep service_role FOR ALL): `supabase/migrations/00000000000000_baseline.sql:31-40`
- Forward header now names both issues: `supabase/migrations/20260825140000_operating_windows_privilege.sql:5-8`

Reusable pattern: Dual-file `GRANT ALL ON TABLE <t> TO service_role` string-identity lock in baseline + the still-unapplied privilege forward (fold into that file when remote `schema_migrations` has not recorded it)

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Table privilege GRANT ALL `[security]` `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:42-45` — `GRANT SELECT` / `REVOKE` for `anon, authenticated` kept; `-- REAZED-297` + `GRANT ALL ON TABLE operating_windows TO service_role`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:12-17` — same GRANT SELECT / REVOKE plus GRANT ALL; `NOTIFY pgrst, 'reload schema'`
- `supabase/migrations/00000000000000_baseline.sql:31-40` — DROP authenticated FOR ALL (no CREATE); service_role FOR ALL policy kept

### 2. Forward apply header `[schema]`

- `supabase/migrations/20260825140000_operating_windows_privilege.sql:5-8` — header names REAZED-290 SELECT/REVOKE and REAZED-297 GRANT ALL; no third dated file (`20260825140000` not recorded on linked remote)

### 3. SQL-text contract

- `tests/unit/scheduling/schema.test.ts:93-104` — `GRANT ALL ON TABLE operating_windows TO service_role` in baseline **and** `20260825140000_operating_windows_privilege.sql`

## Traceability (final)

Run: 2026-08-25 · plan: reazed-297_service-role_grant_5bde11c5 · issue: REAZED-297

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md OH-PRIV §16 (GRANT ALL to service_role) | `schema.test.ts::operating_windows grants ALL to service_role in baseline and privilege forward files` | `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql` | P0 | shipped |
| OH-PRIV-remote-GRANT | scheduling.md OH-PRIV §16 | — | same GRANT ALL via `20260825140000_operating_windows_privilege.sql` on `tilcqrudqxznnpepxjqq` | P0 | manual-uat |

**manual-UAT (deferred):** apply `20260825140000_operating_windows_privilege.sql` on linked remote `tilcqrudqxznnpepxjqq` per `docs/runbooks/deploy.md` (single-file apply + record `schema_migrations`; do not `db push`). Confirm `has_table_privilege('service_role','operating_windows','SELECT')` (and INSERT/UPDATE/DELETE) is true. Existing OH-PRIV Save Changes UAT on `/admin/scheduling` still applies.

## Run metrics

Run: 2026-08-25 → 2026-08-25 · plan: reazed-297_service-role_grant_5bde11c5
Criteria: 1 shipped · 1 manual-uat · 2 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 1 attached-to-existing · 1 left on ledger (below floor) — cap 3/run

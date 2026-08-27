# TDD verifier report — REAZED-297 sibling GRANT ALL (`reazed-297_sibling_grants_097b94f3`)

FIX run. Linear: [REAZED-297](https://linear.app/realized/issue/REAZED-297).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — EARLY-PRIV GRANT ALL on blocked_dates, reservations, menu_items

Suggested review order:
- Sibling GRANT ALL [security] [schema]: `supabase/migrations/00000000000000_baseline.sql:78-79` (`blocked_dates`)
- Sibling GRANT ALL [security] [schema]: `supabase/migrations/00000000000000_baseline.sql:125-126` (`reservations`)
- Sibling GRANT ALL [security] [schema]: `supabase/migrations/00000000000000_baseline.sql:171-172` (`menu_items`)
- Dual-file forward lock [security]: `supabase/migrations/20260825140000_operating_windows_privilege.sql:15-19`
- Forward header names siblings: `supabase/migrations/20260825140000_operating_windows_privilege.sql:7-9`
- Authenticated FOR ALL kept (hard limit): `supabase/migrations/00000000000000_baseline.sql:64-68`, `:111-116`, `:157-162`
- SQL-text contract: `tests/unit/scheduling/schema.test.ts:106-119`

Reusable pattern: Fold sibling `GRANT ALL ON TABLE <t> TO service_role` into the still-unapplied privilege forward with byte-identical strings; share the `operating_windows` `-- REAZED-297: default table privileges…` comment in the grouped forward file instead of a second comment dialect

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Table privilege GRANT ALL `[security]` `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:78-79` — `-- REAZED-297` + `GRANT ALL ON TABLE blocked_dates TO service_role` after the service_role RLS block; authenticated `FOR ALL` kept
- `supabase/migrations/00000000000000_baseline.sql:125-126` — same GRANT ALL for `reservations`
- `supabase/migrations/00000000000000_baseline.sql:171-172` — same GRANT ALL for `menu_items`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:15-19` — byte-identical `GRANT ALL ON TABLE <t> TO service_role` for `operating_windows` plus the three siblings; `NOTIFY pgrst` after. Must not DROP sibling `FOR ALL` policies.

### 2. Forward apply header `[schema]`

- `supabase/migrations/20260825140000_operating_windows_privilege.sql:7-9` — header names REAZED-297 GRANT ALL for `operating_windows`, `blocked_dates`, `reservations`, `menu_items`; no third dated file (`20260825140000` still unrecorded on linked remote)

### 3. Authenticated FOR ALL left in place `[security]`

- `supabase/migrations/00000000000000_baseline.sql:64-68`, `:111-116`, `:157-162` — `blocked_dates` / `reservations` / `menu_items` keep `authenticated` `FOR ALL` (REAZED-299). This wave must not DROP those policies.

### 4. SQL-text contract

- `tests/unit/scheduling/schema.test.ts:106-119` — for each of `blocked_dates`, `reservations`, `menu_items`, `GRANT ALL ON TABLE <t> TO service_role` in baseline **and** `20260825140000_operating_windows_privilege.sql`

## Traceability (final)

Run: 2026-08-27 · plan: reazed-297_sibling_grants_097b94f3 · issue: REAZED-297

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 EARLY-PRIV | scheduling.md §17 (+ booking-rules §5 / menu-availability mirrors) | `schema.test.ts::early-baseline tables grant ALL to service_role in baseline and privilege forward files` | `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql` | P0 | shipped |
| EARLY-PRIV-remote-GRANT | scheduling.md §17 | — | same GRANT ALL via `20260825140000_operating_windows_privilege.sql` on `tilcqrudqxznnpepxjqq` | P0 | manual-uat |

**manual-UAT (deferred):** apply extended `20260825140000_operating_windows_privilege.sql` on linked remote `tilcqrudqxznnpepxjqq` per `docs/runbooks/deploy.md` (single-file apply + record `schema_migrations`; do not `db push`). Confirm `has_table_privilege('service_role', '<t>', 'SELECT')` (and INSERT/UPDATE/DELETE) for `blocked_dates`, `reservations`, `menu_items`. Still confirm the existing operating_windows checks from C1.

## Run metrics

Run: 2026-08-27 → 2026-08-27 · plan: reazed-297_sibling_grants_097b94f3
Criteria: 1 shipped · 1 manual-uat · 2 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 1 filed · 1 attached-to-existing · 3 left on ledger (below floor) — cap 3/run

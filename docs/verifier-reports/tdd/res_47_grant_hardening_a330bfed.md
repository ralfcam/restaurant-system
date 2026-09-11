# TDD verifier report — res_47_grant_hardening_a330bfed

FIX run. Linear: [RES-47](https://linear.app/realized/issue/RES-47/validate-reservation-availability-keeps-default-anonauthenticated).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — RES-TRIGGER-EXEC

Suggested review order:
- Guest EXECUTE surface `[security]`
  - `tests/integration/security/sibling-privileges.integ.test.ts:435`
  - `tests/integration/security/sibling-privileges.integ.test.ts:232`
  - `tests/integration/security/sibling-privileges.integ.test.ts:210`
- Latest function forward + identical revoke pair `[schema]` `[security]`
  - `supabase/migrations/20260828121224_table_fit_availability.sql:220`
  - `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:251`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:227`
  - `supabase/migrations/00000000000000_baseline.sql:409`
- Trigger binding still DEFINER-owned `[booking]`
  - `supabase/migrations/00000000000000_baseline.sql:202`
  - `supabase/migrations/00000000000000_baseline.sql:443`
- PR #89 matrix preserved
  - `tests/integration/security/sibling-privileges.integ.test.ts:348`

Reusable pattern: After every `CREATE OR REPLACE` of a trigger-only `SECURITY DEFINER` function, immediately `REVOKE ALL … FROM PUBLIC` and `FROM anon, authenticated`; prove both the migration-surface pair and live `has_function_privilege`/`aclexplode` after `supabase db reset --local` — `CREATE OR REPLACE` preserves an already-open ACL, so a later forward must carry the revokes itself.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Guest authorization contract `[security]`

- `docs/specs/booking-rules.md` §23 RES-TRIGGER-EXEC — `public.validate_reservation_availability()` stays `SECURITY DEFINER` with `SET search_path TO public` and remains the enabled `enforce_booking_rules` `BEFORE INSERT OR UPDATE` trigger; `PUBLIC`, `anon`, and `authenticated` have no effective `EXECUTE`
- `tests/integration/security/sibling-privileges.integ.test.ts:435` — `local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE`
- `tests/integration/security/sibling-privileges.integ.test.ts:232` — live `aclexplode` + `has_function_privilege(..., 'EXECUTE')` for `anon`/`authenticated`, plus `prosecdef` and trigger binding
- `tests/integration/security/sibling-privileges.integ.test.ts:210` — migration-surface `REVOKE ALL … FROM PUBLIC` then `FROM anon, authenticated` immediately after each function body; later guest `GRANT EXECUTE` forbidden

### 2. Database privilege enforcement `[schema]` `[security]`

Latest function-defining forward first (linked-project last writer), then identical revoke pairs on every `CREATE OR REPLACE`:

- `supabase/migrations/20260828121224_table_fit_availability.sql:220`
- `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:251`
- `supabase/migrations/20260818162000_operating_hour_segments.sql:227`
- `supabase/migrations/00000000000000_baseline.sql:409`
- `supabase/migrations/00000000000000_baseline.sql:202` — `SECURITY DEFINER` + `SET search_path TO public`
- `supabase/migrations/00000000000000_baseline.sql:443` — `enforce_booking_rules` still `EXECUTE FUNCTION validate_reservation_availability()`

### 3. Contract + preserved sibling matrix

- `docs/specs/booking-rules.md` §23 — linked-project paragraph is C2 manual-UAT (re-run the latest idempotent forward even when `20260828121224` is already recorded; do not `db push` or reset forked history)
- `tests/integration/security/sibling-privileges.integ.test.ts:348` — PR #89 table/column/sequence matrix unchanged and still passing

### 4. Operational mirrors

- `docs/architecture/Auth-And-RLS.md` — DEFINER trigger is not a guest RPC; explicit function EXECUTE revokes
- `docs/runbooks/deploy.md` — Apply `20260828121224_table_fit_availability.sql` must also check `has_function_privilege` false for `anon`/`authenticated` after the SQL re-run

## Traceability (final)

Run: 2026-09-10 · plan: res_47_grant_hardening_a330bfed · issue: RES-47

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 RES-TRIGGER-EXEC | booking-rules.md §23 RES-TRIGGER-EXEC | `sibling-privileges.integ.test.ts::local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE` | `00000000000000_baseline.sql`, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql` | P0 | shipped |
| C2 RES-TRIGGER-EXEC-LINKED | booking-rules.md §23 (linked-project last-writer apply) | — | latest function-defining forward on linked project `tilcqrudqxznnpepxjqq` (currently `20260828121224_table_fit_availability.sql`) | P0 | manual-uat |

**manual-UAT (deferred):** after merge and separate authorization, apply the updated latest function-defining forward to the non-production linked project per `docs/runbooks/deploy.md`, even when that migration version is already recorded. Confirm guest EXECUTE is false, the Security Advisor EXECUTE warning is absent, and `enforce_booking_rules` remains enabled. Do not `db push` or reset the forked history.

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: res_47_grant_hardening_a330bfed
Criteria: 1 shipped · 1 manual-uat · 2 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none (Linear REGISTER MCP unreachable at 4C — ledger is the fallback)
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (1 security med above floor awaiting operator yes; 4 below floor; Linear MCP BLOCKED) — cap 3/run

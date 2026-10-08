# TDD log — res-101_private_schema_b4e1

## C1 — RES-TRIGGER-EXEC private schema

Suggested review order:
- Revoke schema usage [security]
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:13`
- Move the function [schema]
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:19`
- Rebind `enforce_booking_rules` [booking]
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:26`
- Revoke function EXECUTE
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:31`
- Dated-file fact
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:2`
- Do not fold into baseline
  - `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:7`

Reusable pattern: State remote-history and “later unqualified writers recreate `public` and leave the trigger on a stale private body” as two comment facts, and do not leave `CREATE OR REPLACE FUNCTION validate_reservation_availability()` as one contiguous string in a migration comment while `sibling-privileges.integ.test.ts` scans raw SQL.

Re-verify (orchestrator): `pnpm test:unit tests/unit/security/reservation-trigger-schema.test.ts` 1 file, 1 test, 0 skipped. `pnpm lint` clean (`eslint . --max-warnings 0`). `pnpm typecheck` clean (`tsc --noEmit`). `pnpm exec prettier --check` on the migration reports no SQL parser; the repo does not format `.sql`.

## Suggested Review Order (collated)

- Revoke `USAGE` on schema `private` from PUBLIC, anon, and authenticated [security] → `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:13`
- `ALTER FUNCTION ... SET SCHEMA private` only while the function is still in `public` [schema] → `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:19`
- Rebind `enforce_booking_rules` to `private.validate_reservation_availability()` → `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:26`
- Revoke function EXECUTE from PUBLIC, anon, and authenticated → `supabase/migrations/20261008120000_private_validate_reservation_availability.sql:31`
- Spec names the private function → `docs/specs/booking-rules.md` RES-TRIGGER-EXEC
- Unit scan of the move file → `tests/unit/security/reservation-trigger-schema.test.ts:8`

## Traceability (final)

Run: 2026-10-08 · plan: res-101_private_schema_b4e1 · issue: RES-101

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md RES-TRIGGER-EXEC | tests/unit/security/reservation-trigger-schema.test.ts::booking trigger function lives in private and is not a guest RPC | supabase/migrations/20261008120000_private_validate_reservation_availability.sql | P0 | shipped |

## Run metrics

Run: 2026-10-08 → 2026-10-08 · plan: res-101_private_schema_b4e1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 4 left on ledger (below floor) — cap 3/run

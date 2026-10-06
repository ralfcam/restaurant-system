# TDD verifier report — RES-143 cover read robustness (`res-143_cover_read_b7c4`)

FIX run. Linear: RES-143.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — CC-14 staff-gates the capacity read

Suggested review order: authz guard — `app/actions/operations.ts:410` `requireStaffUser` [auth] [security]; falsy user throws `errors.operations.unauthorized` — `app/actions/operations.ts:411`; settings read only after that gate — `app/actions/operations.ts:413`
Reusable pattern: none

### C2 — CC-15 floor page survives a failed capacity read

Suggested review order: `Promise.all` does not include the capacity read — `app/admin/floor/page.tsx:20`; null fallback — `app/admin/floor/page.tsx:34`; any other error is rethrown [auth] — `app/admin/floor/page.tsx:38`; `FloorPlan` receives that value — `app/admin/floor/page.tsx:59`
Reusable pattern: For a page-level known-error swallow, initialize the fallback and rethrow every other rejection.

### C3 — CC-16 seat-read failure is save-failed

Suggested review order: seat-read failure key [public-api] — `app/actions/operations.ts:1201`; below-sum refusal only after a successful sum — `app/actions/operations.ts:1206`
Reusable pattern: none

### C4 — CC-17 hosted ceiling covers the seat sum

Suggested review order: null-only hosted ceiling [schema] — `supabase/migrations/20261005170000_hosted_baseline_columns.sql:90` `GREATEST(38, SUM(seats)::integer)`
Reusable pattern: a hosted ceiling backfill that a BEFORE UPDATE trigger compares to the live seat total should be `GREATEST(<seed floor>, SUM(seats)::integer)` under `max_cover_capacity IS NULL`.

## Suggested Review Order (collated)

- Staff gate before the service-role capacity read [auth] [security] → `app/actions/operations.ts:410` (`requireStaffUser`), `:411` (`errors.operations.unauthorized`), `:413` (settings read)
- Floor page rethrows every error except the capacity-read key [auth] → `app/admin/floor/page.tsx:38`
- Floor page stays up and passes a null ceiling when that key is thrown → `app/admin/floor/page.tsx:20`, `:34`, `:59`
- Seat-read failure is save-failed, not below-sum [public-api] → `app/actions/operations.ts:1201`, `:1206`
- Hosted null ceiling is at least the current seat sum [schema] → `supabase/migrations/20261005170000_hosted_baseline_columns.sql:90`
- Spec amendment → `docs/specs/cover-capacity.md` CC-14 through CC-17

## Traceability (final)

Run: 2026-10-06 · plan: res-143_cover_read_b7c4 · issue: RES-143

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| CC-14 | cover-capacity.md CC-14 | tests/unit/floor/cover-capacity.test.ts::CC-14 gates getMaxCoverCapacity | app/actions/operations.ts | P0 | shipped |
| CC-15 | cover-capacity.md CC-15 | tests/unit/floor/cover-capacity.test.ts::CC-15 keeps the floor page up when the capacity read throws | app/admin/floor/page.tsx | P1 | shipped |
| CC-16 | cover-capacity.md CC-16 | tests/unit/floor/cover-capacity.test.ts::CC-16 does not call a seat-read failure a below-sum refusal | app/actions/operations.ts | P1 | shipped |
| CC-17 | cover-capacity.md CC-17 | tests/unit/floor/cover-capacity.test.ts::CC-17 derives the hosted ceiling from the seat sum | supabase/migrations/20261005170000_hosted_baseline_columns.sql | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-143_cover_read_b7c4
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 13
Back-loops: CC-17: 1 extra Red (existing forward-migration assertion still required bare `= 38`)
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor) — cap 3/run

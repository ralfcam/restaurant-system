# TDD log — res-69_cover_capacity_b7d4

### CC-2

Suggested review order:
- Nullable column [schema] → `supabase/migrations/00000000000000_baseline.sql:1022` (`max_cover_capacity INT`)
- Ceiling check [schema] → `supabase/migrations/00000000000000_baseline.sql:1061` (`NULL OR >= 1`)
- Guest write stays revoked [security] → `supabase/migrations/00000000000000_baseline.sql:1087` (`REVOKE INSERT, UPDATE, DELETE`)

Reusable pattern: none

### CC-1

Suggested review order:
- Staff gate [auth] → `app/actions/operations.ts:1173` (`requireStaffUser` before any write)
- Invalid value refused before the service client [auth] → `app/actions/operations.ts:1180`
- Service-role write [security] → `app/actions/operations.ts:1183` (`createServiceClient`)
- Floor control → `components/staff/floor-plan.tsx:868` (`data-testid="floor-max-cover-capacity"`)
- Page load → `app/admin/floor/page.tsx:33` (`getMaxCoverCapacity`)

Reusable pattern: none

### CC-4

Suggested review order:
- Integer gate before the service client [auth] → `app/actions/operations.ts:1176` (`Number.isInteger` and `>= 1`)

Reusable pattern: none

### CC-5

Suggested review order:
- Seat-sum read [schema] → `app/actions/operations.ts:1185`
- Below-sum refusal leaves the row unwritten → `app/actions/operations.ts:1191`

Reusable pattern: none

### CC-3

Suggested review order:
- Unset blocks create before the tables query → `app/actions/operations.ts:961`
- Unset blocks a seat increase → `app/actions/operations.ts:454`
- Prompt when unset → `components/staff/floor-plan.tsx:887` (`data-testid="floor-max-cover-prompt"`)

Reusable pattern: none

### CC-6

Suggested review order:
- Create refuses a sum over the ceiling → `app/actions/operations.ts:969`
- Seat increase refuses a sum over the ceiling → `app/actions/operations.ts:461`
- Catalog sentence → `messages/en.json` `errors.floor.maxCoverCapacityReached`

Reusable pattern: `sumTableSeats` treats a missing or non-finite seat count as 0 when summing rows already loaded for a growth check.

### CC-8

Suggested review order:
- Null upsert clears the column → `app/actions/operations.ts:1194`
- After clear, create hits the unset throw → `app/actions/operations.ts:963`

Reusable pattern: none

### CC-7

Suggested review order:
- Seat decrease skips the ceiling compare → `app/actions/operations.ts:449` (only when clamped seats are greater than current)
- Delete stays a plain delete → `app/actions/operations.ts:1000`

Reusable pattern: none

### CC-9

Suggested review order:
- Seat clamp 1–12 → `app/actions/operations.ts:447`
- Status-only and expected-minutes updates do not read the ceiling → `app/actions/operations.ts:421`
- Booking occupancy stays `SUM(seats)` → `supabase/migrations/20260918140655_slot_service_cover_limits.sql:114`

Reusable pattern: none

## Suggested Review Order (collated)

- Staff gate before the service client [auth] → `app/actions/operations.ts` `requireStaffUser`, then integer check, then `createServiceClient`
- Guest cannot write the column [security] → `supabase/migrations/00000000000000_baseline.sql` `REVOKE INSERT, UPDATE, DELETE` on `restaurant_settings`
- Nullable ceiling [schema] → `supabase/migrations/00000000000000_baseline.sql` `max_cover_capacity INT` and `CHECK (max_cover_capacity IS NULL OR max_cover_capacity >= 1)`
- Unset blocks growth → `app/actions/operations.ts` `createTable` and seat increase throw `errors.floor.maxCoverCapacityUnset` before a write
- Over-ceiling refusal → `app/actions/operations.ts` `errors.floor.maxCoverCapacityReached` and the English catalog sentence
- Floor chrome → `components/staff/floor-plan.tsx` `floor-max-cover-capacity` and `floor-max-cover-prompt`; `app/admin/floor/page.tsx` loads `getMaxCoverCapacity`
- Shrink and neighbors stay → seat decrease, `deleteTable`, clamp 1–12, booking `SUM(seats)`

## Traceability (final)

Run: 2026-10-04 · plan: res-69_cover_capacity_b7d4 · issue: RES-69

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| CC-1 | cover-capacity.md CC-1 | tests/unit/floor/cover-capacity.test.ts::CC-1 staff gate and floor control | app/actions/operations.ts, components/staff/floor-plan.tsx, app/admin/floor/page.tsx | P0 | shipped |
| CC-2 | cover-capacity.md CC-2 | tests/unit/floor/cover-capacity.test.ts::CC-2 nullable ceiling and guest cannot write it | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| CC-3 | cover-capacity.md CC-3 | tests/unit/floor/cover-capacity.test.ts::CC-3 unset maximum blocks create and seat increase | app/actions/operations.ts, components/staff/floor-plan.tsx | P0 | shipped |
| CC-4 | cover-capacity.md CC-4 | tests/unit/floor/cover-capacity.test.ts::CC-4 refuses 0, negative, fraction, and non-number | app/actions/operations.ts | P0 | shipped |
| CC-5 | cover-capacity.md CC-5 | tests/unit/floor/cover-capacity.test.ts::CC-5 refuses a maximum below the seat sum | app/actions/operations.ts | P0 | shipped |
| CC-6 | cover-capacity.md CC-6 | tests/unit/floor/cover-capacity.test.ts::CC-6 refuses a sum above the maximum | app/actions/operations.ts, messages/en.json | P0 | shipped |
| CC-7 | cover-capacity.md CC-7 | tests/unit/floor/cover-capacity.test.ts::CC-7 lowering seats and delete reduce the sum | app/actions/operations.ts | P1 | shipped |
| CC-8 | cover-capacity.md CC-8 | tests/unit/floor/cover-capacity.test.ts::CC-8 clear returns to the unset block | app/actions/operations.ts | P1 | shipped |
| CC-9 | cover-capacity.md CC-9 | tests/unit/floor/cover-capacity.test.ts::CC-9 seat clamp and neighbor rules stay | app/actions/operations.ts, supabase/migrations/20260918140655_slot_service_cover_limits.sql | P1 | shipped |

## Run metrics

Run: 2026-10-04 → 2026-10-04 · plan: res-69_cover_capacity_b7d4
Criteria: 9 shipped · 0 manual-uat · 9 total
Phases delegated: 9
Back-loops: CC-3 sibling scripts (operations-shape, message-keys) after the settings read was added
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 0 left on ledger — cap 3/run

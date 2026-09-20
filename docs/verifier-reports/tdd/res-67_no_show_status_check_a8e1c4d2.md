# TDD log: res-67_no_show_status_check_a8e1c4d2

### C1

Suggested review order:
- Schema persist set [schema]: `supabase/migrations/00000000000000_baseline.sql:97` (RES-67 comment)
- Schema persist set [schema]: `supabase/migrations/00000000000000_baseline.sql:99` (five-value CHECK includes `'no_show'`)
- Staff persist path [public-api]: `app/actions/reservations.ts:261` (`RESERVATION_TRANSITIONS.confirmed` already includes `no_show`)
- Staff persist path [auth]: `app/actions/reservations.ts:276` (`requireStaffUser` before UPDATE)
- Staff persist path [public-api]: `app/actions/reservations.ts:304` (UPDATE; CHECK rejection was `'Could not update reservation status.'`)
- Guest cannot write status [security]: `supabase/migrations/00000000000000_baseline.sql:154` (`GRANT INSERT` allowlist omits `status`)
- BW-10 non-occupying: `supabase/migrations/00000000000000_baseline.sql:339` (occupancy trigger still `IN ('confirmed', 'seated')`)

Reusable pattern: Staff reservation-status persist integ: hoisted `requireStaffUser` + `next/cache` `revalidatePath` mocks, RES-ISO zero-arg pin on `beforeAll`/`afterEach`, distinct far-future date, service-role seed, `transitionReservationStatus`, service-role re-read.

### C2

Suggested review order:
- Remote last-writer CHECK [schema]: `supabase/migrations/20260920183000_reservation_status_no_show.sql:8`
- Remote last-writer CHECK [schema]: `supabase/migrations/20260920183000_reservation_status_no_show.sql:12`
- Remote last-writer clock [schema]: `supabase/migrations/20260920183000_reservation_status_no_show.sql:15`
- Fresh-reset CREATE TABLE CHECK [schema]: `supabase/migrations/00000000000000_baseline.sql:99`
- Fresh-reset DROP/ADD copy [schema]: `supabase/migrations/00000000000000_baseline.sql:123`

Reusable pattern: Dated last-writer that must *replace* a CHECK uses `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` (not `DO $$ IF NOT EXISTS`, which would leave the old list), copies the same statements into baseline for `db reset` convergence, and the unit scan asserts the CHECK IN-list in a `20*.sql` file — a comment/`no_show` string hit is not enough.

## Suggested Review Order (collated)

Highest-risk first.

- **Remote last-writer CHECK** [schema]
  - `supabase/migrations/20260920183000_reservation_status_no_show.sql:8` — `DROP CONSTRAINT IF EXISTS reservations_status_check`
  - `supabase/migrations/20260920183000_reservation_status_no_show.sql:12` — `ADD CONSTRAINT` five-value CHECK including `'no_show'`
  - `supabase/migrations/20260920183000_reservation_status_no_show.sql:15` — `ADD COLUMN IF NOT EXISTS completed_at`
- **Fresh-reset CHECK + copy** [schema]
  - `supabase/migrations/00000000000000_baseline.sql:97` — RES-67 comment
  - `supabase/migrations/00000000000000_baseline.sql:99` — CREATE TABLE CHECK includes `'no_show'`
  - `supabase/migrations/00000000000000_baseline.sql:123` — baseline DROP/ADD copy
- **Staff persist path** [public-api] [auth]
  - `app/actions/reservations.ts:261` — `RESERVATION_TRANSITIONS.confirmed` already includes `no_show`
  - `app/actions/reservations.ts:276` — `requireStaffUser` before UPDATE
  - `app/actions/reservations.ts:304` — UPDATE; CHECK rejection was `'Could not update reservation status.'`
- **Guest cannot write status** [security]
  - `supabase/migrations/00000000000000_baseline.sql:154` — `GRANT INSERT` allowlist omits `status`
- **BW-10 non-occupying**
  - `supabase/migrations/00000000000000_baseline.sql:339` — occupancy trigger still `IN ('confirmed', 'seated')`

## Traceability (final)

Run: 2026-09-20 · plan: res-67_no_show_status_check_a8e1c4d2 · issue: RES-67

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md RES-STATUS-NOSHOW | tests/integration/reservations/status-transitions.integ.test.ts::staff confirmed to no_show persists after refresh | supabase/migrations/00000000000000_baseline.sql, app/actions/reservations.ts | P0 | shipped |
| C2 | booking-rules.md RES-STATUS-FORWARD | tests/unit/reservations/status-check-forward.test.ts::dated last-writer replaces reservations status check with no_show and adds completed_at | supabase/migrations/20260920183000_reservation_status_no_show.sql, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |

## Run metrics

Run: 2026-09-20 → 2026-09-20 · plan: res-67_no_show_status_check_a8e1c4d2
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor) — cap 3/run

# TDD verifier report — REAZED-305 compatible-table bookability (`reazed-305_table-fit_ebc5d205`)

FIX run. Linear: [REAZED-305](https://linear.app/realized/issue/REAZED-305).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — Fragmented seats cannot seat

Suggested review order:
- [booking] unit-fit predicate (no cover-sum, no invented merge) → `lib/reservations/auto-assign.ts:166`
- occupying reserved on the public signature (unused until C2) → `lib/reservations/auto-assign.ts:169`
- C1 regression (four 2-tops vs party of 4) → `tests/unit/reservations/table-fit.test.ts:12`

Reusable pattern: eslint-config-next does not ignore `_`-prefixed args; keep a reserved required parameter with `void occupying` (same idea as `void patch` in `assign-table` tests) instead of `_occupying`.

### C2 — Overlapping occupying consume units

Suggested review order:
- [booking] status-agnostic best-fit vs live-floor available filter → `lib/reservations/auto-assign.ts:147` (`pickBestFitTable`), `lib/reservations/auto-assign.ts:162` (`selectBestTable`)
- [booking] overlapping greedy assign + hard `table_label` claims → `lib/reservations/auto-assign.ts:183` (`canSeatPartyOnTables`)
- C2 regression (8-top contention, leftover 2-top, BW-9 21:00, assigned-label claim) → `tests/unit/reservations/table-fit.test.ts:37`

Reusable pattern: Share FP-3 ranking through a private pick that ignores live status; keep `status === "available"` only on the live-floor caller so bookability cannot treat floor chrome as occupancy.

### C3 — Existing merge is one unit; no speculative merge

Suggested review order:
- [booking] merge inventory contract (omit / `[]` / existing staff merge) → `lib/reservations/auto-assign.ts:181`
- [booking] collapse-then-unit-fit (`toAssignableTables` before `.some` / greedy place) → `lib/reservations/auto-assign.ts:196`
- occupying `table_label` vs collapsed primary label (known C3 gap, not fixed) → `lib/reservations/auto-assign.ts:216`
- C3 regression (unmerged 2+4 vs staff merge seats 6) → `tests/unit/reservations/table-fit.test.ts:79`

Reusable pattern: Default `merges: TableMergeRef[] = []` into `toAssignableTables` so omit and empty-list share one unmerged path; document both in JSDoc instead of a skip branch.

### C4 — Inventory is not live floor status

Suggested review order:
- [booking] OOS-only drop after merge collapse → `lib/reservations/auto-assign.ts:195`
- [booking] JSDoc inventory contract (OOS out; seated/reserved/cleaning in) → `lib/reservations/auto-assign.ts:177`
- Live-floor contrast (`status === "available"`) — do not unify with bookability → `lib/reservations/auto-assign.ts:163`
- C4 regression (OOS false; seated/cleaning true) → `tests/unit/reservations/table-fit.test.ts:100`

Reusable pattern: Bookability inventory is `toAssignableTables(…).filter(status !== "out_of_service")`, never `status === "available"` (that stays on live-floor `selectBestTable`). Keep that split in the public JSDoc so a later pass does not restore “does not filter live status.”

### C5 — getAvailableSlots hides unfit slots

Suggested review order:
- [booking] occupancy pass-through (cover-count and table-fit share BW-9) → `lib/reservations/auto-assign.ts:189`, `app/actions/reservations.ts:801`
- [booking] covers AND table-fit → `app/actions/reservations.ts:799`
- [public-api] service-role merge load (not staff-gated `getActiveMerges`) → `app/actions/reservations.ts:668`
- unlabeled capacity stub / omit `id` → `app/actions/reservations.ts:702`
- occupying without `id` skipped → `app/actions/reservations.ts:772`

Reusable pattern: Match `planAutoAssignments` occupancy/buffer trailing defaults on table-fit helpers so guest slot preview cannot drift from restaurant_settings while unit tests keep 90+15.

### C6 — Trigger sequential table-fit reject

Suggested review order:
- [booking] table-fit after cover-count (same P0001) → `supabase/migrations/20260828121224_table_fit_availability.sql:107`
- [booking] taken labels as `TEXT[]` + two-way window → `supabase/migrations/20260828121224_table_fit_availability.sql:117`
- [booking] FP-3 pick from collapsed units (no invented merge; OOS out) → `supabase/migrations/20260828121224_table_fit_availability.sql:151`
- [schema] last-writer function (identical in four files) → `supabase/migrations/20260828121224_table_fit_availability.sql:13`

Reusable pattern: After flattening nested `DECLARE` / dropping trigger temp tables, splice one canonical `CREATE OR REPLACE FUNCTION` body into every last-writer copy and hash-check they stay byte-identical.

### C7 — Concurrent last compatible unit

Suggested review order:
- [booking] date-scoped xact lock after cover-count, before table-fit reads → `supabase/migrations/00000000000000_baseline.sql:289`
- [schema] last-writer copies must stay one body (do not slot-scope the lock) → `supabase/migrations/20260828121224_table_fit_availability.sql:119`, `supabase/migrations/20260818162000_operating_hour_segments.sql:126`, `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:150`
- concurrent last-8-top race → `tests/integration/reservations/atomic-booking.integ.test.ts:131`

Reusable pattern: Two-int `pg_advisory_xact_lock(<issue-id>, epoch-days)` with a classid comment; splice one function body into every last-writer copy and sha256-check. Date-scope (not slot) so overlapping different times still serialize.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Confirm-path table-fit + last-unit lock `[booking]` `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:277` — table-fit after BW-9 cover-count; same P0001 `Booking denied: This time is fully booked.`
- `supabase/migrations/00000000000000_baseline.sql:289` — `pg_advisory_xact_lock(305, days-since-epoch)` after cover-count, before table-fit reads (classid 305 = REAZED-305; date, not slot)
- `supabase/migrations/00000000000000_baseline.sql:293` — taken `TEXT[]` hard claims + two-way elapsed `TIME` occupying window
- `supabase/migrations/20260828121224_table_fit_availability.sql:13` — dated remote forward (`CREATE OR REPLACE` last-writer)
- Last-writer copies must stay one body: `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql`
- `tests/integration/reservations/table-fit.integ.test.ts:44` — sequential second party of 8 vs held 8-top
- `tests/integration/reservations/atomic-booking.integ.test.ts:131` — concurrent last compatible unit
- `tests/integration/reservations/occupancy-window.integ.test.ts` — occupancy seeds are assignment-feasible (one occupying row per table, `party_size = seats`)

### 2. Widget availability table-fit `[booking]` `[public-api]`

- `app/actions/reservations.ts:668` — service-role merge load (not staff-gated `getActiveMerges`)
- `app/actions/reservations.ts:800` — covers AND `canSeatPartyOnTables`
- `app/actions/reservations.ts:702` — unlabeled `{ seats: 40 }` one-unit floor; occupying without `id` stay cover-count-only
- Settings occupancy/buffer pass-through → `app/actions/reservations.ts:801` + `lib/reservations/auto-assign.ts:189`
- `tests/unit/reservations/available-slots.test.ts:313` — covers fit, no compatible table

### 3. Unit-fit helper vs live floor `[booking]`

- `lib/reservations/auto-assign.ts:148` — `pickBestFitTable` status-agnostic smallest-fit
- `lib/reservations/auto-assign.ts:163` — `selectBestTable` still filters `available` (live floor only)
- `lib/reservations/auto-assign.ts:189` — `canSeatPartyOnTables`: collapse via `toAssignableTables`, drop only `out_of_service`
- `lib/reservations/auto-assign.ts:217` — assigned `table_label` is a hard claim; unassigned occupying greedy-place
- C1–C4: `tests/unit/reservations/table-fit.test.ts` (fragmented seats, overlapping consume, staff merge vs speculative, OOS / seated / cleaning)

## Traceability (final)

Run: 2026-08-28 · plan: reazed-305_table-fit_ebc5d205 · issue: REAZED-305

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules BW-12 fragmented seats | `table-fit.test.ts::cannot seat a party when leftover seats are split across undersize units` | `lib/reservations/auto-assign.ts` `canSeatPartyOnTables` | P1 | shipped |
| C2 | booking-rules BW-12 occupying consume | `table-fit.test.ts::refuses a second overlapping party that needs the only fitting unit and still seats a leftover smaller party` | `canSeatPartyOnTables` + `pickBestFitTable` | P0 | shipped |
| C3 | booking-rules BW-12 / FP-3 merge | `table-fit.test.ts::treats an existing staff merge as one unit and does not invent a merge from unmerged tables` | `canSeatPartyOnTables` + `toAssignableTables` | P1 | shipped |
| C4 | booking-rules BW-12 inventory | `table-fit.test.ts::excludes out_of_service and does not treat live seated or cleaning as occupying a future slot` | `canSeatPartyOnTables` OOS-only filter | P1 | shipped |
| C5 | booking-rules BW-12 slots | `available-slots.test.ts::does not offer a slot when covers fit but no compatible table remains` | `app/actions/reservations.ts` `getAvailableSlots` | P0 | shipped |
| C6 | booking-rules BW-12 trigger | `table-fit.integ.test.ts::rejects a second overlapping party of 8 when the only 8-top is already held, with P0001 fully booked and no table_label on a successful small-party insert` | `validate_reservation_availability` in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql` | P0 | shipped |
| C7 | booking-rules BW-12 last-unit race | `atomic-booking.integ.test.ts::serializes concurrent bookings so the last compatible unit is only sold once` | same last-writer SQL + `pg_advisory_xact_lock(305, epoch-days)` | P0 | shipped |

## Run metrics

Run: 2026-08-28 → 2026-08-28 · plan: reazed-305_table-fit_ebc5d205
Criteria: 7 shipped · 0 manual-uat · 7 total
Phases delegated: 22 tdd-red/green/refactor Task calls
Back-loops: C2 extra Red (hard-claim fixture: occupying party of 2 on table `"8"`, not party of 8)
BLOCKED events: none
Issues: 1 filed · 0 attached-to-existing · 10 left on ledger (below floor/cap) — cap 3/run

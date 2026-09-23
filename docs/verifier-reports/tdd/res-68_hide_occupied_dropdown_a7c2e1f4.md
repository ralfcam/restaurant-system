# TDD log — res-68_hide_occupied_dropdown_a7c2e1f4

## C1

Suggested review order:
- occupancy omit [booking] · `lib/reservations/selectable-tables.ts:35-40`
- OccupancyBag `Pick<AssignableReservation>` · `lib/reservations/selectable-tables.ts:11-19`
- claimed windows / skip own id [booking] · `lib/reservations/selectable-tables.ts:43-68`
- write-path sibling (settings vs 90+15) [booking] · `app/actions/reservations.ts:431-456`
- C1 assertions (untouched) · `tests/unit/reservations/selectable-tables.test.ts:43-89`

Reusable pattern: Occupancy bags should `Pick` from `AssignableReservation` instead of a second DTO so dropdown and `assignReservationTable` share one reservation shape.

## C2

Suggested review order:
- skip-own-id keep-path [booking] · `lib/reservations/selectable-tables.ts:56`
- occupancy omit after keep [booking] · `lib/reservations/selectable-tables.ts:37-41`
- OccupancyBag `Pick<AssignableReservation>` · `lib/reservations/selectable-tables.ts:11-19`
- JSDoc: own row is not a foreign claim · `lib/reservations/selectable-tables.ts:21-28`
- write-path sibling skip-self [booking] · `app/actions/reservations.ts:448-449`
- C2 assertions (untouched) · `tests/unit/reservations/selectable-tables.test.ts:91-130`

Reusable pattern: Collect occupying claims with `row.id === candidate.id` skipped so a reservation’s own assigned label stays selectable; do not use `currentLabel` as the omit-exemption (write path already skips `row.id === reservationId`).

## BLOCKED

C3 Red could not start: named `tdd-red` pin `inherit` → `cursor-grok-4.6-high-fast` is over quota. Guard forbids a model override on `tdd-red`/`tdd-green`/`tdd-refactor`. Alternate Task models (composer, gpt, gemini, claude) also quota-blocked. C3–C4 not shipped. C1–C2 preserved on this branch.

Resume 2026-09-23: model pin is grok-4.7; C3 shipped below.

## C3

Suggested review order:
- Floor-status gate [booking] · `lib/reservations/selectable-tables.ts:41`
- Floor-status gate · `lib/reservations/selectable-tables.ts:22`
- Current-label keep · `lib/reservations/selectable-tables.ts:39`
- Occupying-claim omit · `lib/reservations/selectable-tables.ts:40`
- Occupying-claim omit · `lib/reservations/selectable-tables.ts:45`

Reusable pattern: none

## C5

Suggested review order:
- Shared occupancy window [booking] · `app/actions/reservations.ts:669` loadReservationOccupancyWindow
- assignReservationTable uses that window [booking] · `app/actions/reservations.ts:420`
- getReservationOccupancyWindow staff gate [auth] · `app/actions/reservations.ts:688`
- bag minutes, 90+15 only when omitted · `lib/reservations/selectable-tables.ts:24` and `:49`
- page loads and passes occupancyWindow · `app/admin/reservations/page.tsx:24` and `:46`
- required prop, not yet passed into TableAssignment · `components/staff/reservations-manager.tsx:91`

Reusable pattern: one `loadReservationOccupancyWindow` (settings select + existing clamps) feeds both the assign mutation and the staff window reader; `claimedOccupyingLabels` uses those bag minutes for both windows and falls back to 90+15 only when a field is omitted, without clamping itself.

## C4

Suggested review order:
- Occupancy source is the full in-memory list [booking] · `components/staff/reservations-manager.tsx:393`
- Bag map · `components/staff/reservations-manager.tsx:444`
- Settings window passed through · `app/admin/reservations/page.tsx:46` and `components/staff/reservations-manager.tsx:451`
- Dropdown filter stays in the helper [booking] · `components/staff/reservations-manager.tsx:434`

Reusable pattern: pass the unfiltered in-memory reservation list into `TableAssignment`; tab and search filters must not be the occupancy source.

## Suggested Review Order (collated)

Highest-risk first.

- **Occupancy predicate and configured window** [booking]
  - `lib/reservations/selectable-tables.ts:41` — keep a table when it is not `out_of_service` and seats fit
  - `lib/reservations/selectable-tables.ts:49` — `claimedOccupyingLabels` uses bag minutes for both windows
  - `lib/reservations/selectable-tables.ts:24` — omitted minutes fall back to 90+15; the helper does not clamp
- **Settings loader shared with the write path** [booking] [auth]
  - `app/actions/reservations.ts:669` — `loadReservationOccupancyWindow`
  - `app/actions/reservations.ts:420` — `assignReservationTable` uses that window
  - `app/actions/reservations.ts:688` — `getReservationOccupancyWindow` staff gate, then the same loader
- **Live dropdown** [booking]
  - `app/admin/reservations/page.tsx:24` — page loads the window
  - `app/admin/reservations/page.tsx:46` — passes `occupancyWindow`
  - `components/staff/reservations-manager.tsx:393` — full in-memory `reservations`, not the filtered tab
  - `components/staff/reservations-manager.tsx:434` — bag is the 4th argument to `selectableTablesForAssignment`
- **Tests**
  - `tests/unit/reservations/selectable-tables.test.ts` — C1–C3 and C5
  - `tests/unit/components/staff/table-assignment.test.ts` — C4 rendered options

## Traceability (final)

Run: 2026-09-23 · plan: res-68_hide_occupied_dropdown_a7c2e1f4 · issue: RES-68

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-5-DROPDOWN-OCCUPANCY | tests/unit/reservations/selectable-tables.test.ts::omits a table claimed by an overlapping seated or confirmed reservation | lib/reservations/selectable-tables.ts | P1 | shipped |
| C2 | scheduling.md FP-5-DROPDOWN-OCCUPANCY | tests/unit/reservations/selectable-tables.test.ts::keeps the reservation current label when that table is occupying | lib/reservations/selectable-tables.ts | P1 | shipped |
| C3 | scheduling.md FP-5-DROPDOWN-OCCUPANCY | tests/unit/reservations/selectable-tables.test.ts::includes a table claimed only by a non-overlapping occupying reservation | lib/reservations/selectable-tables.ts | P1 | shipped |
| C5 | scheduling.md FP-5-DROPDOWN-OCCUPANCY, FP-3 BW-9 | tests/unit/reservations/selectable-tables.test.ts::uses the configured occupancy duration and safety buffer for occupying windows | lib/reservations/selectable-tables.ts, app/admin/reservations/page.tsx, app/actions/reservations.ts | P1 | shipped |
| C4 | scheduling.md FP-5-DROPDOWN-OCCUPANCY | tests/unit/components/staff/table-assignment.test.ts::table assignment dropdown options follow the in-memory reservation list | components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-23 → 2026-09-23 · plan: res-68_hide_occupied_dropdown_a7c2e1f4
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 9
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 14 left on ledger (below floor) — cap 3/run


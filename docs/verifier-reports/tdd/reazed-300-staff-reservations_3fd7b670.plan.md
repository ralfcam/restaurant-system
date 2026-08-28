# TDD verifier report — REAZED-300 staff reservations (`reazed-300-staff-reservations_3fd7b670.plan`)

FIX run. Linear: [REAZED-300](https://linear.app/realized/issue/REAZED-300) (parent; children 301–303 in this wave).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — Occupancy-window auto-assign taken-set

Suggested review order:
- Occupying-window taken-set `[booking]`
  - `lib/reservations/auto-assign.ts:99` `occupyingWindowMinutes` (BW-9 via `nextBookableTime`; wrap → 24:00)
  - `lib/reservations/auto-assign.ts:113` `occupyingWindowsOverlap` (half-open)
  - `lib/reservations/auto-assign.ts:179` `planAutoAssignments` defaults 90+15
  - `lib/reservations/auto-assign.ts:191` same-date active claims seed `[booking]`
  - `lib/reservations/auto-assign.ts:210` due loop: windowed `taken` + in-batch `claims.push` `[booking]`
  - `tests/unit/reservations/auto-assign.test.ts:200` lunch/dinner reuse vs 18:00/18:30 refuse
- Live settings still unwired `[booking]`
  - `app/actions/reservations.ts:460` `planAutoAssignments(..., now)` — BW-9 defaults only

Reusable pattern: For same-date BW-9 exclusivity, take exclusive end from `nextBookableTime` then map a wrapped clock (`endMin <= startMin`) to 24:00 — do not compare wrapped `HH:MM` strings across midnight.

### C2 — Manual assign overlap reject

Suggested review order:
- Occupancy-window write reject `[booking]`
  - `app/actions/reservations.ts:378` skip unassign (`null`) and same-row same-label reassign
  - `app/actions/reservations.ts:379` live `restaurant_settings` → `occupyingWindowMinutes` `[booking]`
  - `app/actions/reservations.ts:398` occupant `select/eq/in/order` (mock-compat; label filtered in memory) `[booking]`
  - `app/actions/reservations.ts:407` id/label filter + `occupyingWindowsOverlap` → `{ error }` `[public-api]`
- Planner still hits this write path `[booking]`
  - `app/actions/reservations.ts:511` `autoAssignDueReservations` → `assignReservationTable` (planned row dropped if write-path window disagrees)
- Pin
  - `tests/unit/reservations/assign-table.test.ts:73` 19:00 vs 19:30 reject; unassign `{}`; same-label reassign `{}`

Reusable pattern: Staff-action unit mocks that only implement `select → eq → in → order` (see `auto-assign-action.test.ts`) cannot take an extra `.eq("table_label")` after `.in()` — keep that chain and apply extra predicates in memory, with a `// minimality:` note.

### C3 — Manual assign undersize reject

Suggested review order:
- Write-path seat-fit `[booking]` `[public-api]`
  - `app/actions/reservations.ts:352` `requireStaffUser` `[auth]`
  - `app/actions/reservations.ts:358` `select("label, seats")`; unassign → `{ data: null }`
  - `app/actions/reservations.ts:370` reservation select includes `party_size`
  - `app/actions/reservations.ts:375` closed statuses still unassignable
  - `app/actions/reservations.ts:377` `table && table.seats < party_size` → `{ error }` `[booking]` `[public-api]`
- Unassign skip / C2 overlap left intact
  - `app/actions/reservations.ts:377` null `table` skips fit
  - `app/actions/reservations.ts:379` overlap block unchanged
- Pin
  - `tests/unit/reservations/assign-table.test.ts:170` party 8 on 2-top `{ error }`; party 4 on 4-top `{}`

Reusable pattern: Select `seats` with the table row and `party_size` with the reservation, then `if (table && table.seats < party_size)` before overlap; unassign is a null table, not a flag — leave dropdown filtering to its own criterion.

### C4 — Dropdown omits undersize except current label

Suggested review order:
- Dropdown fit filter `[booking]`
  - `lib/reservations/selectable-tables.ts:11` current-label keep
  - `lib/reservations/selectable-tables.ts:13` `available && seats >= partySize`
- TableAssignment wiring `[public-api]`
  - `components/staff/reservations-manager.tsx:17` named import
  - `components/staff/reservations-manager.tsx:389` `partySize` + `tableLabel` args
  - `components/staff/reservations-manager.tsx:410` options from helper result
- Pin
  - `tests/unit/reservations/selectable-tables.test.ts:24` party 8 omits 2/4, keeps 8; current `"1"` kept

Reusable pattern: Extract a client-safe leaf helper (`import type` only — do not import `auto-assign`) for dropdown inventory (available+fit, current-label exception) so the manager source-string pin can name the function without mounting the component.

### C5 — Date list fail-closed Result

Suggested review order:
- Fail-closed Result `[public-api]` `[auth]`
  - `app/actions/reservations.ts:188` return type `{ reservations, error? }`
  - `app/actions/reservations.ts:191` `requireStaffUser` → `{ reservations: [], error: "Unauthorized." }` `[auth]`
  - `app/actions/reservations.ts:194` `createServiceClient` + date `select` `[security]`
  - `app/actions/reservations.ts:202` query fail → `{ reservations: [], error: "Could not load reservations." }` `[public-api]`
  - `app/actions/reservations.ts:207` success empty omits `error`
- Callers unwrap collection only `[public-api]`
  - `app/admin/reservations/page.tsx:20` `[{ reservations }, authUser]` — `error` not passed into the manager
  - `app/actions/reservations.ts:539` `getFloorSnapshot` unwraps `{ reservations }` `[public-api]`
  - `components/staff/reservations-manager.tsx:112` `result.reservations` (C6 owns error vs empty vs filter copy)
- Pin
  - `tests/unit/reservations/get-by-date.test.ts:73` auth fail / query fail / success empty

Reusable pattern: Convert a staff list from `return []` to `{ rows: [], error }` using the sibling stable strings (`Unauthorized.` / `Could not load reservations.`), omit `error` on success (do not set `error: undefined`), and treat typecheck-only caller unwraps as expected until a UI criterion owns `.error`.

### C6 — Error vs empty vs filter copy

Suggested review order:
- STAFF-LIST copy helper `[public-api]`
  - `lib/reservations/list-empty-copy.ts:1` STAFF-LIST contract (error → flags; counts unused)
  - `lib/reservations/list-empty-copy.ts:6` `FILTER_EMPTY` / `DATE_EMPTY`
  - `lib/reservations/list-empty-copy.ts:20` `if (error) return error` `[public-api]`
  - `lib/reservations/list-empty-copy.ts:21` filter flags → filter-empty
  - `lib/reservations/list-empty-copy.ts:22` else date-empty
- Manager Result unwrap + empty branch `[public-api]`
  - `components/staff/reservations-manager.tsx:17` named import
  - `components/staff/reservations-manager.tsx:101` `listError` state
  - `components/staff/reservations-manager.tsx:114` `result.reservations` / `result.error` + toast `[public-api]`
  - `components/staff/reservations-manager.tsx:332` helper call (`error: listError`, filter flags)
- Pin
  - `tests/unit/reservations/list-empty-copy.test.ts:13` three copy states + source-string wiring

Reusable pattern: Client-safe copy helper with error-then-flag branching; keep unused snapshot fields on the input type so the object-literal pin typechecks without the helper re-deriving filters; pin the manager with the helper name plus Result unwrap (`.reservations` / `.error`), not an inlined filter sentence.

## Suggested Review Order (collated)

Highest-risk first. Collated from C1–C6 Refactor sections.

### 1. Manual write: overlap + seat fit `[booking]` `[public-api]` `[auth]`

- `app/actions/reservations.ts:352` `requireStaffUser` `[auth]`
- `app/actions/reservations.ts:358` `select("label, seats")`; unassign → `{ data: null }`
- `app/actions/reservations.ts:375` closed statuses still unassignable
- `app/actions/reservations.ts:377` `table && table.seats < party_size` → `{ error }` `[booking]`
- `app/actions/reservations.ts:378` skip unassign (`null`) and same-row same-label reassign
- `app/actions/reservations.ts:379` live `restaurant_settings` → `occupyingWindowMinutes` `[booking]`
- `app/actions/reservations.ts:398` occupant `select/eq/in/order` (mock-compat; label filtered in memory)
- `app/actions/reservations.ts:407` id/label filter + `occupyingWindowsOverlap` → `{ error }` `[public-api]`
- `app/actions/reservations.ts:511` `autoAssignDueReservations` → `assignReservationTable`
- Pins: `tests/unit/reservations/assign-table.test.ts:73` overlap; `:170` undersize

### 2. Auto-assign occupying-window taken-set `[booking]`

- `lib/reservations/auto-assign.ts:99` `occupyingWindowMinutes` (BW-9 via `nextBookableTime`; wrap → 24:00)
- `lib/reservations/auto-assign.ts:113` `occupyingWindowsOverlap` (half-open)
- `lib/reservations/auto-assign.ts:179` `planAutoAssignments` defaults 90+15
- `lib/reservations/auto-assign.ts:191` same-date active claims seed `[booking]`
- `lib/reservations/auto-assign.ts:210` due loop: windowed `taken` + in-batch `claims.push` `[booking]`
- Pin: `tests/unit/reservations/auto-assign.test.ts:200` lunch/dinner reuse vs 18:00/18:30 refuse

### 3. Date list fail-closed Result `[public-api]` `[auth]` `[security]`

- `app/actions/reservations.ts:188` return type `{ reservations, error? }`
- `app/actions/reservations.ts:191` `requireStaffUser` → `{ reservations: [], error: "Unauthorized." }` `[auth]`
- `app/actions/reservations.ts:194` `createServiceClient` + date `select` `[security]`
- `app/actions/reservations.ts:202` query fail → `{ reservations: [], error: "Could not load reservations." }` `[public-api]`
- `app/actions/reservations.ts:207` success empty omits `error`
- `app/admin/reservations/page.tsx:20` unwraps `{ reservations }` (SSR still drops `.error`)
- `app/actions/reservations.ts:539` `getFloorSnapshot` unwraps `{ reservations }` `[public-api]`
- Pin: `tests/unit/reservations/get-by-date.test.ts:73`

### 4. Dropdown undersize omit `[booking]` `[public-api]`

- `lib/reservations/selectable-tables.ts:11` current-label keep
- `lib/reservations/selectable-tables.ts:13` `available && seats >= partySize`
- `components/staff/reservations-manager.tsx:17` named import
- `components/staff/reservations-manager.tsx:389` `partySize` + `tableLabel` args
- Pin: `tests/unit/reservations/selectable-tables.test.ts:24`

### 5. Error vs empty vs filter copy `[public-api]`

- `lib/reservations/list-empty-copy.ts:20` `if (error) return error` `[public-api]`
- `lib/reservations/list-empty-copy.ts:21` filter flags → filter-empty
- `lib/reservations/list-empty-copy.ts:22` else date-empty
- `components/staff/reservations-manager.tsx:114` `result.reservations` / `result.error` + toast `[public-api]`
- `components/staff/reservations-manager.tsx:332` helper call
- Pin: `tests/unit/reservations/list-empty-copy.test.ts:13`

## Traceability (final)

Run: 2026-08-28 · plan: reazed-300-staff-reservations_3fd7b670.plan · issue: REAZED-300

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 / FP-3 occupancy-window taken-set | scheduling.md FP-3 | tests/unit/reservations/auto-assign.test.ts::reuses a table when occupying windows do not overlap and refuses when they do | lib/reservations/auto-assign.ts | P0 | shipped |
| C2 / FP-5 overlap write | scheduling.md FP-5 | tests/unit/reservations/assign-table.test.ts::rejects assigning a table whose occupying window overlaps another confirmed or seated reservation | app/actions/reservations.ts assignReservationTable | P0 | shipped |
| C3 / FP-5 fit write | scheduling.md FP-5 | tests/unit/reservations/assign-table.test.ts::rejects assigning a table with fewer seats than party size | app/actions/reservations.ts assignReservationTable | P0 | shipped |
| C4 / FP-5 fit dropdown | scheduling.md FP-5 | tests/unit/reservations/selectable-tables.test.ts::omits undersize tables except the reservation current label | lib/reservations/selectable-tables.ts, components/staff/reservations-manager.tsx TableAssignment | P1 | shipped |
| C5 / STAFF-LIST action | booking-rules.md STAFF-LIST | tests/unit/reservations/get-by-date.test.ts::does not present auth or query failure as a successful empty list | app/actions/reservations.ts getReservationsByDate | P1 | shipped |
| C6 / STAFF-LIST UI | booking-rules.md STAFF-LIST | tests/unit/reservations/list-empty-copy.test.ts::distinguishes load error, empty date, and filter-empty copy | lib/reservations/list-empty-copy.ts, components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-08-28 → 2026-08-28 · plan: reazed-300-staff-reservations_3fd7b670.plan
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 18 (tdd-red / tdd-green / tdd-refactor × 6)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · ledger overflow below floor/cap (see 4C) — cap 3/run


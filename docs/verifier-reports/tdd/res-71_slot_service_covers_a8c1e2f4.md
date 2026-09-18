# TDD log — res-71_slot_service_covers_a8c1e2f4

### C1

Suggested review order:
- [booking] `app/actions/reservations.ts:846` — exact-time cover map (not BW-9 window)
- [booking] `app/actions/reservations.ts:852` — occupying exact-time `party_size` sum
- [booking] [public-api] `app/actions/reservations.ts:904` — segment allowlist + slot `max_covers` AND BW-9/BW-12
- `app/actions/reservations.ts:713` — BW-18 unavailability contract on the public helper
- `lib/reservations/operating-hours.ts:31` — optional `bookable_slots` on `OperatingSegment`

Reusable pattern: Keep BW-18 exact-time covers in a dedicated map (`occupyingCoversByExactTime`); do not reuse BW-9 `bookedBySlot` or 20:00 will inherit a 19:00 hold.

### C2

Suggested review order:
- [booking] BW-19 accumulate by stable segment key — `app/actions/reservations.ts:850-873`
- [booking] BW-19 lookup AND-ed with BW-18 / BW-9 / BW-12 — `app/actions/reservations.ts:924-948`
- [public-api] `getAvailableSlots` unavailability contract (JSDoc) — `app/actions/reservations.ts:706-718`
- OperatingSegment `max_covers` type — `lib/reservations/operating-hours.ts:33-34`

Reusable pattern: When summing covers by `assignSegmentForTime`, key the Map by `sort_order` + normalized `opens_at`, not the segment object.

### C3

Suggested review order:
- [booking] [public-api] `lib/reservations/operating-hours.ts:379` — `coversFitSlotAndService` (allowlist miss; null max = no cap; `sum + party > max`)
- [booking] `app/actions/reservations.ts:927` — `getAvailableSlots` uses the helper (BW-21 one formula) AND-ed with BW-9 / BW-12
- [booking] `app/actions/reservations.ts:849` — exact-time map vs BW-9 `bookedBySlot`; service map keyed by `sort_order` + `opens_at`
- `app/actions/reservations.ts:932` — occupancy lookup goes through `normalizeTime(time)`
- `lib/reservations/operating-hours.ts:31` — optional `bookable_slots` / `max_covers` on `OperatingSegment`

Reusable pattern: Keep BW-18/19 in `coversFitSlotAndService` as occupancy-sum predicates (caller supplies exact-time slot + all-day service); never reuse BW-9 `bookedBySlot` inside the helper.

### C4

Suggested review order:
- [booking] [public-api] `app/actions/reservations.ts:939` — `available: slotAndServiceFit && coversFit && tableFit` (BW-22 AND; pre-satisfied by C1–C3 Green)
- [booking] `app/actions/reservations.ts:937-940` — BW-22 comment on that conjunct
- `app/actions/reservations.ts:913-921` — `coversFit` (BW-9) and `tableFit` (BW-12) still computed independently before the AND

Reusable pattern: Pre-satisfied AND criterion: pin the spec id on the existing conjunct (`// BW-22: …`) instead of extracting a helper or rewriting a predicate that already passes.

### C5

Suggested review order:
- [booking] `supabase/migrations/00000000000000_baseline.sql:474` — BW-18/19 after lock + inventory + table-fit (exact-time slot; BW-1 service assignment)
- [security] `supabase/migrations/00000000000000_baseline.sql:378` — BW-15 date lock already held before those SELECTs
- [schema] `supabase/migrations/00000000000000_baseline.sql:20` — named `max_covers` CHECK; `bookable_slots` JSONB `[]`
- [schema] `supabase/migrations/20260918140655_slot_service_cover_limits.sql:12` — remotes get the same columns + comments
- [public-api] `supabase/migrations/00000000000000_baseline.sql:563` — `replace_operating_windows` INSERT of `max_covers` / `bookable_slots`
- [security] `supabase/migrations/20260918140655_slot_service_cover_limits.sql:355` — EXECUTE still `service_role` only

Reusable pattern: Hash the full `CREATE OR REPLACE FUNCTION … $$;` block across every last-writer file before and after a SQL refactor; keep that hash identical, and name baseline CHECKs the same as the forward (`operating_windows_max_covers_check`).

### C6

Suggested review order:
- [booking] `lib/reservations/operating-hours.ts:438` — optional `slotIntervalMinutes`; clamp + default 30
- [booking] `lib/reservations/operating-hours.ts:489` — empty/omitted list skipped
- [booking] `lib/reservations/operating-hours.ts:503` — half-open `[opens, closes)`
- [booking] `lib/reservations/operating-hours.ts:506` — `(minutes - opens) % interval === 0`
- [public-api] `app/actions/availability.ts:225` — `upsertOperatingWindows` still one-arg
- `components/staff/scheduling-manager.tsx:541` — read-only `scheduling-slot-row` / `scheduling-slot-time`

Reusable pattern: Optional second arg on `validateOperatingDays` must clamp with `DEFAULT_SLOT_INTERVAL_MINUTES` when omitted so existing one-arg callers stay valid.

### C7

Suggested review order:
- [booking] `lib/reservations/operating-hours.ts:509` — CL-2 `slotMax` bind
- [booking] `lib/reservations/operating-hours.ts:511` — integer ≥ 1 gate (`!= null` keeps omit/null)
- `components/staff/scheduling-manager.tsx:559` — `scheduling-slot-max-covers` display span

Reusable pattern: Optional cover max: `value != null && (!Number.isInteger(value) || value < 1)`; name the local `slotMax`; do not extract a helper until the service-max caller exists.

### C8

Suggested review order:
- [booking] `lib/reservations/operating-hours.ts:438` — shared `isInvalidCoverMax`
- [booking] `lib/reservations/operating-hours.ts:498` — CL-3 `segment.max_covers` (before empty-slots continue)
- [booking] `lib/reservations/operating-hours.ts:517` — CL-2 `slot.max_covers` (same helper)
- `components/staff/scheduling-manager.tsx:527` — `scheduling-service-max-covers` display span

Reusable pattern: Extract `isInvalidCoverMax` (`value != null && (!Number.isInteger(value) || value < 1)`) only once both CL-2 and CL-3 call it; document omit/null on the helper, not at each site.

### C9

Suggested review order:
- [public-api] `supabase/migrations/00000000000000_baseline.sql:572` — `replace_operating_windows` INSERT of `max_covers` / `bookable_slots` (C5; C9 persist surface)
- [schema] `lib/reservations/operating-hours.ts:572` — CL-4 pin: flatten must not emit those columns
- [booking] `app/actions/availability.ts:25` — `WINDOW_COLUMNS` still `guest_note`-only
- `tests/integration/scheduling/cover-limits-persist.integ.test.ts:72` — RPC persist + atomic edit

Reusable pattern: Pre-satisfied persist criterion: pin `// CL-4` on the flatten/RPC boundary instead of adding untested flatten/`WINDOW_COLUMNS` columns.

### C9b (CL-4 Save/load back-loop)

Suggested review order:
- [public-api] `lib/reservations/operating-hours.ts:591` — flatten emits `max_covers` / `bookable_slots` on open rows
- [public-api] `app/actions/availability.ts:25` — `WINDOW_COLUMNS` names both fields
- `lib/reservations/operating-hours.ts:570` — `groupRowsByDay` omit-empty map-back
- `components/staff/scheduling-manager.tsx:76` — `toOperatingDays` copies both fields

Reusable pattern: OH-SAVE column back-loop — flatten always emits `NULL`/`[]` for new ledger columns; `groupRowsByDay` / `toOperatingDays` omit-empty like `guest_note`; `WINDOW_COLUMNS` must name every flatten key.

## Suggested Review Order (collated)

Highest-risk first.

- **Trigger + last-writer SQL** [booking] [schema] [security]
  - `supabase/migrations/00000000000000_baseline.sql:20` — `max_covers` CHECK; `bookable_slots` JSONB `[]`
  - `supabase/migrations/00000000000000_baseline.sql:378` — BW-15 date lock held before slot/service SELECTs
  - `supabase/migrations/00000000000000_baseline.sql:474` — BW-18/19 after lock + inventory + table-fit
  - `supabase/migrations/00000000000000_baseline.sql:572` — `replace_operating_windows` INSERT of cover fields
  - `supabase/migrations/20260918140655_slot_service_cover_limits.sql:12` — dated forward for remotes
- **Guest formula** [booking] [public-api]
  - `lib/reservations/operating-hours.ts:379` — `coversFitSlotAndService` (allowlist miss; null max = no cap)
  - `app/actions/reservations.ts:846` — exact-time cover map (not BW-9 window)
  - `app/actions/reservations.ts:850-873` — BW-19 by `sort_order` + `opens_at`
  - `app/actions/reservations.ts:939` — `available: slotAndServiceFit && coversFit && tableFit` (BW-22)
- **Staff validate + chrome** [booking] [public-api]
  - `lib/reservations/operating-hours.ts:438` — `isInvalidCoverMax` + optional interval
  - `lib/reservations/operating-hours.ts:498` — CL-3 service max before empty-slots continue
  - `lib/reservations/operating-hours.ts:503-517` — CL-1 window/grid + CL-2 slot max
  - `components/staff/scheduling-manager.tsx:527` — service/slot testids (display-only)
- **Known load/save gap** [booking]
  - `app/actions/availability.ts:25` — `WINDOW_COLUMNS` omits cover fields
  - `lib/reservations/operating-hours.ts:572` — flatten does not emit them (CL-4 pin)

## Traceability (final)

Run: 2026-09-18 · plan: res-71_slot_service_covers_a8c1e2f4 · issue: RES-71

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md BW-18 | tests/unit/reservations/available-slots.test.ts::does not offer a slot when the party would exceed that slot's cover limit | app/actions/reservations.ts, lib/reservations/operating-hours.ts | P0 | shipped |
| C2 | booking-rules.md BW-19 | tests/unit/reservations/available-slots.test.ts::does not offer a slot when the party would exceed the service cover limit | app/actions/reservations.ts, lib/reservations/operating-hours.ts | P0 | shipped |
| C3 | booking-rules.md BW-21 | tests/unit/reservations/cover-limits.test.ts::coversFitSlotAndService rejects over slot or service and accepts when both have room | lib/reservations/operating-hours.ts | P0 | shipped |
| C4 | booking-rules.md BW-22 | tests/unit/reservations/available-slots.test.ts::does not offer a slot when cover limits have room but no compatible table remains | app/actions/reservations.ts | P0 | shipped |
| C5 | booking-rules.md BW-20 | tests/integration/reservations/cover-limits.integ.test.ts::rejects an occupying insert that would exceed the slot or service cover limit | supabase/migrations/00000000000000_baseline.sql, supabase/migrations/20260918140655_slot_service_cover_limits.sql | P0 | shipped |
| C6 | scheduling.md CL-1 | tests/unit/scheduling/cover-limits.test.ts::accepts on-grid service slots and rejects off-grid or outside-window times | lib/reservations/operating-hours.ts, components/staff/scheduling-manager.tsx | P1 | shipped |
| C7 | scheduling.md CL-2 | tests/unit/scheduling/cover-limits.test.ts::allows different max_covers on slots in the same service and rejects non-positive values | lib/reservations/operating-hours.ts, components/staff/scheduling-manager.tsx | P1 | shipped |
| C8 | scheduling.md CL-3 | tests/unit/scheduling/cover-limits.test.ts::accepts a service max_covers of at least 1 and rejects invalid values | lib/reservations/operating-hours.ts, components/staff/scheduling-manager.tsx | P1 | shipped |
| C9 | scheduling.md CL-4 | tests/integration/scheduling/cover-limits-persist.integ.test.ts::replace_operating_windows persists and updates slot and service cover limits | supabase/migrations/00000000000000_baseline.sql | P1 | shipped |
| linked-remote-forward | booking-rules.md BW-20 | — | — | P2 | manual-uat |
| scheduling-chrome-density | scheduling.md CL-4 | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-09-18 → 2026-09-18 · plan: res-71_slot_service_covers_a8c1e2f4
Criteria: 9 shipped · 2 manual-uat · 11 total
Phases delegated: 25
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 1 attached-to-existing · 35 left on ledger (below floor/cap) — cap 3/run

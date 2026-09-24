# TDD log — pr120_routed_bugs_fix_8b3fc479

## C1

Suggested review order:
- fail-closed new-label guard [booking] · `app/actions/reservations.ts:435-443`
- settings SELECT log and `settingsReadFailed` · `app/actions/reservations.ts:692-718`
- display path drops the flag and keeps 90+15 · `app/actions/reservations.ts:735-739`

Reusable pattern: none

## C2

Suggested review order:
- staff gate before any settings read or RPC [auth] · `app/actions/availability.ts:235`
- interval read only when an open segment has bookable slots · `app/actions/availability.ts:240`
- SELECT error logs and returns without the RPC [booking] · `app/actions/availability.ts:253`
- absent/null coalesces to 30, then `validateOperatingDays`, then `replace_operating_windows` [booking] · `app/actions/availability.ts:260` and `:269`

Reusable pattern: a staff write that must honor `slot_interval_minutes` fail-closes on settings SELECT (log, catalog key, skip RPC); do not reuse the fail-open loaders.

## C3

Suggested review order:
- staff gate before the settings read [auth] · `app/actions/availability.ts:235`
- SELECT error logs and returns `errors.availability.settingsLoadFailed` without `replace_operating_windows` [booking] · `app/actions/availability.ts:253`
- absent/null interval still coalesces to 30 · `app/actions/availability.ts:260`
- catalog copy · `messages/en.json:648`, `messages/fr.json:648`

Reusable pattern: none

## C4

Suggested review order:
- duplicate-after-normalize input check [booking] · `lib/reservations/operating-hours.ts:551` then `:576`
- catalog `{day}` strings · `messages/en.json:639`, `messages/fr.json:639`

Reusable pattern: Reject a repeated bookable time with a per-segment `Set` of `normalizeTime(slot.time)`, and leave that check after `invalidSlotMax` so the existing error precedence stays.

## C5

Suggested review order:
- hours-grid preview uses the restaurant interval · `app/admin/scheduling/page.tsx:40` passes `getSlotIntervalMinutes()`
- `components/staff/scheduling-manager.tsx:178` feeds it to `validateOperatingDays`
- Save stays disabled on that error [booking] · `components/staff/scheduling-manager.tsx:673`

Reusable pattern: none

## Suggested Review Order (collated)

Highest-risk first.

- **Fail-closed settings reads** [auth] [booking]
  - `app/actions/availability.ts:235` — staff gate before any settings read or RPC [auth]
  - `app/actions/reservations.ts:435-443` — new non-null label refused with `errors.reservation.assignFailed` when the settings SELECT fails [booking]
  - `app/actions/reservations.ts:692-718` — `loadReservationOccupancyWindow` logs the SELECT error and sets `settingsReadFailed`
  - `app/actions/reservations.ts:735-739` — dropdown display drops the flag and keeps 90+15
  - `app/actions/availability.ts:253` — slotted save logs and returns `errors.availability.settingsLoadFailed` without `replace_operating_windows` [booking]
  - `app/actions/availability.ts:260` — absent row or null column still coalesces to 30
- **Slot grid and duplicate times** [booking]
  - `app/actions/availability.ts:240` — interval read only when an open segment has bookable slots
  - `app/actions/availability.ts:269` — `replace_operating_windows` runs only after validation [booking]
  - `lib/reservations/operating-hours.ts:551` — per-segment `Set` of `normalizeTime(slot.time)`
  - `lib/reservations/operating-hours.ts:576` — `errors.scheduling.duplicateSlotTime` after `invalidSlotMax` [booking]
- **Save preview interval** [booking]
  - `app/admin/scheduling/page.tsx:40` — `getSlotIntervalMinutes()` passed into `SchedulingManager`
  - `components/staff/scheduling-manager.tsx:178` — preview `validateOperatingDays` uses that interval
  - `components/staff/scheduling-manager.tsx:673` — Save stays disabled on the off-grid error [booking]
- **Catalog copy**
  - `messages/en.json:639`, `messages/fr.json:639` — `errors.scheduling.duplicateSlotTime`
  - `messages/en.json:648`, `messages/fr.json:648` — `errors.availability.settingsLoadFailed`

## Traceability (final)

Run: 2026-09-24 · plan: pr120_routed_bugs_fix_8b3fc479 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-5-SETTINGS-READ-FAIL | tests/unit/reservations/assign-table.test.ts::refuses a new table label when restaurant_settings cannot be read | app/actions/reservations.ts | P0 | shipped |
| C2 | scheduling.md CL-1-INTERVAL | tests/unit/availability/upsert-slot-interval.test.ts::validates bookable slots on the configured slot-interval grid | app/actions/availability.ts | P1 | shipped |
| C3 | scheduling.md CL-1-INTERVAL | tests/unit/availability/upsert-slot-interval.test.ts::fails closed when the slot interval cannot be read | app/actions/availability.ts, messages/en.json, messages/fr.json | P0 | shipped |
| C4 | scheduling.md CL-1-DUP | tests/unit/scheduling/cover-limits.test.ts::rejects duplicate bookable-slot times in one segment | lib/reservations/operating-hours.ts, messages/en.json, messages/fr.json | P1 | shipped |
| C5 | scheduling.md CL-1-INTERVAL | tests/unit/components/staff/scheduling-manager-interval.test.ts::Save preview validates on the configured interval | components/staff/scheduling-manager.tsx, app/admin/scheduling/page.tsx | P2 | shipped |

## Run metrics

Run: 2026-09-24 → 2026-09-25 · plan: pr120_routed_bugs_fix_8b3fc479
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 17
Back-loops: C5: 2 extra Red cycles (NextIntlClientProvider children typecheck, then eslint react/no-children-prop)
BLOCKED events: 1 — C5 refactor lint (`react/no-children-prop`); cleared by a test-only `jsx()` fix before close-out
Issues: pending 4C

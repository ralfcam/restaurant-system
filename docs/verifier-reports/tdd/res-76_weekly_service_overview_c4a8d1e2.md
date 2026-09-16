# TDD log: res-76_weekly_service_overview_c4a8d1e2

### C1

Suggested review order:
- Week identity (Monday-first restaurant-calendar dates) [public-api]
  - `lib/floor/weekly-service-overview.ts:14` `buildWeeklyServiceOverview`
  - `lib/floor/weekly-service-overview.ts:22` monday of selected YYYY-MM-DD
  - `lib/floor/weekly-service-overview.ts:58` `mondayContaining`
  - `lib/floor/weekly-service-overview.ts:46` UTC weekday of ISO date
  - `lib/floor/weekly-service-overview.ts:51` `addCalendarDays`
- Configured services only / closed-day columns [booking]
  - `lib/floor/weekly-service-overview.ts:21` weekday → `OperatingDay` map
  - `lib/floor/weekly-service-overview.ts:35` `configuredServices`
  - `lib/floor/weekly-service-overview.ts:38` `is_closed` or no segments → `[]`

Reusable pattern: Monday-first restaurant-calendar week from a YYYY-MM-DD uses UTC date math (`Date.UTC` + `getUTCDay`), not `getDayOfWeekInRestaurantTZ` (local-`Date` construction), then `addCalendarDays(monday, 0..6)`

### C2

Suggested review order:
- BW-4 staff-label fallback [booking]
  - `lib/floor/weekly-service-overview.ts:45` `configuredServices` segment map
  - `lib/floor/weekly-service-overview.ts:46` `label?.trim()` keeps typed names; whitespace/null → range
  - `lib/floor/weekly-service-overview.ts:48` `normalizeTime(opens)–normalizeTime(closes)` [booking]
  - `lib/reservations/operating-hours.ts:227` private `segmentTimeRange` (guest twin; still not shared)
- Week identity C2 indexes into [public-api]
  - `lib/floor/weekly-service-overview.ts:18` `buildWeeklyServiceOverview`
  - `lib/floor/weekly-service-overview.ts:26` Monday-first `days[0]` / `days[1]` = Mon/Tue labels

Reusable pattern: BW-4 blank-label fallback is `segment.label?.trim() || \`${normalizeTime(opens)}–${normalizeTime(closes)}\`` (en-dash) — do not concatenate raw `opens_at`/`closes_at`

### C3

Suggested review order:
- Flag reuse / no second capacity formula [booking] [public-api]
  - `lib/floor/weekly-service-overview.ts:32` optional `slotsByDate`
  - `lib/floor/weekly-service-overview.ts:44` missing date → `[]` → `fully_booked`
  - `lib/floor/weekly-service-overview.ts:62` per-segment status
  - `lib/floor/weekly-service-overview.ts:66` `statusFromExistingFlags` [booking]
  - `lib/floor/weekly-service-overview.ts:74` `slot.available` + `assignSegmentForTime` identity
  - `lib/reservations/operating-hours.ts:196` BW-1 assignment (reused, not reimplemented)
- Server-action type import [public-api]
  - `lib/floor/weekly-service-overview.ts:10` `import type { SlotAvailability }` from `"use server"` module

Reusable pattern: WA-3/WA-4 status is `slots.some(s => s.available && assignSegmentForTime(s.time, segments) === segment)` — consume existing flags only; membership is BW-1 object identity (same as `groupBookableSlots`), never a second cover sum.

### C4

Suggested review order:
- Week-shift contract [public-api]
  - `lib/floor/weekly-service-overview.ts:28` `shiftSelectedWeek`
  - `lib/floor/weekly-service-overview.ts:29` `addCalendarDays(date, weekDelta * 7)`
  - `lib/floor/weekly-service-overview.ts:91` UTC YYYY-MM-DD arithmetic
- Week identity after navigation [booking]
  - `lib/floor/weekly-service-overview.ts:32` rebuild via `buildWeeklyServiceOverview`
  - `lib/floor/weekly-service-overview.ts:42` `mondayContaining(selectedDate)`
  - `lib/floor/weekly-service-overview.ts:51` `slotsByDate` keyed by the new ISO dates
- Availability recompute [booking]
  - `lib/floor/weekly-service-overview.ts:73` `statusFromExistingFlags` on the shifted week’s flags

Reusable pattern: `shiftSelectedWeek(date, weekDelta)` is `addCalendarDays(date, weekDelta * 7)` on YYYY-MM-DD (UTC calendar), not TZ-instant math and not a Monday snap — `buildWeeklyServiceOverview` owns week identity via `mondayContaining`.

### C5

Suggested review order:
- Reload contract — same week+segments, new `slotsByDate` [booking] [public-api]
  - `lib/floor/weekly-service-overview.ts:32` `buildWeeklyServiceOverview` (fresh call, no module cache)
  - `lib/floor/weekly-service-overview.ts:39` optional `slotsByDate`
  - `lib/floor/weekly-service-overview.ts:51` `slotsByDate?.[date] ?? []` [booking]
  - `lib/floor/weekly-service-overview.ts:73` `statusFromExistingFlags` rereads flags
  - `lib/floor/weekly-service-overview.ts:79` `slot.available` + BW-1 identity
- Characterization of the flip
  - `tests/unit/floor/weekly-service-overview.test.ts:228` `reloaded slot availability flips service status`

Reusable pattern: Already-green WA-6: characterize refresh with three calls to the same pure builder (same week+segments, three `SlotAvailability` maps) — do not add a `selectedDate`/`operatingDays` memo that ignores `slotsByDate`.

### C6

Suggested review order:
- Staff-gated week load [auth] [booking]
  - `app/admin/page.tsx:31` `requireStaffUser` before windows/slots
  - `app/admin/page.tsx:35` `getAllOperatingWindowsMap` → same objects into rebuild
  - `app/admin/page.tsx:39` `getAvailableSlots(date, 1)` fan-out [booking]
  - `app/admin/page.tsx:44` second `buildWeeklyServiceOverview` with `slotsByDate`
- Selected-week contract [public-api]
  - `app/admin/page.tsx:57` `await searchParams` (Next 16)
  - `app/admin/page.tsx:26` / `app/admin/page.tsx:58` `DATE_RE` → today fallback
  - `app/admin/page.tsx:208` mount `WeeklyServiceOverview`
- Week chrome / WA-5 [public-api]
  - `components/staff/weekly-service-overview.tsx:17` `shiftSelectedWeek(±1)`
  - `components/staff/weekly-service-overview.tsx:35` `?week=` prev/next Links
  - `components/staff/weekly-service-overview.tsx:62` green/red + accessible status
- Helper types [public-api]
  - `lib/floor/weekly-service-overview.ts:23` `WeeklyOverviewDay`
  - `lib/floor/weekly-service-overview.ts:29` `shiftSelectedWeek` (no Monday snap)

Reusable pattern: Staff Dashboard week chrome is a Server Component: `await searchParams`, local `DATE_RE` on `?week=`, `requireStaffUser`, date skeleton from `buildWeeklyServiceOverview`, `Promise.all(getAvailableSlots(date, 1))`, rebuild with the same `operatingDays` objects; prev/next are `<Link href={\`/admin?week=${shiftSelectedWeek(...)}\`}>` — do not add `"use client"` just for week nav.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

- [booking] / [auth] Staff-gated week load must reuse existing slot flags
  - `app/admin/page.tsx:31` `requireStaffUser` before windows/slots
  - `app/admin/page.tsx:35` `getAllOperatingWindowsMap` → same `operatingDays` objects into rebuild
  - `app/admin/page.tsx:39` `getAvailableSlots(date, 1)` fan-out
  - `app/admin/page.tsx:44` second `buildWeeklyServiceOverview` with `slotsByDate`
  - `lib/floor/weekly-service-overview.ts:73` `statusFromExistingFlags` (no second cover formula)
  - `lib/floor/weekly-service-overview.ts:79` `slot.available` + BW-1 identity
- [public-api] Selected week + navigation
  - `app/admin/page.tsx:57` `await searchParams` (Next 16)
  - `app/admin/page.tsx:26` / `app/admin/page.tsx:58` `DATE_RE` → today fallback
  - `app/admin/page.tsx:208` mount `WeeklyServiceOverview`
  - `lib/floor/weekly-service-overview.ts:28` `shiftSelectedWeek` (no Monday snap)
  - `components/staff/weekly-service-overview.tsx:17` `shiftSelectedWeek(±1)`
  - `components/staff/weekly-service-overview.tsx:35` `?week=` prev/next Links
- [booking] Week identity and configured services only
  - `lib/floor/weekly-service-overview.ts:32` `buildWeeklyServiceOverview`
  - `lib/floor/weekly-service-overview.ts:42` `mondayContaining`
  - `lib/floor/weekly-service-overview.ts:58` `configuredServices` closed-day `[]`
  - `lib/floor/weekly-service-overview.ts:46` BW-4 label fallback
- [public-api] Status chrome
  - `components/staff/weekly-service-overview.tsx:62` green/red + accessible `available` / `fully booked`

## Traceability (final)

Run: 2026-09-16 · plan: res-76_weekly_service_overview_c4a8d1e2 · issue: RES-76

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md WA-1 | weekly-service-overview.test.ts::selected week lists seven days and only each day's configured services | lib/floor/weekly-service-overview.ts | P1 | shipped |
| C2 | scheduling.md WA-2 | weekly-service-overview.test.ts::configured services use staff labels and BW-4 time-range fallback | lib/floor/weekly-service-overview.ts | P2 | shipped |
| C3 | scheduling.md WA-3/WA-4 | weekly-service-overview.test.ts::service is available when an existing bookable slot remains and fully booked when none remain | lib/floor/weekly-service-overview.ts | P0 | shipped |
| C4 | scheduling.md WA-5 | weekly-service-overview.test.ts::previous and next week shift dates and recompute availability | lib/floor/weekly-service-overview.ts | P1 | shipped |
| C5 | scheduling.md WA-6 | weekly-service-overview.test.ts::reloaded slot availability flips service status | lib/floor/weekly-service-overview.ts | P1 | shipped |
| C6 | scheduling.md WA-1–WA-5 | dashboard-weekly-overview.test.ts::admin Dashboard renders weekly service overview with week navigation | app/admin/page.tsx, components/staff/weekly-service-overview.tsx, lib/floor/weekly-service-overview.ts | P1 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: res-76_weekly_service_overview_c4a8d1e2
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 17 (C5 Green skipped — already-green / pre-empted by C3)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 32 left on ledger (below floor/cap) — cap 3/run

# TDD verifier report — REAZED-309 occupancy duration + safety buffer (`reazed-309_occupancy_buffer_1862f023`)

FIX run. Linear: [REAZED-309](https://linear.app/realized/issue/REAZED-309).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — Until-badge uses occupancy duration, not buffer

Suggested review order:
- Until-badge occupancy math (not buffer) `[booking]`
  - `lib/reservations/operating-hours.ts:112` `slotUntilTime`
  - `lib/reservations/operating-hours.ts:114` `occupancyDurationMinutes` default `DEFAULT_EXPECTED_MINUTES`
  - `lib/reservations/operating-hours.ts:116` wrap-then-format (no buffer addend)
  - `lib/reservations/operating-hours.ts:104` `wrapMinutesOfDay` (`23:00` + 90 → `00:30`)
  - `tests/unit/reservations/operating-hours.test.ts:81` C1 pin (`20:30` not `20:45`; 120 → `21:00`)
- Widget still one-arg (C9) `[public-api]`
  - `components/site/reservation-widget.tsx:203` `slotUntilTime(time)`
- Default constant coupling
  - `lib/reservations/operating-hours.ts:9` import
  - `lib/floor/table-use.ts:10` `DEFAULT_EXPECTED_MINUTES`

Reusable pattern: Pin until vs next-bookable with an explicit duration argument and a clock time that only appears if the safety buffer were added (`19:00` + 90 + 15 → `20:45`), so an already-green `slotUntilTime` cannot silently absorb the buffer.

### C2 — Next-bookable instant = duration + buffer

Suggested review order:
- Next-bookable instant (BW-9) `[booking]`
  - `lib/reservations/operating-hours.ts:130` `nextBookableTime`
  - `lib/reservations/operating-hours.ts:124` `DEFAULT_SAFETY_BUFFER_MINUTES` (default 15, file-local)
  - `lib/reservations/operating-hours.ts:135` occupancy + buffer addend (not until-badge)
  - `tests/unit/reservations/operating-hours.test.ts:91` defaults `19:00` → `20:45`; buffer `0` → `20:30`; wrap `23:00` → `00:45`
- Shared 24h wrap path `[booking]`
  - `lib/reservations/operating-hours.ts:109` `addMinutesWrapped`
  - `lib/reservations/operating-hours.ts:104` `wrapMinutesOfDay`
  - `lib/reservations/operating-hours.ts:117` `slotUntilTime` (duration only; no buffer)

Reusable pattern: Keep until-badge and next-bookable as separate exports that share a private wrap-and-format helper; do not implement next-bookable as `slotUntilTime(start, occupancy + buffer)` so a later occupancy clamp on the until-badge argument cannot shrink the occupancy window.

### C3 — Occupancy and buffer clamps

Suggested review order:
- Buffer clamp contract (BW-11) `[booking]`
  - `lib/reservations/operating-hours.ts:124` `MIN_SAFETY_BUFFER_MINUTES` (0)
  - `lib/reservations/operating-hours.ts:125` `MAX_SAFETY_BUFFER_MINUTES` (60)
  - `lib/reservations/operating-hours.ts:126` `SAFETY_BUFFER_STEP_MINUTES` (5)
  - `lib/reservations/operating-hours.ts:127` `DEFAULT_SAFETY_BUFFER_MINUTES` (15, file-local)
  - `lib/reservations/operating-hours.ts:149` `clampSafetyBufferMinutes`
  - `lib/reservations/operating-hours.ts:151` NaN / out-of-range → 15 (not bound-clamped)
  - `lib/reservations/operating-hours.ts:157` `Math.round` to step 5 (`7` → `5`)
  - `tests/unit/reservations/operating-hours.test.ts:113` C3 pins (`15` stays, `7` → `5`, NaN/`61` → `15`)
- Occupancy reuses table-use `[booking]`
  - `lib/floor/table-use.ts:15` `clampExpectedMinutes` (no second helper)
  - `lib/floor/table-use.ts:10` `DEFAULT_EXPECTED_MINUTES` / 30–240 / step 15
  - `tests/unit/reservations/operating-hours.test.ts:115` `15` → `30`, NaN → `90`, `45` stays, `241` → `240`
- Math helpers still unclamped `[booking]`
  - `lib/reservations/operating-hours.ts:117` `slotUntilTime` (raw duration)
  - `lib/reservations/operating-hours.ts:133` `nextBookableTime` (raw occupancy + buffer)

Reusable pattern: Pin buffer out-of-range → default (`61` → `15`) separately from occupancy bound-clamp (`241` → `240`); a copy of `Math.max`/`Math.min` around `Math.round` will make the buffer helper look right and still fail BW-11.

### C4 — restaurant_settings occupancy and buffer columns

Suggested review order:
- Three-file BW-11 schema fold `[schema]`
  - `supabase/migrations/00000000000000_baseline.sql:453` CREATE TABLE occupancy + buffer + named CHECKs
  - `supabase/migrations/00000000000000_baseline.sql:470` `ADD COLUMN IF NOT EXISTS` existing-table path
  - `supabase/migrations/20260823130000_restaurant_info_and_chefs_picks.sql:7` last-writer `ADD COLUMN IF NOT EXISTS`
  - `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:10` remote forward `[schema]`
- CHECK expressions match C3 clamps `[booking]`
  - `supabase/migrations/00000000000000_baseline.sql:454` occupancy `BETWEEN 30 AND 240` and `% 15 = 0`, default 90
  - `supabase/migrations/00000000000000_baseline.sql:460` buffer `BETWEEN 0 AND 60` and `% 5 = 0`, default 15
  - `supabase/migrations/20260823130000_restaurant_info_and_chefs_picks.sql:20` same CHECKs + comments
  - `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:13` same CHECKs + comments
  - `tests/unit/branding/schema.test.ts:50` named-file pin (not `allSql` join)
- RLS inheritance `[security]`
  - `supabase/migrations/00000000000000_baseline.sql:508` public SELECT / authenticated FOR ALL

Reusable pattern: Pin occupancy columns on the named three-file set (baseline + last-writer + dated forward), not an `allSql` join; keep CHECK add idempotent via `EXCEPTION WHEN duplicate_object` like `slot_interval_minutes`; put `COMMENT ON COLUMN` on the remote forward so already-applied remotes get comments folding into `20260823130000` would miss.

### C6 — getAvailableSlots occupancy-window cover counting

Suggested review order:
- Occupancy-window cover counting `[booking]`
  - `app/actions/reservations.ts:611` half-open cover loop (not same-slot-only)
  - `app/actions/reservations.ts:616` `normalizeTime(row.time)` before compare `[booking]`
  - `app/actions/reservations.ts:617` `nextBookableTime(start, occupancy, buffer)` exclusive end
  - `app/actions/reservations.ts:623` lexical `time >= start && time < exclusiveEnd` (wrap still broken)
  - `lib/reservations/operating-hours.ts:86` `normalizeTime` (`19:00:00` → `19:00`)
  - `lib/reservations/operating-hours.ts:133` `nextBookableTime`
- Settings clamps feeding the window `[booking]`
  - `app/actions/reservations.ts:552` settings select includes occupancy + buffer
  - `app/actions/reservations.ts:566` `clampExpectedMinutes` occupancy
  - `app/actions/reservations.ts:569` `clampSafetyBufferMinutes` buffer (`?? 15`)
- Public slot payload `[public-api]`
  - `app/actions/reservations.ts:645` cover + partySize vs `sum(tables.seats)` (no table-fit)
  - `tests/unit/reservations/available-slots.test.ts:145` Case A 20:30 false / 20:45 true; Case B leftover 19:00 true
- Fail-open + occupying query (unchanged this phase) `[security]`
  - `app/actions/reservations.ts:599` select `time, party_size, status`
  - `app/actions/reservations.ts:605` reservation SELECT still fail-open

Reusable pattern: Occupancy must `normalizeTime` reservation `time` before comparing to generated `HH:MM` slots — Postgres `TIME` is `19:00:00`, and `"19:00" >= "19:00:00"` is false so the start slot under-counts.

### C7 — BW-10 early-release in getAvailableSlots

Suggested review order:
- Occupying-status single source `[booking]`
  - `lib/reservations/auto-assign.ts:20` `ACTIVE_RESERVATION_STATUSES` (`confirmed`/`seated`)
  - `app/actions/reservations.ts:31` import into server actions
  - `app/actions/reservations.ts:604` `getAvailableSlots` `.in("status", ACTIVE_RESERVATION_STATUSES)` `[booking]`
  - `app/actions/reservations.ts:617` cover-loop `includes` (C7; unit `from()` thenable ignores `.in()`)
  - `tests/unit/reservations/available-slots.test.ts:183` early-release pin (`completed`/`cancelled`/`no_show` → 20:30 true; `seated` occupies)
- Shared query site (same occupying set)
  - `app/actions/reservations.ts:434` `autoAssignDueReservations` `.in("status", …)`
- Unchanged occupancy window `[booking]`
  - `app/actions/reservations.ts:612` half-open `[start, nextBookableTime(start))`
  - `app/actions/reservations.ts:608` reservation SELECT still fail-open `[security]`

Reusable pattern: Keep occupying statuses as one exported set used for both PostgREST `.in("status")` and the JS cover skip — unit `from()` thenables ignore query filters, so C7 only proves the loop unless both share the same list.

### C10 — first generated slot at or after exclusive-end

Suggested review order:
- Generated-slot occupancy, no second generator `[booking]`
  - `app/actions/reservations.ts:528` JSDoc (BW-5 one generator; first generated instant at or after exclusive-end)
  - `app/actions/reservations.ts:577` `generatedSlots = bookableTimesForDay(...)`
  - `app/actions/reservations.ts:615` cover-loop: compare exclusive-end to generated slots only
  - `app/actions/reservations.ts:629` `generated >= start && generated < exclusiveEnd` `[booking]`
  - `lib/reservations/operating-hours.ts:342` `generateSlotsForSegments` (the one generator)
  - `lib/reservations/operating-hours.ts:359` `bookableTimesForDay`
  - `lib/reservations/operating-hours.ts:133` `nextBookableTime` exclusive-end
  - `tests/unit/reservations/available-slots.test.ts:219` C10 pin (20:30 false, 21:00 true, 20:45 absent)
- Unchanged public slot payload `[public-api]`
  - `app/actions/reservations.ts:641` `generatedSlots.map` → `{ time, available }`
  - `components/site/reservation-widget.tsx:351` caller still consumes that shape

Reusable pattern: Pin grid-rounding with a step that does **not** land on exclusive-end (30-min vs 20:45) **and** keep an on-grid exclusive-end pin (C6 15-min, 20:45 available); either pin alone cannot catch a second generator or a closed interval.

### C8 — trigger occupancy window + early-release

Suggested review order:
- Occupancy cover on INSERT/UPDATE `[booking]` `[schema]`
  - `supabase/migrations/00000000000000_baseline.sql:183` `validate_reservation_availability` DEFINER + `search_path`
  - `supabase/migrations/00000000000000_baseline.sql:246` occupying statuses `confirmed`/`seated` only `[booking]`
  - `supabase/migrations/00000000000000_baseline.sql:247` settings `id=1` defaults 90/15
  - `supabase/migrations/00000000000000_baseline.sql:258` half-open same-date elapsed `TIME` (not `TIME + interval`) `[booking]`
  - `supabase/migrations/00000000000000_baseline.sql:268` `P0001` `Booking denied: This time is fully booked.`
  - `supabase/migrations/00000000000000_baseline.sql:309` `BEFORE INSERT OR UPDATE` trigger
- Last-writer copies must stay identical `[schema]`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:20`
  - `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:44`
- Guest mapping `[public-api]`
  - `app/actions/reservations.ts:156` P0001 `.message` returned as-is
  - `tests/integration/reservations/occupancy-window.integ.test.ts:56` 20:30 reject / 20:45 accept / completed early-release

Reusable pattern: Keep last-writer occupancy SQL byte-identical across baseline + segments + dated forward; re-verify with `db query --local` `CREATE OR REPLACE` (no reset) and STRICT integ pinned to `127.0.0.1` keys from `npx supabase status` (`.env.local` is the linked remote). Express the window as same-date elapsed `TIME`, never `TIME + interval` (24h wrap would miss evening holds on the same date).

### C5 — BW-11 floor UX staff-manageable duration + safety buffer default 15

Suggested review order:
- Authz on writes [auth]
  - `app/actions/branding.ts:359` `upsertRestaurantSetting` → `requireStaffUser` then throw
  - `app/actions/branding.ts:413` `updateSafetyBufferMinutes`
  - `app/actions/branding.ts:398` `updateOccupancyDurationMinutes`
- Singleton settings read + persist [booking]
  - `app/actions/branding.ts:320` cached `loadRestaurantBookingSettings` (three columns, id=1)
  - `app/actions/branding.ts:408` `getSafetyBufferMinutes` default 15
  - `app/admin/floor/page.tsx:16` `Promise.all` initials into `FloorPlan`
  - `components/staff/floor-plan.tsx:411` `persistSafetyBuffer` bound-then-clamp
- Floor chrome vs inspector (BW-11)
  - `components/staff/floor-plan.tsx:755` `occupancy-duration-control` (before `{selected ?`)
  - `components/staff/floor-plan.tsx:778` `safety-buffer-control` [booking]
  - `components/staff/floor-plan.tsx:1272` inspector **Expected time** only — no buffer control

Reusable pattern: Floor chrome source-scan tests pin `data-testid` + `role="group"` + `aria-labelledby` within 400 chars of the testid — extract inner stepper buttons, leave the labeled wrapper at the call site; named staff getters over `restaurant_settings` id=1 share one `React.cache()` select so the page can keep the exported names the test pins.

### C9 — widget until-badge uses occupancy duration; FP-10 pin

Suggested review order:
- Until-badge predicted end (not next-bookable) **[booking]**
  - `components/site/reservation-widget.tsx:207` `slotUntilTime(time, occupancyDurationMinutes)`
  - `components/site/reservation-widget.tsx:361-378` `fetchSlots` still awaits occupancy before painting cards
- Guest vs staff occupancy reads **[public-api]**
  - `app/actions/reservations.ts:539` `getGuestOccupancyDurationMinutes`
  - `app/actions/branding.ts:393` staff `getOccupancyDurationMinutes` (unchanged)
- Occupancy clamp shared with availability **[booking]**
  - `app/actions/reservations.ts:528` `occupancyDurationFromSettings`
  - `app/actions/reservations.ts:597` `getAvailableSlots` uses the same helper
- Once-per-lifetime occupancy POST
  - `components/site/reservation-widget.tsx:326` `occupancyDurationPromiseRef`
  - `components/site/reservation-widget.tsx:397` mount kickoff (does not block windows)

Reusable pattern: Guest and staff settings getters must not share an export name — a staff getter that fail-opens to 90 will silently pin the until-badge if the widget imports it; name the guest read `getGuest…` (or pass duration from an RSC).

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Confirm-path occupancy SQL `[booking]` `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:183` — `validate_reservation_availability` DEFINER + `search_path`
- `supabase/migrations/00000000000000_baseline.sql:246` — occupying statuses `confirmed`/`seated` only
- `supabase/migrations/00000000000000_baseline.sql:247` — settings `id=1` defaults 90/15
- `supabase/migrations/00000000000000_baseline.sql:257` — half-open same-date elapsed `TIME` (not `TIME + interval`)
- `supabase/migrations/00000000000000_baseline.sql:268` — `P0001` `Booking denied: This time is fully booked.`
- Last-writer copies must stay identical: `20260818162000_operating_hour_segments.sql:20`, `20260827180000_occupancy_duration_buffer.sql:44`
- `app/actions/reservations.ts:156` — guest mapping returns P0001 `.message` as-is
- `tests/integration/reservations/occupancy-window.integ.test.ts` — 20:30 reject / 20:45 accept / completed early-release

### 2. Widget availability occupancy window `[booking]` `[public-api]`

- `app/actions/reservations.ts:569` — `getAvailableSlots`
- `app/actions/reservations.ts:597` — occupancy duration from settings (shared `occupancyDurationFromSettings`)
- `app/actions/reservations.ts:634` — `.in("status", ACTIVE_RESERVATION_STATUSES)`
- `app/actions/reservations.ts:649` — JS cover skip (unit `from()` thenable ignores `.in()`)
- `app/actions/reservations.ts:657` — half-open `generated >= start && generated < exclusiveEnd` (lexical wrap still broken)
- `lib/reservations/operating-hours.ts:133` — `nextBookableTime` exclusive-end
- `lib/reservations/auto-assign.ts:20` — `ACTIVE_RESERVATION_STATUSES`
- Tests: `available-slots.test.ts` Case A 20:30 false / 20:45 true; C7 early-release; C10 30-min grid 21:00

### 3. Until-badge vs next-bookable split `[booking]` `[public-api]`

- `lib/reservations/operating-hours.ts:117` — `slotUntilTime` occupancy duration only (no buffer)
- `lib/reservations/operating-hours.ts:133` — `nextBookableTime` occupancy + buffer
- `lib/reservations/operating-hours.ts:109` — shared `addMinutesWrapped`
- `components/site/reservation-widget.tsx:207` — `slotUntilTime(time, occupancyDurationMinutes)`
- `app/actions/reservations.ts:539` — `getGuestOccupancyDurationMinutes` (must not collide with staff getter)
- `app/actions/branding.ts:393` — staff `getOccupancyDurationMinutes`
- FP-10: widget until path has no `tables.expected_minutes`

### 4. Settings schema + CHECKs `[schema]` `[security]`

- `supabase/migrations/00000000000000_baseline.sql:493` — `occupancy_duration_minutes` / `safety_buffer_minutes` CREATE TABLE
- `supabase/migrations/20260823130000_restaurant_info_and_chefs_picks.sql` — last-writer `ADD COLUMN IF NOT EXISTS`
- `supabase/migrations/20260827180000_occupancy_duration_buffer.sql:10` — remote forward
- `supabase/migrations/00000000000000_baseline.sql:508` — public SELECT / authenticated FOR ALL (occupancy columns inherit)

### 5. Floor UX staff-manageable occupancy + buffer `[auth]` `[booking]`

- `app/actions/branding.ts:359` — `upsertRestaurantSetting` → `requireStaffUser`
- `app/actions/branding.ts:398` / `:413` — occupancy / buffer updaters
- `components/staff/floor-plan.tsx:755` — `occupancy-duration-control` (before `{selected ?`)
- `components/staff/floor-plan.tsx:778` — `safety-buffer-control`
- Inspector Expected time stays per-table (FP-10); no buffer on inspector

### 6. Clamps `[booking]`

- `lib/reservations/operating-hours.ts:149` — `clampSafetyBufferMinutes` (0–60 step 5, out-of-range → 15)
- `lib/floor/table-use.ts:15` — `clampExpectedMinutes` reused for occupancy (no second 30–240 helper)

## Traceability (final)

Run: 2026-08-27 · plan: reazed-309_occupancy_buffer_1862f023 · issue: REAZED-309

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules BW-2 | `operating-hours.test.ts::until-badge uses occupancy duration, not the safety buffer` | `lib/reservations/operating-hours.ts` `slotUntilTime` | P1 | shipped |
| C2 | booking-rules BW-9 instant | `operating-hours.test.ts::next-bookable instant is occupancy duration plus safety buffer` | `lib/reservations/operating-hours.ts` `nextBookableTime` | P1 | shipped |
| C3 | booking-rules BW-11 | `operating-hours.test.ts::clamps occupancy duration and safety buffer to BW-11 ranges` | `clampExpectedMinutes` + `clampSafetyBufferMinutes` | P1 | shipped |
| C4 | booking-rules BW-11 schema | `schema.test.ts::restaurant_settings occupancy duration defaults to 90 and safety buffer to 15` | baseline, `20260823130000_restaurant_info_and_chefs_picks.sql`, `20260827180000_occupancy_duration_buffer.sql` | P1 | shipped |
| C5 | booking-rules BW-11 UI | `occupancy-settings.test.ts::floor plan exposes and persists occupancy duration and safety buffer (default 15)` | `components/staff/floor-plan.tsx`, `app/actions/branding.ts`, `app/admin/floor/page.tsx` | P1 | shipped |
| C6 | booking-rules BW-9 slots | `available-slots.test.ts::counts occupying covers across the occupancy window, not only the same slot` | `app/actions/reservations.ts` `getAvailableSlots` | P0 | shipped |
| C7 | booking-rules BW-10 | `available-slots.test.ts::releases 20:30 when a full-floor 19:00 hold is completed, cancelled, or no_show, while seated still occupies` | `getAvailableSlots` + `ACTIVE_RESERVATION_STATUSES` | P0 | shipped |
| C8 | booking-rules BW-9/BW-10 trigger | `occupancy-window.integ.test.ts::rejects 20:30 against a full-floor 19:00 confirmed hold, accepts 20:45, and accepts 20:30 after the hold is completed` | `validate_reservation_availability` in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql` | P0 | shipped |
| C9 | booking-rules BW-2/BW-6 + scheduling FP-10 | `segment-groups.test.ts::until-badge uses occupancy duration, not the safety buffer, and does not read expected_minutes` | `components/site/reservation-widget.tsx`, `getGuestOccupancyDurationMinutes` | P1 | shipped |
| C10 | booking-rules BW-9 grid | `available-slots.test.ts::offers 21:00 as the first generated slot at or after exclusive-end on a 30-minute grid` | `getAvailableSlots` | P1 | shipped |
| linked-remote occupancy forward apply | booking-rules BW-11 / deploy.md | — | `20260827180000_occupancy_duration_buffer.sql` on `tilcqrudqxznnpepxjqq` | P1 | manual-uat |

## Run metrics

Run: 2026-08-27 → 2026-08-27 · plan: reazed-309_occupancy_buffer_1862f023
Criteria: 10 shipped · 1 manual-uat · 11 total
Phases delegated: 30 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none (C1 and C10 Red characterization tests already passed on existing source; Green no-op'd — not infra)
Issues: 1 filed · 0 attached-to-existing · 35 left on ledger (below floor/cap) — cap 3/run

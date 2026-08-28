# Booking rules

**Status:** Draft  
**Last updated:** 2026-08-28

## Scope

Guest online reservations via server actions (`app/actions/reservations.ts`,
`app/actions/availability.ts`). Staff admin at `app/admin/reservations`.

## Acceptance criteria

_(Expand during first `/sdd-to-tdd` run.)_

1. **Party size cap** — Online bookings reject `partySize > 8` server-side with a
   stable error; client cannot bypass.
2. **Blocked dates** — Reservations on blocked dates are rejected per DB policy and
   `isDateBlocked` / `getOperatingWindowForDate`.
3. **Operating window** — Times outside the restaurant operating window for the
   selected date are rejected.
4. **Confirmation code** — Successful booking returns a unique `conf_code` (format
   `TVL-####`).
5. **RLS / RES-PRIV** — Guest booking is insert-only on `reservations`. Table
   privileges MUST `GRANT INSERT ON TABLE reservations TO anon, authenticated`
   and
   `REVOKE SELECT, UPDATE, DELETE ON TABLE reservations FROM anon, authenticated`
   in `00000000000000_baseline.sql`,
   `20260825140000_operating_windows_privilege.sql`, and
   `20260827160000_public_catalog_privileges.sql`. There MUST NOT be
   `GRANT SELECT ON TABLE reservations TO anon` or `TO authenticated`. Policy
   `Allow public insert reservations` stays. Policy
   `Allow public read reservations` MUST be dropped (`DROP POLICY IF EXISTS` …;
   no `CREATE`). Staff reads/writes stay `requireStaffUser` + `service_role` on
   documented admin paths (`getReservationsByDate` and siblings).
   `GRANT ALL TO service_role` stays (scheduling.md §17). Guest PII (name, phone,
   notes) MUST NOT be readable via the anon key.

## Guest booking widget (segmented slots)

Guest widget at `components/site/reservation-widget.tsx`. Segment source is
`/admin/scheduling` (`operating_windows`). Restaurant-wide slot interval,
occupancy duration, and **staff-manageable** safety buffer live on `/admin/floor`
(`restaurant_settings.slot_interval_minutes`;
`occupancy_duration_minutes` default 90; `safety_buffer_minutes` default 15).

**Until-badge rule:** `until = start + restaurant occupancy duration` (default
90). The badge is predicted end (`19:00` → `20:30`), never next-bookable
(`20:45`). No table is assigned at booking, so the widget MUST NOT read a
specific table’s Expected time (`tables.expected_minutes` stays for live-floor
clocks only — FP-10).

**Labels/notes:** shown exactly as staff typed (no auto FR/EN translation).
Widget chrome (Réserver, guests, date, time, until prefix) uses `next-intl` for
the route locale. An in-widget language toggle is out of scope.

6. **BW-1 — Exclusive segment membership** — A bookable time belongs to
   **exactly one** opening-hour segment. If a later segment’s `opens_at` equals
   the time, that later segment wins (Lunch `12:00–14:00` and Afternoon
   `14:00–…` must not both own `14:00`). `assignSegmentForTime` encodes this.

7. **BW-2 — Until-badge math** — Each slot card shows an until-badge of
   `slotUntilTime(start, occupancyDurationMinutes)` = start + occupancy
   duration (default 90). MUST NOT add the safety buffer. Times wrap modulo
   24h (`23:00` → `00:30`, never `24:30`).

8. **BW-3 — Slot-interval clamp** — Guest slot spacing uses
   `clampSlotIntervalMinutes`: allowed set `{15, 30, 60}`, default **30**
   (invalid values including `20` and `NaN` become 30).

9. **BW-4 — Grouped bookable slots** — `groupBookableSlots` groups times by
   segment `sort_order`, assigns each time via BW-1, falls back unlabeled
   headings to the time range (`09:00–11:00`), omits empty groups, and
   attaches a non-empty `guest_note`. Blank/whitespace notes are omitted from
   the payload and render no helper.

10. **BW-5 — Slot generation uses restaurant interval** — `getAvailableSlots`
    reads `restaurant_settings.slot_interval_minutes`, clamps via BW-3, and
    passes that step into existing `bookableTimesForDay` (no second generator).
    A 15-minute setting with lunch `12:00–14:00` includes `12:15`.

11. **BW-6 — Widget grouped cards** — The homepage widget renders grouped slot
    cards (not a flat time dropdown). It consumes `groupBookableSlots` and
    `slotUntilTime`; each group/card/until has `data-testid` `slot-group` /
    `slot-card` / `until`; there is no time `<Select>`.

12. **BW-7 — Accordion and Réserver gate** — Guests, date, and time are exclusive
    accordions (Time expanded by default). Picking a card does **not** skip to
    guest details and does **not** call `createReservation`. Réserver stays
    disabled until a slot is selected; it only advances to existing step 2
    (name/phone still required).

13. **BW-8 — Widget chrome i18n** — Chrome strings (`reserve`, `until`,
    `guests`, `date`, `time`, collapsed summaries) live under
    `reservationWidget.*` in `messages/fr.json` and `messages/en.json` and the
    widget uses `useTranslations("reservationWidget")`. Segment labels and
    guest notes stay staff-entered.

14. **BW-9 — Occupancy window (next bookable)** — `confirmed` and `seated`
    reservations occupy `party_size` on the half-open interval
    `[start, start + occupancy + buffer)` **on the same reservation `date`**.
    Defaults are occupancy 90 and buffer 15. Example: a 19:00 seating shows
    until-badge 20:30 and first free instant 20:45. Candidate time `T` is
    unavailable when overlapping occupying covers + `partySize` >
    `sum(tables.seats)`. `getAvailableSlots` applies this window; the
    `validate_reservation_availability` trigger enforces it on INSERT/UPDATE
    (`P0001`; `createReservation` already returns that message). The next
    **generated** slot is the first `bookableTimesForDay` time at or after the
    free instant (on a 30-min grid: 20:45 → 21:00 if 20:45 is not a step).
    Cover counting only — not table-fit or merges (REAZED-305). Clock wrap is
    for until/next-bookable **strings**; overlap does not span the next
    calendar date in this run.

15. **BW-10 — Early-release** — Only `confirmed` and `seated` occupy.
    `completed`, `cancelled`, and `no_show` do not. Example: a 19:00
    reservation completed by 20:20 makes 20:30 bookable; MUST NOT hold until
    20:45.

16. **BW-11 — Occupancy settings + floor UX** — Occupancy duration uses
    `clampExpectedMinutes` (30–240, step 15, default 90). Safety buffer uses
    `clampSafetyBufferMinutes` (0–60 inclusive, step 5, default **15**;
    `Math.round` to step; invalid including NaN → 15). Both are
    **restaurant-wide, staff-manageable UX** on `/admin/floor` in the same
    chrome as slot interval (labeled controls, not the per-table inspector,
    not a hidden constant). Staff can change the buffer from 15 and persist
    `safety_buffer_minutes`; same for occupancy duration. Guest until-badge
    and occupancy windows read that singleton.

17. **STAFF-LIST — Staff date list is fail-closed.** `getReservationsByDate` is
    a staff read (`requireStaffUser` + `service_role`). Auth failure or query
    failure MUST return a Result `{ reservations: [], error }` with a stable
    message, never a successful empty array (no `error` field).
    `ReservationsManager` MUST surface that error and MUST NOT show filter-empty
    copy for a load failure. When the load succeeds with zero rows and no
    status/name/phone filter is excluding rows, empty copy states there are no
    reservations for that date. Filter-empty copy ("No reservations match your
    filters.") is only when filters are active and the filtered list is empty.

## Implementation trace (non-normative)

| Criterion     | Shipped in                                                                                                                                                                                                                                                                                                                                                                                   | Tests                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BW-1          | `lib/reservations/operating-hours.ts` — `assignSegmentForTime`                                                                                                                                                                                                                                                                                                                               | `tests/unit/reservations/operating-hours.test.ts`                                                                                                                                                                                      |
| BW-2          | `lib/reservations/operating-hours.ts` — `slotUntilTime(start, occupancyDurationMinutes)`, `wrapMinutesOfDay`; widget via `getGuestOccupancyDurationMinutes`                                                                                                                                                                                                                                  | same — until-badge uses occupancy duration, not the safety buffer                                                                                                                                                                      |
| BW-3          | same — `clampSlotIntervalMinutes`                                                                                                                                                                                                                                                                                                                                                            | same — `clampSlotIntervalMinutes`                                                                                                                                                                                                      |
| BW-4          | same — `groupBookableSlots`                                                                                                                                                                                                                                                                                                                                                                  | same — `groupBookableSlots`                                                                                                                                                                                                            |
| BW-5          | `app/actions/reservations.ts` — `getAvailableSlots` (slot interval + occupancy cover)                                                                                                                                                                                                                                                                                                        | `tests/unit/reservations/available-slots.test.ts`                                                                                                                                                                                      |
| BW-6          | `components/site/reservation-widget.tsx` — `slotUntilTime(time, occupancyDurationMinutes)`                                                                                                                                                                                                                                                                                                   | `tests/unit/reservation-widget/segment-groups.test.ts`                                                                                                                                                                                 |
| BW-7          | same                                                                                                                                                                                                                                                                                                                                                                                         | same (Réserver gate)                                                                                                                                                                                                                   |
| BW-8          | same; `messages/en.json`, `messages/fr.json`                                                                                                                                                                                                                                                                                                                                                 | `tests/unit/reservation-widget/chrome-i18n.test.ts`, `tests/unit/i18n/messages-parity.test.ts`                                                                                                                                         |
| AC-5 RES-PRIV | `GRANT INSERT` / `REVOKE SELECT, UPDATE, DELETE` on `reservations`; `DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`); no `GRANT SELECT` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql`                                  | `tests/integration/reservations/public-privileges.integ.test.ts` → "anon can INSERT reservations and cannot SELECT guest PII"                                                                                                          |
| BW-9          | `nextBookableTime`; `getAvailableSlots` half-open `[start, nextBookableTime(start))` with `normalizeTime`; `validate_reservation_availability` same-date elapsed `TIME` in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`                                                                                                            | `tests/unit/reservations/available-slots.test.ts` occupancy-window / 30-min grid; `tests/integration/reservations/occupancy-window.integ.test.ts`                                                                                      |
| BW-10         | `ACTIVE_RESERVATION_STATUSES` (`confirmed`/`seated`); trigger occupying set matches                                                                                                                                                                                                                                                                                                          | `available-slots.test.ts` early-release; occupancy-window integ completed early-release                                                                                                                                                |
| BW-11         | `occupancy_duration_minutes` / `safety_buffer_minutes` (defaults 90/15); `clampExpectedMinutes` + `clampSafetyBufferMinutes`; floor chrome `occupancy-duration-control` / `safety-buffer-control`; `app/actions/branding.ts` getters/updaters                                                                                                                                                | `tests/unit/branding/schema.test.ts`; `tests/unit/floor/occupancy-settings.test.ts`; `operating-hours.test.ts` clamps                                                                                                                  |
| STAFF-LIST    | `app/actions/reservations.ts` `getReservationsByDate` — `{ reservations, error? }`; auth `Unauthorized.`; query `Could not load reservations.`; success omits `error`. `lib/reservations/list-empty-copy.ts` `staffListEmptyCopy` (error then filter flags). `ReservationsManager` unwraps `.reservations` / `.error`. `app/admin/reservations/page.tsx` SSR unwraps `{ reservations }` only | `tests/unit/reservations/get-by-date.test.ts` → "does not present auth or query failure as a successful empty list"; `tests/unit/reservations/list-empty-copy.test.ts` → "distinguishes load error, empty date, and filter-empty copy" |

## References

- [../architecture/Reservation-Flow.md](../architecture/Reservation-Flow.md)
- `supabase/migrations/00000000000000_baseline.sql` — `validate_reservation_availability()`
  trigger `enforce_booking_rules` on `reservations`
- `app/actions/reservations.ts` — `getReservationsByDate`
- `lib/reservations/list-empty-copy.ts`

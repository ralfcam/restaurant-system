# Booking rules

**Status:** Draft  
**Last updated:** 2026-08-27

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
`/admin/scheduling` (`operating_windows`). Restaurant-wide slot interval is
`/admin/floor` (`restaurant_settings.slot_interval_minutes`).

**Until-badge rule:** `until = start + DEFAULT_EXPECTED_MINUTES` (90). No table
is assigned at booking, so the widget does not read a specific table’s Expected
time (`tables.expected_minutes` stays for live-floor clocks only).

**Labels/notes:** shown exactly as staff typed (no auto FR/EN translation).
Widget chrome (Réserver, guests, date, time, until prefix) uses `next-intl` for
the route locale. An in-widget language toggle is out of scope.

6. **BW-1 — Exclusive segment membership** — A bookable time belongs to
   **exactly one** opening-hour segment. If a later segment’s `opens_at` equals
   the time, that later segment wins (Lunch `12:00–14:00` and Afternoon
   `14:00–…` must not both own `14:00`). `assignSegmentForTime` encodes this.

7. **BW-2 — Until-badge math** — Each slot card shows an until-badge of
   `slotUntilTime(start)` = start + 90 minutes. Times wrap modulo 24h
   (`23:00` → `00:30`, never `24:30`).

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

## Implementation trace (non-normative)

| Criterion     | Shipped in                                                                                                                                                                                                                                                                                                                                                  | Tests                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| BW-1          | `lib/reservations/operating-hours.ts` — `assignSegmentForTime`                                                                                                                                                                                                                                                                                              | `tests/unit/reservations/operating-hours.test.ts`                                                                             |
| BW-2          | same — `slotUntilTime`, `wrapMinutesOfDay`                                                                                                                                                                                                                                                                                                                  | same — `slotUntilTime`                                                                                                        |
| BW-3          | same — `clampSlotIntervalMinutes`                                                                                                                                                                                                                                                                                                                           | same — `clampSlotIntervalMinutes`                                                                                             |
| BW-4          | same — `groupBookableSlots`                                                                                                                                                                                                                                                                                                                                 | same — `groupBookableSlots`                                                                                                   |
| BW-5          | `app/actions/reservations.ts` — `getAvailableSlots`                                                                                                                                                                                                                                                                                                         | `tests/unit/reservations/available-slots.test.ts`                                                                             |
| BW-6          | `components/site/reservation-widget.tsx`                                                                                                                                                                                                                                                                                                                    | `tests/unit/reservation-widget/segment-groups.test.ts`                                                                        |
| BW-7          | same                                                                                                                                                                                                                                                                                                                                                        | same (Réserver gate)                                                                                                          |
| BW-8          | same; `messages/en.json`, `messages/fr.json`                                                                                                                                                                                                                                                                                                                | `tests/unit/reservation-widget/chrome-i18n.test.ts`, `tests/unit/i18n/messages-parity.test.ts`                                |
| AC-5 RES-PRIV | `GRANT INSERT` / `REVOKE SELECT, UPDATE, DELETE` on `reservations`; `DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`); no `GRANT SELECT` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql` | `tests/integration/reservations/public-privileges.integ.test.ts` → "anon can INSERT reservations and cannot SELECT guest PII" |

## References

- [../architecture/Reservation-Flow.md](../architecture/Reservation-Flow.md)
- `supabase/migrations/00000000000000_baseline.sql` — `validate_reservation_availability()`
  trigger `enforce_booking_rules` on `reservations`

# Reservation flow

**Status:** Reference  
**Last updated:** 2026-08-30

Summary of guest booking — criteria live in [../specs/booking-rules.md](../specs/booking-rules.md)
(BW-1…BW-12 for the segmented homepage widget, occupancy window, and
compatible-table bookability).

```mermaid
flowchart LR
  Guest[Guest widget] --> Slots[getAvailableSlots]
  Slots --> Group[groupBookableSlots]
  Group --> Pick[Pick slot card]
  Pick --> Details[Guest details]
  Details --> Create[createReservation]
  Create --> DB[(Supabase reservations)]
  Create --> Code[conf_code TVL-####]
  Admin[admin/reservations] --> DB
```

**Segmented widget.** Staff opening-hour segments (`operating_windows` on
`/admin/scheduling`) drive grouped slot cards. `getAvailableSlots` reads
`restaurant_settings.slot_interval_minutes` from `/admin/floor`, clamps via
`clampSlotIntervalMinutes`, and passes the step into `bookableTimesForDay`.
`groupBookableSlots` assigns each time to one segment (BW-1), attaches optional
`guest_note`, and renders until-badges via
`slotUntilTime(time, occupancyDurationMinutes)` (occupancy duration from
`getGuestOccupancyDurationMinutes`, default 90; wraps past midnight; no
safety buffer). Guests/date/time are exclusive accordions; Réserver advances
to guest details only after a slot is selected (no `createReservation` on pick).

**Occupancy window.** `confirmed` and `seated` occupy covers on
`[start, nextBookableTime(start))` (occupancy + staff-manageable buffer,
defaults 90 + 15). `getAvailableSlots` `normalizeTime`s reservation `time`
before comparing to generated `HH:MM` slots, then ANDs cover-count with
`canSeatPartyOnTables` (BW-12). The confirm path uses the same half-open
window in `validate_reservation_availability` (`SECURITY DEFINER`; same-date
elapsed `TIME`; table-fit after cover-count; date-scoped
`pg_advisory_xact_lock(305, days-since-epoch)`; P0001
`Booking denied: This time is fully booked.`). Last-writer body is
byte-identical in baseline, `20260818162000_operating_hour_segments.sql`,
`20260827180000_occupancy_duration_buffer.sql`, and
`20260828121224_table_fit_availability.sql`. Guest INSERT does not write
`table_label`. `completed` / `cancelled` / `no_show` do not occupy (BW-10).
Criteria: [../specs/booking-rules.md](../specs/booking-rules.md) BW-9–BW-12.

**Post-visit review email.** `transitionReservationStatus` to `completed`
stamps `completed_at` and inserts `review_email_sends` (those objects are
not in baseline yet except nullable `reservations.email`). Staff configure
send on `/admin/marketing`. Spec:
[../specs/post-visit-review-email.md](../specs/post-visit-review-email.md).

Key modules: `components/site/reservation-widget.tsx`,
`lib/reservations/operating-hours.ts`, `lib/reservations/auto-assign.ts`,
`app/actions/reservations.ts`, `app/actions/availability.ts`.

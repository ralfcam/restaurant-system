# Reservation flow

**Status:** Reference  
**Last updated:** 2026-08-24

Summary of guest booking — criteria live in [../specs/booking-rules.md](../specs/booking-rules.md)
(BW-1…BW-8 for the segmented homepage widget).

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
`guest_note`, and renders until-badges via `slotUntilTime` (start + 90 min,
wraps past midnight). Guests/date/time are exclusive accordions; Réserver advances
to guest details only after a slot is selected (no `createReservation` on pick).

Key modules: `components/site/reservation-widget.tsx`,
`lib/reservations/operating-hours.ts`, `app/actions/reservations.ts`,
`app/actions/availability.ts`.

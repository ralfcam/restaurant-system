# Booking rules

**Status:** Draft  
**Last updated:** 2026-06-27

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
5. **RLS** — Guest-facing reservation reads/writes obey Supabase RLS; service role
   used only in documented admin paths.

## References

- [../architecture/Reservation-Flow.md](../architecture/Reservation-Flow.md)
- `supabase/migrations/00000000000000_baseline.sql` — `validate_reservation_availability()`
  trigger `enforce_booking_rules` on `reservations`

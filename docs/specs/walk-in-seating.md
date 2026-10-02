# Walk-in seating

**Status:** Draft
**Last updated:** 2026-10-02

## Scope

Staff on `/admin/floor` can seat a walk-in on a selected table. The walk-in is a normal `reservations` row, not a separate visit record. The action uses `requireStaffUser` and the service-role client. A guest cannot create one. Floor and reservation rules live in [scheduling.md](./scheduling.md) and [booking-rules.md](./booking-rules.md).

The row is inserted already `seated`, with that table's label, for today in the restaurant timezone, at the current local time (`HH:MM`). Party size is an integer of at least 1. Name and phone may be omitted and are stored as blank strings, because those columns are `NOT NULL`. Email may be omitted and is stored as null. A non-blank phone or email must pass the existing format checks. The online party cap of 8 does not apply. The guest widget still requires a name, a valid email, and a party of at most 8.

The selected table must have enough seats, and its occupying window must not overlap another `confirmed` or `seated` reservation. The existing `validate_reservation_availability` trigger still applies, so a blocked date, a closed day, a time outside opening hours, or a full cover cap also refuses creation. There is no walk-in exception on that trigger. On success, the table group is set to `seated` the same way an existing seat transition does. Completion uses the existing `seated → completed` transition. The row gets a `conf_code` because that column is required. No booking confirmation email is sent.

Out of this spec: a separate visit table, a guest-created walk-in, a future date or a chosen time, an unassigned walk-in, a change to guest-widget validation, a change to the availability trigger, and a walk-in confirmation email.

## Acceptance criteria

1. **WI-1 — Staff gate.** The walk-in create action uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot create a walk-in. A `super_admin` session can. The control lives on the selected table at `/admin/floor` with `data-testid="walk-in-seat"`.

2. **WI-2 — Seated row.** A successful create inserts one `reservations` row with `status = 'seated'`, that table's `table_label`, `date` from `getTodayInRestaurantTZ()`, and `time` from `getNowTimeInRestaurantTZ()`. `party_size` is the submitted integer. Omitted name and phone are stored as `''`. Omitted email is stored as null. `conf_code` matches `TVL-####` and is unique. The action does not send a booking confirmation email, including when an email was stored.

3. **WI-3 — Party size.** Party size must be an integer of at least 1. `0`, a negative, a fraction, and a non-number are refused and no row is written. A party larger than 8 is accepted when the table has enough seats and the availability trigger allows it. Guest `validateReservationPayload` still rejects a party larger than 8.

4. **WI-4 — Contact format.** A non-blank phone must match `PHONE_RE`. A non-blank email must match `EMAIL_RE`. A failed check writes no row. A valid name, phone, and email are stored trimmed.

5. **WI-5 — Fit and overlap.** If the table's `seats` are below the party size, creation is refused and no row is written. If another `confirmed` or `seated` reservation on that label has an overlapping occupying window, creation is refused and no row is written. A non-overlapping reservation on that label does not block creation.

6. **WI-6 — Existing trigger.** A blocked date, a closed day, a time outside opening hours, or a full restaurant, slot, or service cover cap refuses creation and writes no row. `validate_reservation_availability` gains no walk-in exception.

7. **WI-7 — Table becomes seated.** On success, the table group is set to `seated` the same way the existing `seated` transition does. The floor overlay for that table shows the walk-in as seated, with its party size and time.

8. **WI-8 — Completion.** `transitionReservationStatus` from `seated` to `completed` on that row persists `completed`, stamps `completed_at`, clears `table_label`, and returns the table to `available`. No new status edge is added.

## Implementation trace (non-normative)

FEATURE `res-83_walk_in_seating_41f0` (RES-83, 2026-10-02). WI-1–WI-8 shipped. `seatWalkIn` in `app/actions/reservations.ts` calls `requireStaffUser`, then `createServiceClient`. Party size is an inline integer `>= 1` check (`errors.reservation.partySizeInvalid`); it does not call `validateReservationPayload`. Name and phone trim to `''`. Email uses `input.email == null ? null : input.email.trim()`, then `if (phone && !PHONE_RE.test(phone))` and `if (email && !EMAIL_RE.test(email))`. A table read error returns `errors.reservation.tablesLoadFailed`, a settings read error returns `errors.availability.settingsLoadFailed`, and an occupancy read error returns `errors.reservation.loadFailed`; none of those insert. The insert is `status: "seated"` for `getTodayInRestaurantTZ()` / `getNowTimeInRestaurantTZ()` with `generateConfCode()` and no `sendBookingConfirmation`. A trigger error returns `error.message`, except the per-label overlap exception which maps to `errors.reservation.tableOverlap`. `reject_overlapping_table_label` takes `pg_advisory_xact_lock(133, …)` before that overlap read. After a successful insert, `if (table?.id)` calls `syncTableGroupStatus(input.table_label, "seated")`. `WalkInSeat` in `components/staff/floor-plan.tsx` collects party size, name, phone, and email and calls `seatWalkIn` from `data-testid="walk-in-seat"` on both selected-table panels. Completion stays the existing `seated → completed` edge.

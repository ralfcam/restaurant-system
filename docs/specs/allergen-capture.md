# Allergen capture

**Status:** Draft
**Last updated:** 2026-10-02

## Scope

A guest can record allergy or allergen information on the reservation they are creating. The value is `reservations.allergens`, a nullable text column on that row only. The guest reservation widget gains an optional field on the guest-details step. Blank or omitted input is stored as null, and the reservation can still be completed. Staff see a non-null value on that reservation in `/admin/reservations`.

The guest INSERT allowlist in [booking-rules.md](./booking-rules.md) stays `guest_name`, `party_size`, `date`, `time`, `phone`, `email`, `notes`, and `conf_code`. `createReservation` writes `allergens` with the service role onto the row it just created. A direct guest insert cannot set the column. If that service-role write fails, the new reservation is removed and the guest receives an error. Name, email, party size, availability, and confirmation stay as they are.

Stored text is trimmed and at most 500 characters. A longer value is refused and no reservation is written. The value is shown only on its own reservation.

Out of this spec: an allergen code list, a rollup of allergens onto the guest ficha, and a change to the guest INSERT allowlist.

## Acceptance criteria

1. **AL-1 — Guest field.** The guest-details step of the reservation widget includes an optional allergens field with `data-testid="reservation-allergens-input"`. Submitting a reservation with the field left blank still creates the reservation and stores `allergens` as null.

2. **AL-2 — Saved on the row.** A non-blank value is stored trimmed on that reservation's `allergens` column and is at most 500 characters. A value longer than 500 characters creates no reservation. The guest INSERT allowlist does not include `allergens`. The service-role write is limited to that column on the new row. If that write fails, the new reservation is removed.

3. **AL-3 — Staff display.** Staff loading `/admin/reservations` see the saved text on that reservation with `data-testid="reservation-allergens"`. A null value renders no allergen text and the rest of the row still renders. An unauthenticated caller follows the existing `/admin` login redirect.

4. **AL-4 — Isolation.** The allergen text stored on one reservation is not rendered on any other reservation. Two reservations for the same email keep their own values.

5. **AL-5 — Completion.** `transitionReservationStatus` to `completed` still succeeds when `allergens` is null and when it is set. The column is unchanged by that transition.

6. **AL-6 — Neighbor rules stay.** Guest `validateReservationPayload` still requires a name, a valid email, and a party of at most 8. Availability, capacity, and the booking confirmation email are unchanged.

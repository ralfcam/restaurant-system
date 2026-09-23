# TDD log — res-68_hide_occupied_dropdown_a7c2e1f4

## C1

Suggested review order:
- occupancy omit [booking] · `lib/reservations/selectable-tables.ts:35-40`
- OccupancyBag `Pick<AssignableReservation>` · `lib/reservations/selectable-tables.ts:11-19`
- claimed windows / skip own id [booking] · `lib/reservations/selectable-tables.ts:43-68`
- write-path sibling (settings vs 90+15) [booking] · `app/actions/reservations.ts:431-456`
- C1 assertions (untouched) · `tests/unit/reservations/selectable-tables.test.ts:43-89`

Reusable pattern: Occupancy bags should `Pick` from `AssignableReservation` instead of a second DTO so dropdown and `assignReservationTable` share one reservation shape.

## C2

Suggested review order:
- skip-own-id keep-path [booking] · `lib/reservations/selectable-tables.ts:56`
- occupancy omit after keep [booking] · `lib/reservations/selectable-tables.ts:37-41`
- OccupancyBag `Pick<AssignableReservation>` · `lib/reservations/selectable-tables.ts:11-19`
- JSDoc: own row is not a foreign claim · `lib/reservations/selectable-tables.ts:21-28`
- write-path sibling skip-self [booking] · `app/actions/reservations.ts:448-449`
- C2 assertions (untouched) · `tests/unit/reservations/selectable-tables.test.ts:91-130`

Reusable pattern: Collect occupying claims with `row.id === candidate.id` skipped so a reservation’s own assigned label stays selectable; do not use `currentLabel` as the omit-exemption (write path already skips `row.id === reservationId`).

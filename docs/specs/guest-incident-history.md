# Guest incident history

**Status:** Draft
**Last updated:** 2026-10-02

## Scope

The guest ficha shows no-shows, late cancellations, and delays for that normalized email. Incidents are derived from the reservation row. There is no separate incident table. A reservation with a null or blank email still has no ficha, as in [guest-profiles.md](./guest-profiles.md).

`no_show` is the existing status. A late cancellation is `status = 'cancelled'` with `cancelled_at` set, and `cancelled_at` at or after 24 hours before the reservation start in the restaurant timezone. An earlier cancellation is not an incident. A delay is a `seated` or `completed` reservation whose `seated_at` is more than 15 minutes after the reservation start in the restaurant timezone. The existing transition to `cancelled` stamps `cancelled_at`. The existing transition to `seated` stamps `seated_at`. A walk-in inserted already seated stamps `seated_at` at insert time.

Each incident shows its type and the reservation `date`. Several reservations produce several incidents. Another email's incidents are not shown. Reloading the ficha shows the same incidents.

Out of this spec: a separate incident table, a guest-facing history, a late-cancel window other than 24 hours, and a delay threshold other than 15 minutes.

## Acceptance criteria

1. **GI-1 — Ficha list.** The staff ficha for a normalized email renders incidents with `data-testid="guest-incidents"`. The reader uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. Each item shows the type `no_show`, `late_cancel`, or `delay`, and that reservation's `date`.

2. **GI-2 — No-show.** When a reservation for that email has `status = 'no_show'`, the ficha includes one `no_show` incident for that reservation date. A `confirmed` reservation does not.

3. **GI-3 — Late cancel.** Transitioning a reservation to `cancelled` stamps `cancelled_at`. The ficha includes one `late_cancel` incident when `cancelled_at` is at or after 24 hours before the reservation start. A cancellation before that instant stamps `cancelled_at` and adds no incident. A `cancelled` row with null `cancelled_at` adds no incident.

4. **GI-4 — Delay.** Transitioning a reservation to `seated` stamps `seated_at`. The ficha includes one `delay` incident when status is `seated` or `completed` and `seated_at` is more than 15 minutes after the reservation start. A seating at or before that instant adds no delay. Completing the reservation does not remove the delay.

5. **GI-5 — Persistence and fan-out.** Reloading the ficha shows the same incidents. One email with three matching reservations shows three incidents. An incident for one email is absent from a different email's ficha.

6. **GI-6 — One type per reservation.** A `no_show` row contributes only `no_show`. A late `cancelled` row contributes only `late_cancel`. A delayed `seated` or `completed` row contributes only `delay`.

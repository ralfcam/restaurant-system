# Guest profiles

**Status:** Draft
**Last updated:** 2026-09-15

## Scope

Staff-only customer ficha for the host / reservations desk. Chrome is
`/admin/customers/[email]` ([staff-authorization.md](./staff-authorization.md)
SA-2). The ficha is opened from an existing reservation that has a non-blank
email. Identity is `reservations.email` trimmed and lowercased. There is no
`guests` table and no `guest_id` in this spec.

The page shows the guest fields already stored on reservations (`guest_name`,
`email`, `phone`, `notes`) and every reservation with that normalized email,
newest `date` then `time` first. `completed` reservations are visits;
`confirmed`, `seated`, and `cancelled` are not. Staff may save `guest_name`
and `phone`; Save writes those two columns to every reservation in the group.
`email` is read-only on the ficha.

A later reservation inserted with the same normalized email appears on the
next staff ficha read. Histories for different emails never mix. A
blank/null/whitespace email has no ficha and no link from the reservation
row.

Guest roles still cannot `SELECT` reservations
([booking-rules.md](./booking-rules.md) AC-5 / RES-PRIV). This spec does not
change guest INSERT allowlists.

Out of this spec: a customer list/directory, a guest-facing portal, a
`guests` table / `guest_id`, duplicate merge and name/phone matching
(RES-84 / RES-92), editing or merging by email, tags / blacklist / channel /
ratings / no-show ledger (RES-105–111), visit-count badge and
returning-guest highlight (RES-79 / RES-82), and editing `notes` on the
ficha.

## Acceptance criteria

1. **GP-1 — Staff route** — `GET /admin/customers/[email]` is a staff
   `/admin` path ([staff-authorization.md](./staff-authorization.md) SA-2).
   The reader MUST use `requireStaffUser` plus `createServiceClient`.
   Unauthenticated requests follow the existing `/admin` login redirect.
   Authenticated non-staff MUST NOT receive the ficha payload or chrome. A
   `super_admin` session may use it (SA-1). Staff chrome stays English-only
   ([site-localization.md](./site-localization.md)).

2. **GP-2 — Identity key** — `[email]` is interpreted as trim + lowercase.
   A reservation belongs to the ficha iff
   `trim(lower(reservations.email))` equals that key. Reservations with
   null, blank, or whitespace-only email MUST NOT appear on any ficha. The
   path parameter is the normalized email, percent-encoded in the URL.

3. **GP-3 — Isolation** — A ficha for email A MUST NOT include any
   reservation whose normalized email is B.

4. **GP-4 — Guest fields** — The ficha displays `guest_name`, `email`
   (read-only), `phone`, and `notes`. When rows in the group disagree,
   name / phone / notes shown are those of the newest reservation (`date`,
   then `time`). The email shown is the identity key.

5. **GP-5 — Reservation history** — The ficha lists every associated
   reservation with at least date, time, `party_size`, and status.

6. **GP-6 — Visits** — A history row with `status = 'completed'` is marked
   as a visit. `confirmed`, `seated`, and `cancelled` are not visits.
   `no_show` is not a visit if that status appears later (RES-67).

7. **GP-7 — Order** — History is ordered by reservation `date` descending,
   then `time` descending (newest first).

8. **GP-8 — New reservation appears** — After a reservation is inserted with
   the same normalized email, the next staff ficha read includes that row.
   No rebuild job is required.

9. **GP-9 — Entry from reservation** — On `/admin/reservations`, a
   reservation with a non-blank email exposes a control that navigates to
   `/admin/customers/{normalizedEmail}`. A reservation with blank email
   exposes no ficha control. v1 does not require a customer-list nav item.

10. **GP-10 — PII edit** — Staff can submit a new `guest_name` and `phone`
    on the ficha. The mutation updates `guest_name` and `phone` on every
    reservation in the group and MUST NOT change `email` on any row. The
    email field is not an editable control. Unauthenticated and
    authenticated non-staff MUST NOT mutate.

11. **GP-11 — RES-PRIV** — The ficha reader and mutator MUST NOT grant
    `anon` or `authenticated` `SELECT` on `reservations`. Guest INSERT
    remains insert-only per [booking-rules.md](./booking-rules.md) AC-5.

12. **GP-12 — Empty key** — Visiting `/admin/customers/[email]` with a
    normalized email that matches no reservations shows a clear
    empty/not-found state and MUST NOT list any other guest's reservations.

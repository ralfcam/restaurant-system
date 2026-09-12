# Reservation and occupancy analytics

**Status:** Draft
**Last updated:** 2026-09-12

## Scope

Staff-only reporting at `/admin/analytics` (SA-2). For an inclusive
`reservations.date` range, staff review three aggregate slices computed from
persisted reservations and reservation `status_events`. Analytics never
writes `reservations`, `tables`, or `status_events`, and never shows
`guest_name`, `email`, or `phone`. Guest roles still cannot `SELECT`
reservations ([booking-rules.md](./booking-rules.md) AC-5).

Slices: (1) counts of `no_show` and `cancelled`; (2) floor-wide actual visit
duration from the earliest seated `status_events.created_at` to
`completed_at`; (3) restaurant-level booking volume by date, weekday, hour,
and `party_size`. Per-table turnover, guest CRM, CSV/email export,
forecasting, channel-import analytics, and inferred guest attributes are out
of this spec.

**Dependency (non-blocking for the contract):** RA-5 still counts
`status = 'no_show'`. Until [RES-67](https://linear.app/realized/issue/RES-67/fix-reservation-completion-and-no-show-status-transitions)
allows that value in the `reservations.status` CHECK, those rows cannot
persist and the count stays 0 on a real database.

## Acceptance criteria

1. **RA-1 — Staff gate** — `/admin/analytics` is a staff `/admin` path
   ([staff-authorization.md](./staff-authorization.md) SA-2). The analytics
   reader MUST use `requireStaffUser` plus `createServiceClient`.
   Unauthenticated requests follow the existing `/admin` login redirect.
   Authenticated non-staff MUST NOT receive the analytics payload or chrome.
   The reader is classified `staff` on SA-8. A `super_admin` session may
   use it (SA-1). Staff shell MUST include a nav item to `/admin/analytics`.

2. **RA-2 — Read-only** — Serving analytics MUST NOT `INSERT`, `UPDATE`, or
   `DELETE` `reservations`, `tables`, or `status_events`. A staff analytics
   request against a known fixture leaves those tables' row counts and
   values unchanged.

3. **RA-3 — Period** — Staff supplies inclusive `from` and `to` as
   `YYYY-MM-DD` compared to `reservations.date`. Presets: last 7, 30, and
   90 restaurant-local calendar days using [lib/timezone.ts](lib/timezone.ts)
   (`Europe/Zurich`); default is last 7 days. If `from` is after `to`, or
   either date is missing/invalid, the reader MUST reject with a stable error
   and MUST NOT return a successful empty report.

4. **RA-4 — One period, three slices** — One successful load returns
   outcomes, duration, and patterns for the same `from`/`to`. Changing the
   period replaces all three. Metrics from a previous range MUST NOT remain
   on the page or in the payload.

5. **RA-5 — Outcomes** — In the date range, report an integer count of rows
   with `status = 'no_show'` and an integer count with `status = 'cancelled'`.
   `confirmed`, `seated`, and `completed` MUST NOT increment either count. A
   successful load of a range with no matching rows returns `0` and `0`
   (not an error).

6. **RA-6 — Visit duration** — Include a reservation only when all of:
   `date` in range, `status = 'completed'`, `completed_at` is non-null, and
   there is at least one `status_events` row with `entity_type =
'reservation'`, `entity_id` equal to that reservation's id, and
   `to_status = 'seated'`. Duration minutes = `completed_at` minus the
   earliest such event `created_at`, rounded to the nearest whole minute
   (half up). Report `sample_count` and, when `sample_count > 0`, `mean_minutes`.
   When `sample_count = 0`, `mean_minutes` is absent/null — the UI MUST NOT
   display `occupancy_duration_minutes` (or any other configured expected
   duration) as the mean. No per-table breakdown.

7. **RA-7 — Booking patterns** — For every reservation with `date` in range
   (all statuses), report: count per `date`; count per weekday (0–6 via the
   restaurant-TZ day-of-week helper on that date); count per hour 0–23 taken
   from `time` `HH:MM` (the `HH` prefix); and count per integer `party_size`.
   A malformed `time` is omitted from the hour histogram only; the row still
   counts toward date, weekday, and party_size. The payload MUST NOT include
   `guest_name`, `email`, or `phone`.

8. **RA-8 — Fail-closed load** — Auth failure or a non-null query error MUST
   return a Result with a stable `error` and MUST NOT present zeros as a
   successful empty period (same distinction as booking-rules STAFF-LIST).
   Genuine all-zero success omits `error`.

9. **RA-9 — Privileges unchanged** — Analytics MUST NOT `GRANT SELECT` on
   `reservations` or `status_events` to `anon` or `authenticated`. Booking-rules
   AC-5 and scheduling SIB-PRIV stay.

10. **RA-10 — No guest PII on the surface** — The analytics UI and JSON
    MUST NOT include `guest_name`, `email`, or `phone`.

## References

- [booking-rules.md](./booking-rules.md) AC-5, BW-10, STAFF-LIST
- [staff-authorization.md](./staff-authorization.md) SA-1, SA-2, SA-8
- [scheduling.md](./scheduling.md) FP-5 (`table_label` cleared on complete), timezone
- Linear parent RES-93 (children RES-88, RES-89, RES-90)

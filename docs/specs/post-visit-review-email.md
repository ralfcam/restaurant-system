# Post-visit review email

**Status:** Draft  
**Last updated:** 2026-08-30

## Scope

Guest post-visit thank-you + Google Maps review ask. Staff configure the
feature on `/admin/marketing`. Trigger is a reservation transitioning to
`completed` ([../specs/scheduling.md](./scheduling.md) terminal status;
[../specs/booking-rules.md](./booking-rules.md) owns intake and guest email
collection). This spec does not collect email and does not change branding-cms.

When a reservation becomes `completed`, the system queues exactly one email
to that booking’s stored guest email after a staff-configured delay. The
email uses the latest saved thank-you copy and includes the restaurant’s
Google Maps URL as a link. Fail-closed: default off; no send if the toggle
is off, copy is blank, Maps URL is missing/invalid, the reservation has
no email, or current status is not still `completed`. Send failure does
not change reservation status.

## Acceptance criteria

1. **PV-1 — Staff marketing page** — `/admin/marketing` is staff-gated.
   Unauthenticated access is rejected. The page exposes: enable toggle
   (default off), thank-you copy, Google Maps URL, and delay after completed
   (integer hours).

2. **PV-2 — Staff-only persist** — Authenticated staff writes persist toggle,
   copy, Maps URL, and delay. Unauthenticated writes return `Unauthorized`.
   Guests cannot write these settings.

3. **PV-3 — Fail-closed send gates** — The send job MUST NOT send when any
   of: toggle off; thank-you copy blank/whitespace; Maps URL missing or not
   a valid `https:` URL; reservation has no guest email; current status is
   not `completed` (including after undo). These are silent skips, not
   reservation errors, and not successful sends.

4. **PV-4 — Trigger** — A send is queued only on transition to `completed`.
   `cancelled`, `no_show`, `confirmed`, and `seated` MUST NOT queue.

5. **PV-5 — Delay** — Send occurs only after `delay_hours` (allowed 0–72
   inclusive, default 24, invalid including NaN → 24) have elapsed since the
   timestamp of the transition into `completed` (persist that timestamp).
   MUST NOT use `updated_at` or predicted visit end as the clock. Delay `0`
   may send in the same processing window after complete.

6. **PV-6 — At most one success** — At most one successful review email per
   reservation. Settings edits MUST NOT resend. After a send failure, retries
   of the same reservation are allowed until one success, then never again.

7. **PV-7 — Recipient and body** — A successful send goes to that
   reservation’s guest email. Body includes the latest saved thank-you copy
   and the Maps URL as a link. Copy is staff-entered (no auto FR/EN
   translation).

8. **PV-8 — Integrity** — Send success or failure MUST NOT change
   reservation status, table assignment, or occupancy. The reservation stays
   `completed`.

9. **PV-9 — PII** — Guest email used for sending MUST NOT be readable via
   the anon key (booking-rules AC-5). The send path is a service-role /
   staff-authenticated server job, not a guest client. Unauthenticated
   invocations of the send job MUST NOT send.

10. **PV-10 — Enable requires complete config** — Turning the toggle on
    requires non-blank copy and a valid `https:` Maps URL; reject with the
    stable error `Review email cannot be enabled without thank-you copy and a valid https Maps URL.`
    otherwise. Incomplete drafts MAY be saved while the toggle stays off.

## Implementation trace (non-normative)

FEATURE `post-visit_review_tdd_ac1962e1` (2026-08-30). C1–C11 shipped;
live-provider-delivery is manual-UAT.

Schema still missing from baseline (app code writes these; `db reset` will
not create them): `restaurant_settings.review_email_*`, table
`review_email_sends`, `reservations.completed_at`. Shipped DDL is nullable
`reservations.email` only (CREATE TABLE column + `ALTER TABLE … ADD COLUMN
IF NOT EXISTS`; RES-PRIV unchanged — no `GRANT SELECT`).

| Criterion | Shipped in                                                                                                                                                                              | Tests                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| PV-1      | `/admin/marketing` (`StaffShell`, Setup nav). Form: enable (default off), copy, Maps URL, delay (default 24). Write-only — no settings loader (`review_email_*` columns missing).       | `tests/unit/marketing/marketing-page.test.ts`                                                                         |
| PV-2      | `saveReviewEmailSettings` — `requireStaffUser` then `{ error: "Unauthorized." }`; service-role upsert `{ id: 1, …patch, updated_at }`                                                   | `tests/unit/marketing/review-email-settings.test.ts`                                                                  |
| PV-3      | `processDueReviewEmails` silent skip: toggle off, blank copy, non-`https:` Maps URL, missing email, status not `completed`                                                              | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-4      | `transitionReservationStatus` inserts `review_email_sends` only when `nextStatus === "completed"` (table not in schema yet)                                                             | `tests/unit/marketing/review-email-queue.test.ts`                                                                     |
| PV-5      | Status write stamps `completed_at` (column not in schema yet). Due = `now >= completed_at + delayHours`; invalid delay (incl. NaN / out of 0–72) → 24, not bound-clamp. Injected `now`. | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-6      | Scan `.is("sent_at", null)`; stamp `UPDATE … .eq(reservation_id).is("sent_at", null)` after `mailer.send()`                                                                             | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-7      | `{ to, html }` — escaped copy + Maps URL as `href`. No From/subject. Throwing mailer stub on the cron route.                                                                            | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-8      | Sole mutation is `review_email_sends.sent_at`                                                                                                                                           | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-9      | `GET /api/cron/review-email` — empty/unset `CRON_SECRET` or wrong Bearer is 401 (never matches `Bearer undefined`). Anon cannot `SELECT` `reservations.email`.                          | `tests/unit/marketing/review-email-job-auth.test.ts`; `tests/integration/reservations/review-email-pii.integ.test.ts` |
| PV-10     | Enable requires trimmed copy + `isHttpsUrl` (`lib/marketing/https-url.ts`); stable error string                                                                                         | `tests/unit/marketing/review-email-settings.test.ts`                                                                  |

## References

- `app/admin/marketing/page.tsx`, `app/admin/marketing/review-email-settings-form.tsx`
- `app/actions/marketing.ts`, `app/actions/reservations.ts` (`transitionReservationStatus`)
- `lib/marketing/review-email.ts` (`processDueReviewEmails`), `lib/marketing/https-url.ts`
- `app/api/cron/review-email/route.ts`
- `components/staff/staff-shell.tsx` (Setup → Marketing)
- `supabase/migrations/00000000000000_baseline.sql` (`reservations.email`)
- [booking-rules.md](./booking-rules.md) (AC-5 RES-PRIV; intake / guest email)
- [scheduling.md](./scheduling.md) (`completed` terminal status)
- [../runbooks/deploy.md](../runbooks/deploy.md) (`CRON_SECRET`)
- [../testing/Design-And-Patterns.md](../testing/Design-And-Patterns.md)

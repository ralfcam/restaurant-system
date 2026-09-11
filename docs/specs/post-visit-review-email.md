# Post-visit review email

**Status:** Draft  
**Last updated:** 2026-09-09

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

2. **PV-2 — Super-admin-only persist** — Authenticated super_admin writes
   persist toggle, copy, Maps URL, and delay (see
   [staff-authorization.md](./staff-authorization.md) SA-7/SA-8).
   Unauthenticated writes and authenticated staff-only writes return
   `Unauthorized`. Guests cannot write these settings.

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
   Overlapping `processDue` invocations MUST NOT both send for the same
   reservation: the job MUST take an exclusive claim on that reservation's
   `review_email_sends` row (compare-and-set `sent_at` from null, or an
   equivalent exclusive claim) BEFORE invoking the mailer. A lost claim MUST
   NOT call the mailer. A mailer failure MUST release the claim so retries
   remain allowed.

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
   invocations of the send job MUST NOT send. The processor module that
   constructs the service-role client (`lib/marketing/review-email.ts`) MUST
   `import "server-only"` so a client-bundle import fails at build time. That
   module MUST NOT be a `"use server"` file: exporting `processDueReviewEmails`
   as a Server Action would expose an unauthenticated send entrypoint (auth is
   the cron Bearer check on `GET /api/cron/review-email`).

10. **PV-10 — Enable requires complete config** — Turning the toggle on
    requires non-blank copy and a valid `https:` Maps URL; reject with the
    stable error `Review email cannot be enabled without thank-you copy and a valid https Maps URL.`
    otherwise. Incomplete drafts MAY be saved while the toggle stays off.

11. **PV-11 — Settings persist columns** — Baseline DDL MUST include on
    `restaurant_settings`: `review_email_enabled` BOOLEAN NOT NULL DEFAULT
    false; `review_email_copy` TEXT; `review_email_maps_url` TEXT;
    `review_email_delay_hours` INT NOT NULL DEFAULT 24. Both the
    `CREATE TABLE` definition and `ALTER TABLE … ADD COLUMN IF NOT EXISTS`
    MUST expose them (same idempotent pattern as `slot_interval_minutes`).
    A service-role upsert of those four keys on `id = 1` MUST persist and
    read back. Public SELECT of `restaurant_settings` MAY include these
    columns (marketing copy, not guest PII).

12. **PV-12 — Send-queue table** — Baseline MUST create `review_email_sends`
    with `reservation_id UUID PRIMARY KEY REFERENCES reservations(id) ON
DELETE CASCADE` and `sent_at TIMESTAMPTZ` nullable default null. RLS
    enabled. Anon and authenticated MUST NOT SELECT/INSERT/UPDATE/DELETE
    (no public policies; no GRANT to anon/authenticated). `service_role`
    MUST INSERT `{ reservation_id }` and UPDATE `sent_at`. This is the
    PV-6 claim row.

13. **PV-13 — completed_at clock column** — Baseline MUST include nullable
    `reservations.completed_at TIMESTAMPTZ` on `CREATE TABLE` and
    `ALTER TABLE … ADD COLUMN IF NOT EXISTS` (same pattern as
    `reservations.email`). A service-role UPDATE that sets `completed_at`
    MUST persist. This is the PV-5 clock; `updated_at` MUST NOT be added
    as a substitute.

14. **PV-14 — Cron mailer factory** — `GET /api/cron/review-email` MUST
    obtain `{ send }` from a `server-only` `createReviewEmailMailer()`
    (own module, not inlined in the route). The route MUST NOT contain
    `throw new Error("Mail provider is not configured.")`. When no
    provider credentials are configured, the factory’s `send` MAY throw
    that same fail-closed error (BW-14 class). Live provider delivery
    remains manual-UAT.

15. **PV-15 — Scheduled invocation** — Production MUST invoke
    `GET /api/cron/review-email` on a schedule. MUST NOT register a
    Vercel `crons` entry (Hobby rejects more-than-daily expressions).
    Schedule is a Supabase Edge Function `review-email` invoked hourly
    (`0 * * * *`) via `pg_cron` + `pg_net`. The function authenticates
    with the same Bearer `CRON_SECRET` as PV-9 and forwards to the Next
    route (PV-14 stays the worker). Delay `0` sends on the next hourly
    tick.

16. **PV-ISO — Mutating review-email integration is local-only.** Mutating
    automated coverage under `tests/integration/marketing/*.integ.test.ts`
    (settings upsert/restore, `review_email_sends` / `reservations`
    inserts and cleanup) MUST run only against **local** Supabase
    (`NEXT_PUBLIC_SUPABASE_URL` host `127.0.0.1`, `localhost`, or `[::1]`).
    It MUST fail closed — not skip — when the URL is the shared linked
    project `tilcqrudqxznnpepxjqq` (or any other non-local host). Use
    `authEnvReady` / `RESTAURANT_INTEGRATION_STRICT` **plus**
    `assertIsolatedHoursMutationTarget()` from
    `lib/scheduling/hours-mutation-target.ts` (same helper as
    booking-rules RES-ISO / scheduling.md §15). Call it as the **first
    statement** of every write hook that exists (`beforeAll`,
    `beforeEach`, `afterEach`, `afterAll`). The call MUST be
    zero-argument. Do not put the guard in `createServiceClient`. A new
    file matching that glob MUST include the same pin.

## Implementation trace (non-normative)

FEATURE `post-visit_review_tdd_ac1962e1` (2026-08-30). C1–C11 shipped;
live-provider-delivery is manual-UAT.

PV-11–PV-15 require baseline `review_email_*` / `review_email_sends` /
`reservations.completed_at` and a Supabase-scheduled `review-email` Edge
Function (not Vercel Cron); this FIX owns those. Live provider delivery
stays manual-UAT. Shipped DDL already includes
nullable `reservations.email` (CREATE TABLE column + `ALTER TABLE … ADD
COLUMN IF NOT EXISTS`; RES-PRIV unchanged — no `GRANT SELECT`).

| Criterion | Shipped in                                                                                                                                                                                | Tests                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| PV-1      | `/admin/marketing` (`StaffShell`, Setup nav). Form: enable (default off), copy, Maps URL, delay (default 24). Write-only — no settings loader (columns now exist; loader still deferred). | `tests/unit/marketing/marketing-page.test.ts`                                                                         |
| PV-2      | `saveReviewEmailSettings` — `requireSuperAdminUser` then `{ error: "Unauthorized." }`; service-role upsert `{ id: 1, …patch, updated_at }`                                                | `tests/unit/marketing/review-email-settings.test.ts`                                                                  |
| PV-3      | `processDueReviewEmails` silent skip: toggle off, blank copy, non-`https:` Maps URL, missing email, status not `completed`                                                                | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-4      | `transitionReservationStatus` inserts `review_email_sends` only when `nextStatus === "completed"` (table in baseline)                                                                     | `tests/unit/marketing/review-email-queue.test.ts`                                                                     |
| PV-5      | Status write stamps `completed_at` (column in baseline). Due = `now >= completed_at + delayHours`; invalid delay (incl. NaN / out of 0–72) → 24, not bound-clamp. Injected `now`.         | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-6      | Scan `.is("sent_at", null)`; stamp `UPDATE … .eq(reservation_id).is("sent_at", null)` after `mailer.send()`                                                                               | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-7      | `{ to, html }` — escaped copy + Maps URL as `href`. No From/subject. Cron uses `createReviewEmailMailer()` (BW-14 unconfigured throw). Live inbox manual-UAT.                             | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-8      | Sole mutation is `review_email_sends.sent_at`                                                                                                                                             | `tests/unit/marketing/review-email-send.test.ts`                                                                      |
| PV-9      | `GET /api/cron/review-email` — empty/unset `CRON_SECRET` or wrong Bearer is 401 (never matches `Bearer undefined`). Anon cannot `SELECT` `reservations.email`.                            | `tests/unit/marketing/review-email-job-auth.test.ts`; `tests/integration/reservations/review-email-pii.integ.test.ts` |
| PV-10     | Enable requires trimmed copy + `isHttpsUrl` (`lib/marketing/https-url.ts`); stable error string                                                                                           | `tests/unit/marketing/review-email-settings.test.ts`                                                                  |
| PV-11     | `restaurant_settings.review_email_*` on CREATE TABLE + `ALTER … ADD COLUMN IF NOT EXISTS`                                                                                                 | `tests/integration/marketing/review-email-schema.integ.test.ts`                                                       |
| PV-12     | `review_email_sends` PK/FK CASCADE, RLS, service-role only                                                                                                                                | `tests/integration/marketing/review-email-schema.integ.test.ts`                                                       |
| PV-13     | `reservations.completed_at` nullable timestamptz (CREATE + ALTER)                                                                                                                         | `tests/integration/marketing/review-email-schema.integ.test.ts`                                                       |
| PV-14     | `createReviewEmailMailer()` in `lib/marketing/review-email-mailer.ts`; cron GET passes factory mailer                                                                                     | `tests/unit/marketing/review-email-cron-mailer.test.ts`                                                               |
| PV-15     | Supabase Edge Function `review-email` + hourly `pg_cron`; no Vercel `crons`                                                                                                               | `tests/unit/marketing/review-email-cron-schedule.test.ts`                                                             |
| PV-ISO    | `assertIsolatedHoursMutationTarget()` (zero-arg) at start of every write hook in `tests/integration/marketing/*.integ.test.ts`. Same helper as booking-rules RES-ISO.                     | `tests/unit/marketing/review-email-schema-isolation.test.ts`                                                          |

## References

- `app/admin/marketing/page.tsx`, `app/admin/marketing/review-email-settings-form.tsx`
- `app/actions/marketing.ts`, `app/actions/reservations.ts` (`transitionReservationStatus`)
- `lib/marketing/review-email.ts` (`processDueReviewEmails`), `lib/marketing/https-url.ts`, `lib/marketing/review-email-mailer.ts`
- `app/api/cron/review-email/route.ts`, `supabase/functions/review-email/index.ts`
- `components/staff/staff-shell.tsx` (Setup → Marketing)
- `supabase/migrations/00000000000000_baseline.sql` (`reservations.email`, `completed_at`, `review_email_*`, `review_email_sends`)
- [booking-rules.md](./booking-rules.md) (AC-5 RES-PRIV; intake / guest email)
- [scheduling.md](./scheduling.md) (`completed` terminal status)
- [../runbooks/deploy.md](../runbooks/deploy.md) (`CRON_SECRET`)
- [../testing/Design-And-Patterns.md](../testing/Design-And-Patterns.md)

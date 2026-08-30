# TDD verifier report — post-visit review email (`post-visit_review_tdd_ac1962e1`)

FEATURE run. Linear: none.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — PV-2 staff-only persist

Suggested review order: staff-only write gate [auth][security] `app/actions/marketing.ts:12` ; unauth no-upsert [auth] `tests/unit/marketing/review-email-settings.test.ts:60` ; singleton persist payload [public-api] `app/actions/marketing.ts:15` ; staff upsert expectation `tests/unit/marketing/review-email-settings.test.ts:46` ; DB error mapping `app/actions/marketing.ts:25`

Reusable pattern: Staff `restaurant_settings` persist: `requireStaffUser` then `{ error: "Unauthorized." }` (never throw); service-role upsert `{ id: 1, …patch, updated_at }`; unit-test with hoisted `requireStaffUser` + `from`/`upsert` mocks and `objectContaining` so extra columns stay free.

### C2 — PV-10 enable requires complete config

Suggested review order:
- PV-10 enable gate [public-api] `app/actions/marketing.ts:23`
- HTTPS Maps URL parse [security] `app/actions/marketing.ts:5`
- Staff session before validation/upsert [auth] `app/actions/marketing.ts:20`
- Blank copy / `http:` reject + incomplete draft persist `tests/unit/marketing/review-email-settings.test.ts:65`
- Singleton upsert payload `app/actions/marketing.ts:30`

Reusable pattern: File-private `isHttpsUrl` (`new URL(value).protocol === "https:"` in try/catch) inside a `"use server"` module — do not export sync helpers from action files; enable = `enabled && (!copy.trim() || !isHttpsUrl(mapsUrl))` → PV-10 string, skip upsert.

### C3 — PV-3 fail-closed send gates

Suggested review order:
- Fail-closed settings gates [booking] `lib/marketing/review-email.ts:36`
- Per-row email + still-`completed` gates [booking] `lib/marketing/review-email.ts:58`
- Shared HTTPS parse [security] `lib/marketing/https-url.ts:1`
- Query-error skip (settings, then sends) `lib/marketing/review-email.ts:28`
- PV-10 enable still uses the same helper [public-api] `app/actions/marketing.ts:16`
- Skip table (off, whitespace copy, `http:`, missing email, not completed) `tests/unit/marketing/review-email-send.test.ts:69`

Reusable pattern: Keep `isHttpsUrl` (`new URL(value).protocol === "https:"` in try/catch) in `lib/`, never export it from a `"use server"` file; send job fail-closed = log+return on settings/sends errors, return before scanning rows when toggle/copy/https fail, then per-row skip for blank email or status not `completed`.

### C4 — PV-4 queue only on completed

Suggested review order:
- Queue-only-on-completed insert [booking] `app/actions/reservations.ts:294`
- Staff gate before any write [auth] `app/actions/reservations.ts:256`
- Status patch + `table_label` clear unchanged [booking] `app/actions/reservations.ts:276`
- `status_events` insert unchanged `app/actions/reservations.ts:288`
- Occupancy `syncTableGroupStatus` still after enqueue `app/actions/reservations.ts:305`
- Completed inserts once; other statuses do not `tests/unit/marketing/review-email-queue.test.ts:114`

Reusable pattern: Enqueue in the status action after the status write succeeds, gated on `nextStatus === "completed"` only; log insert errors without failing the reservation transition; unit-test with a table-name-dispatch `from` mock that records `review_email_sends` inserts.

### C5 — PV-5 delay / completed_at

Suggested review order:
- PV-5 due helper: `completed_at` clock, invalid timestamp never due [booking] `lib/marketing/review-email.ts:23`
- Per-row skip when not due [booking] `lib/marketing/review-email.ts:102`
- Delay clamp 0–72 else 24 (not bound-clamp) `lib/marketing/review-email.ts:10`
- Injected `now` (tests) vs `new Date()` `lib/marketing/review-email.ts:53`
- Stamp `completed_at` on transition into `completed` [booking] `app/actions/reservations.ts:283`
- Embed selects `completed_at`, not `updated_at` `lib/marketing/review-email.ts:86`
- Delay cases (23/24h, 0, 72, NaN, 73, −1, `updated_at` bump) `tests/unit/marketing/review-email-send.test.ts:133`

Reusable pattern: Inject `now` into the send job; stamp `completed_at` on the status write; due = `now >= completed_at + delayHours` with `Number.isFinite` fail-closed; invalid delay (NaN, out of 0–72) defaults to 24 rather than bound-clamping.

### C6 — PV-6 at most one success

Suggested review order:
- Unsent-only scan [booking] `lib/marketing/review-email.ts:84`
- Per-row gates + skip without `reservation_id` [booking] `lib/marketing/review-email.ts:102`
- `mailer.send()` then CAS stamp [booking] `lib/marketing/review-email.ts:111`
- Stamp error log (no throw) `lib/marketing/review-email.ts:117`
- Failure retry / settings-edit no-resend `tests/unit/marketing/review-email-send.test.ts:224`

Reusable pattern: Stamp send success with `UPDATE … .eq(reservation_id).is("sent_at", null)` after `mailer.send()`; keep send-before-stamp so a thrown provider error stays retryable; never use `.eq(col, null)` for a NULL CAS.

### C7 — PV-7 recipient and body

Suggested review order:
- PV-7 HTML body builder [public-api] `lib/marketing/review-email.ts:44`
- Attribute/text escape (`&` first) [security] `lib/marketing/review-email.ts:34`
- `mailer.send({ to, html })` — guest email, no From/subject [security] `lib/marketing/review-email.ts:128`
- HTTPS gate still before any send [booking] `lib/marketing/review-email.ts:90`
- C7 assertions (to / copy / `href`, no Merci) `tests/unit/marketing/review-email-send.test.ts:285`

Reusable pattern: File-private `escapeHtml` (`&` first) into `{ to, html }` with copy + `<a href>`; do not add From/subject until the spec names them; C7 fixtures with no `&<>"'` still `toContain` copy and `href="url"`.

### C8 — PV-8 send must not mutate reservation

Suggested review order:
- PV-8 write invariant [booking] `lib/marketing/review-email.ts:62`
- Sole mutation: `review_email_sends.sent_at` CAS [booking] `lib/marketing/review-email.ts:133`
- Read-only reservation embed (email/status/`completed_at` only) `lib/marketing/review-email.ts:102`
- C8 pin: success + thrown mailer; status/`table_label`/occupancy [booking] `tests/unit/marketing/review-email-send.test.ts:334`

Reusable pattern: Integrity “MUST NOT mutate X” ACs: spy `.update` by table for both success and thrown-provider failure; keep the job’s only write on the satellite send row (`sent_at` CAS) — do not add reservation writes to satisfy the pin.

### C9 — PV-9 unauthenticated send job

Suggested review order:
- Fail-closed empty/unset secret before Bearer compare [security][auth] `app/api/cron/review-email/route.ts:5`
- Unauthenticated `Authorization` ≠ `Bearer ${secret}` → 401, `processDueReviewEmails` not called [security][public-api] `app/api/cron/review-email/route.ts:7`
- Authorized path still invokes `processDueReviewEmails` with the throwing stub (C9 pin is unauth-only) `app/api/cron/review-email/route.ts:11`
- Missing header + wrong Bearer cases `tests/unit/marketing/review-email-job-auth.test.ts:23`

Reusable pattern: Cron job GET: `if (!secret || authorization !== \`Bearer ${secret}\`)` 401 so an unset env never matches `Bearer undefined`; unit-test unauthenticated invocations must not call the processor.

### C10 — PV-9 anon cannot read guest email

Suggested review order:
- Dual nullable `email` DDL (CREATE + idempotent ALTER) [schema] `supabase/migrations/00000000000000_baseline.sql:99`
- Table privileges stay insert-only — no `GRANT SELECT` [security] `supabase/migrations/00000000000000_baseline.sql:134`
- Public SELECT policy dropped, not recreated [security] `supabase/migrations/00000000000000_baseline.sql:117`
- Anon `select("email")` list + `conf_code` filter → empty + permission error, payload has no guest email [security] `tests/integration/reservations/review-email-pii.integ.test.ts:47`

Reusable pattern: Nullable PII on an insert-only table: put the column on `CREATE TABLE` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` with an idempotency comment; do not add `GRANT SELECT`; prove with service-role insert + anon `select` 42501/PGRST301.

### C11 — PV-1 staff marketing page

Suggested review order:
- Staff route + chrome [auth]: `app/admin/marketing/page.tsx:12` (`force-dynamic`); `app/admin/marketing/page.tsx:14-21` (`getAuthUser` + `StaffShell`); `components/staff/staff-shell.tsx:60-65` (NAV `/admin/marketing`) [public-api]; `components/staff/staff-shell.tsx:83-88` (Setup filter)
- Enable persist [security]: `app/admin/marketing/review-email-settings-form.tsx:15-16` (default off); `app/admin/marketing/review-email-settings-form.tsx:51-58` (Switch + hidden `enabled`); `app/admin/marketing/review-email-settings-form.tsx:20-35` (FormData → `saveReviewEmailSettings`)
- Pending / copy-URL-delay fields: `app/admin/marketing/review-email-settings-form.tsx:16` (`useTransition`); `app/admin/marketing/review-email-settings-form.tsx:45-48`; `app/admin/marketing/review-email-settings-form.tsx:61-100`

Reusable pattern: Base UI Switch is a span (id/name do not give a reliable labeled checkbox); persist with controlled `checked` + hidden `name` (`"on"` vs `""`) and name the control with `aria-labelledby`, not `htmlFor`/`aria-label`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Guest email PII wall `[security]` `[schema]`

- Dual nullable `email` DDL — `supabase/migrations/00000000000000_baseline.sql:99` (CREATE) and `:104` (`ADD COLUMN IF NOT EXISTS`)
- Table privileges stay insert-only — no `GRANT SELECT` [security] `supabase/migrations/00000000000000_baseline.sql:134-136`
- Public SELECT policy dropped, not recreated [security] `supabase/migrations/00000000000000_baseline.sql:117`
- Anon `select("email")` list + `conf_code` filter → empty + permission error [security] `tests/integration/reservations/review-email-pii.integ.test.ts:47`

### 2. Unauthenticated send job `[security]` `[auth]`

- Fail-closed empty/unset `CRON_SECRET` before Bearer compare [security][auth] `app/api/cron/review-email/route.ts:5`
- Unauthenticated `Authorization` ≠ `Bearer ${secret}` → 401, processor not called [security][public-api] `app/api/cron/review-email/route.ts:7`
- Authorized path still uses the throwing mailer stub `app/api/cron/review-email/route.ts:11`
- Missing header + wrong Bearer `tests/unit/marketing/review-email-job-auth.test.ts:23`

### 3. Fail-closed send gates + integrity `[booking]`

- Settings gates then per-row email / still-`completed` [booking] `lib/marketing/review-email.ts:89-127`
- Shared HTTPS parse [security] `lib/marketing/https-url.ts`
- PV-5 `completed_at` clock + 0–72 else 24 [booking] `lib/marketing/review-email.ts:10` / `:23`
- Unsent scan, `mailer.send()` then `sent_at` CAS [booking] `lib/marketing/review-email.ts:102-137`
- PV-8 sole write is the send-row stamp [booking] `lib/marketing/review-email.ts:62`
- Escape then `{ to, html }` [security] `lib/marketing/review-email.ts:34` / `:128`
- Skip / delay / once / body / integrity pins `tests/unit/marketing/review-email-send.test.ts`

### 4. Queue only on `completed` `[booking]` `[auth]`

- Staff gate then status patch + `table_label` clear [auth][booking] `app/actions/reservations.ts` `transitionReservationStatus`
- Enqueue `review_email_sends` only when `nextStatus === "completed"` [booking]
- Occupancy sync still after enqueue
- `tests/unit/marketing/review-email-queue.test.ts:114`

### 5. Staff persist + enable gate `[auth]` `[public-api]`

- `requireStaffUser` then `{ error: "Unauthorized." }` [auth] `app/actions/marketing.ts:13`
- PV-10 enable requires trimmed copy + `isHttpsUrl` [public-api] `app/actions/marketing.ts:16`
- Singleton upsert `id: 1` `app/actions/marketing.ts:23-32`
- `tests/unit/marketing/review-email-settings.test.ts:40` / `:65`

### 6. Marketing page chrome `[auth]` `[public-api]`

- `/admin/marketing` RSC + `StaffShell` [auth] `app/admin/marketing/page.tsx:12-21`
- Setup nav href [public-api] `components/staff/staff-shell.tsx:60-65` / `:83-88`
- Switch + hidden `enabled` [security] `app/admin/marketing/review-email-settings-form.tsx:15-58`
- `tests/unit/marketing/marketing-page.test.ts:22`

## Traceability (final)

Run: 2026-08-30 · plan: post-visit_review_tdd_ac1962e1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | PV-2 | review-email-settings.test.ts::staff persist toggle copy maps URL and delay; unauthenticated writes return Unauthorized | app/actions/marketing.ts | P0 | shipped |
| C2 | PV-10 | review-email-settings.test.ts::enable requires non-blank copy and valid https Maps URL | app/actions/marketing.ts, lib/marketing/https-url.ts | P0 | shipped |
| C3 | PV-3 | review-email-send.test.ts::processDue does not call mailer for off, blank copy, invalid URL, missing email, or status not completed | lib/marketing/review-email.ts | P0 | shipped |
| C4 | PV-4 | review-email-queue.test.ts::only transition to completed enqueues; cancelled no_show confirmed seated do not | app/actions/reservations.ts | P0 | shipped |
| C5 | PV-5 | review-email-send.test.ts::send only after delay_hours from completed_at; 0 may send immediately; clamp 0-72 default 24 | lib/marketing/review-email.ts, app/actions/reservations.ts | P0 | shipped |
| C6 | PV-6 | review-email-send.test.ts::second successful send never happens; settings edit does not resend; failure allows retry | lib/marketing/review-email.ts | P0 | shipped |
| C7 | PV-7 | review-email-send.test.ts::mailer called with reservation guest email, saved copy, and Maps URL as a link | lib/marketing/review-email.ts | P0 | shipped |
| C8 | PV-8 | review-email-send.test.ts::success or failure does not change status, table_label, or occupancy fields | lib/marketing/review-email.ts | P0 | shipped |
| C9 | PV-9 | review-email-job-auth.test.ts::unauthenticated send-job invocation does not send | app/api/cron/review-email/route.ts | P0 | shipped |
| C10 | PV-9 | review-email-pii.integ.test.ts::anon cannot SELECT guest email on reservations | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C11 | PV-1 | marketing-page.test.ts::/admin/marketing exposes toggle copy Maps URL delay; staff nav links it | app/admin/marketing/page.tsx, app/admin/marketing/review-email-settings-form.tsx, components/staff/staff-shell.tsx | P1 | shipped |
| live-provider-delivery | PV-7 | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-08-28 → 2026-08-30 · plan: post-visit_review_tdd_ac1962e1
Criteria: 11 shipped · 1 manual-uat · 12 total
Phases delegated: 33
Back-loops: none
BLOCKED events: none
Issues: 2 filed · 0 attached-to-existing · 53 left on ledger (below floor/cap) — cap 3/run

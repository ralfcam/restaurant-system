# TDD log — res-45_review_email_schema_cron_7f3a91c2

## C1 — PV-11 settings persist columns

Suggested review order:
- Persist contract (PV-11 four keys + defaults) [schema]
  - `supabase/migrations/00000000000000_baseline.sql:720` — CREATE TABLE `review_email_*` (enabled false, delay 24)
  - `supabase/migrations/00000000000000_baseline.sql:721-724` — column types/nullability
- Idempotent second surface (older-table / `CREATE TABLE IF NOT EXISTS` no-op) [schema]
  - `supabase/migrations/00000000000000_baseline.sql:731-736` — `ALTER TABLE … ADD COLUMN IF NOT EXISTS` for the same four keys

Reusable pattern: Fold new persist columns into both CREATE TABLE and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on the table-owning baseline (same dual-surface as `slot_interval_minutes`), tagged with the Linear id — do not add a dated migration.

## C2 — PV-12 send-queue table + RLS

Suggested review order:
- Send-queue persist contract (PV-12 / PV-6 claim row) [schema]
  - `supabase/migrations/00000000000000_baseline.sql:138-143` — `review_email_sends` PK = `reservation_id` FK `reservations(id) ON DELETE CASCADE`; `sent_at TIMESTAMPTZ DEFAULT NULL`
- Service-role-only RLS (no public policies) [security]
  - `supabase/migrations/00000000000000_baseline.sql:145-152` — `ENABLE ROW LEVEL SECURITY`; `FOR ALL TO service_role` only
- Least-privilege grants [security]
  - `supabase/migrations/00000000000000_baseline.sql:154-157` — `GRANT ALL` to `service_role`; `REVOKE ALL` from `anon, authenticated`

Reusable pattern: New service-role-only queue table in baseline: `ENABLE RLS` + one `service_role FOR ALL` policy + `GRANT ALL TO service_role` (REAZED-297) + `REVOKE ALL FROM anon, authenticated` (not DML-only) + no public policies — no dated migration.

## C3 — PV-13 completed_at clock column

Suggested review order:
- Persist contract (PV-13 clock; not `updated_at`) [schema] [booking]
  - `supabase/migrations/00000000000000_baseline.sql:101` — CREATE comment: completion clock, not `updated_at`
  - `supabase/migrations/00000000000000_baseline.sql:102` — `completed_at TIMESTAMPTZ` nullable, no default
- Idempotent second surface (older-table / `CREATE TABLE IF NOT EXISTS` no-op) [schema]
  - `supabase/migrations/00000000000000_baseline.sql:108-110` — `ALTER TABLE … ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`

Reusable pattern: Fold a clock column into both `CREATE TABLE` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on the table-owning baseline as nullable `TIMESTAMPTZ`, and comment that `updated_at` is not a substitute — no dated migration.

## C4 — PV-14 cron mailer factory

Suggested review order:
- Factory fail-closed contract [security] [public-api]
  - `lib/marketing/review-email-mailer.ts:1` — `import "server-only"`
  - `lib/marketing/review-email-mailer.ts:3-11` — typed `{ send }`; BW-14 unconfigured throw
- Cron wiring after auth [auth] [public-api]
  - `app/api/cron/review-email/route.ts:5-10` — PV-9 empty secret / Bearer
  - `app/api/cron/review-email/route.ts:12-14` — `{ mailer: createReviewEmailMailer() }`; no inline throw

Reusable pattern: Cron mailer as a `server-only` factory that returns the BW-14 unconfigured `{ send }` thrower; the route imports it and passes `{ mailer: createReviewEmailMailer() }` so `route.ts` never contains the throw

## C5 — PV-15 hourly vercel cron

Suggested review order:
- Production timer contract [public-api]
  - `vercel.json:2-6` — `crons` entry `path` `/api/cron/review-email`, `schedule` `0 * * * *`
- Handler the timer hits [auth]
  - `app/api/cron/review-email/route.ts:5-10` — GET + fail-closed Bearer `CRON_SECRET` (unchanged this criterion)
  - `app/api/cron/review-email/route.ts:12-15` — authorized path calls `processDueReviewEmails`

Reusable pattern: Pin a Vercel Cron by `JSON.parse` of repo-root `vercel.json` and asserting `crons` contains the exact `{ path, schedule }` pair — a file-exists or schedule-only check lets a wrong path go green.

## Suggested Review Order (collated)

Highest-risk first.

- [security] service-role-only `review_email_sends` — `supabase/migrations/00000000000000_baseline.sql:145-157` (RLS + GRANT/REVOKE)
- [schema] settings persist columns — `supabase/migrations/00000000000000_baseline.sql:720-736`
- [schema] send-queue table — `supabase/migrations/00000000000000_baseline.sql:138-143`
- [schema] [booking] `completed_at` clock — `supabase/migrations/00000000000000_baseline.sql:101-110`
- [auth] [public-api] cron Bearer then factory — `app/api/cron/review-email/route.ts:5-14`
- [security] [public-api] mailer factory — `lib/marketing/review-email-mailer.ts:1-11`
- [public-api] hourly timer — `vercel.json:2-6`

## Traceability (final)

Run: 2026-09-09 · plan: res-45_review_email_schema_cron_7f3a91c2 · issue: RES-45

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | PV-11 | review-email-schema.integ.test.ts::service-role upsert of review_email settings columns persists and reads back | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C2 | PV-12 | review-email-schema.integ.test.ts::review_email_sends accepts a reservation_id insert and denies anon writes | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C3 | PV-13 | review-email-schema.integ.test.ts::reservations.completed_at persists a timestamptz on service-role update | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| C4 | PV-14 | review-email-cron-mailer.test.ts::authorized cron GET passes createReviewEmailMailer result into processDue | lib/marketing/review-email-mailer.ts, app/api/cron/review-email/route.ts | P1 | shipped |
| C5 | PV-15 | review-email-cron-schedule.test.ts::vercel.json schedules hourly GET /api/cron/review-email | vercel.json | P1 | shipped |
| live-inbox | implementation trace | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: res-45_review_email_schema_cron_7f3a91c2
Criteria: 5 shipped · 1 manual-uat · 6 total
Phases delegated: 15 (tdd-red/green/refactor × C1–C5)
Back-loops: none
BLOCKED events: 0 — CLI `supabase start` failed (Realtime init); standalone Postgres + PostgREST + `/rest/v1` proxy used instead (tests executed)
Issues: 0 filed · 0 attached · 12 left on ledger (below floor / Cloud no auto-confirm) — cap 3/run


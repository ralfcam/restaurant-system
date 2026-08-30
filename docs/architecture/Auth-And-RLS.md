# Auth & RLS

**Status:** Reference  
**Last updated:** 2026-08-30

## Auth flow

1. Staff signs in at `/auth/login` (Supabase Auth). Auth pages live under flat
   `app/auth/**` (not `app/[locale]/`); locale middleware skips `/auth/**` so routes
   like `/auth/login` are not rewritten into a missing `[locale]` path.
2. `middleware.ts` refreshes session via `lib/supabase/proxy.ts`, then applies
   next-intl routing only when `i18n/middleware-scope.ts` returns `localize`.
3. Protected routes: `/admin`, `/pos`, `/kds` (`lib/supabase/proxy.ts`)
   require JWT `app_metadata.role === "staff"` (`isStaffUser` in
   `lib/supabase/is-staff-user.ts`) — not a session alone and not
   `user_metadata`. Unauthenticated requests redirect to `/auth/login`.
   Authenticated non-staff redirect to `/`. Staff-claim sessions continue.

## Staff claim

Staff is `user.app_metadata.role === "staff"`. `requireStaffUser`
(`lib/supabase/require-staff.ts`) returns the user only for that claim; it
returns `null` when there is no session or the session is authenticated but not
staff. Privileged server actions already call it. `/auth/login` is sign-in
only (no `signUp`); after `signInWithPassword` it calls `isStaffUser(data.user)`
before `window.location.href = "/admin"`.

Local `supabase/config.toml` has `[auth] enable_signup = false` and
`[auth.email] enable_signup = false`. Those keys do not control hosted Auth —
see [../runbooks/deploy.md](../runbooks/deploy.md). Spec:
[../specs/staff-authorization.md](../specs/staff-authorization.md)
(SA-1–SA-6; SA-6 is manual-UAT).

## Service role

`lib/supabase/service.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.
Import only from `"use server"` modules — never from Client Components or `"use client"` files.

## RLS expectations

Every guest-facing table must have RLS **enabled** and **forced** where specs require it.

Schema is consolidated in `supabase/migrations/00000000000000_baseline.sql` (single
idempotent baseline; extend in place per `.cursor/rules/supabase-migrations.mdc`).
Tables with RLS today: `operating_windows`, `blocked_dates`, `reservations`,
`menu_items`, `restaurant_settings`. Public storage bucket `branding` holds the
optional custom logo (`logo.{png,jpg,svg,webp}`, max 2MB). No static logo files
ship in `public/`; fresh resets show the restaurant name only until staff upload. Baseline migrations
create the bucket and storage RLS; `uploadRestaurantLogo` (service role) can call
`storage.createBucket` when upload returns bucket-not-found, then retry. Reference
data (`operating_windows`, `menu_items`,
`restaurant_settings` singleton) loads from `supabase/seed.sql` on `db reset`.

`operating_windows` is SELECT-only for `anon` and `authenticated`
(`GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE`). Table privileges
`GRANT ALL ON TABLE operating_windows TO service_role`. There is no authenticated
`FOR ALL` policy (`DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows"`;
no `CREATE`). Public SELECT and `service_role` `FOR ALL` stay. Staff writes go
through `replace_operating_windows` (`service_role` `EXECUTE` only). Identical
GRANT/REVOKE, GRANT ALL, and DROP live in `00000000000000_baseline.sql` and
`20260825140000_operating_windows_privilege.sql` (apply on already-baselined
remotes per [../runbooks/deploy.md](../runbooks/deploy.md); do not `db push`).
Spec: [../specs/scheduling.md](../specs/scheduling.md) §16.

Early-baseline siblings `blocked_dates`, `reservations`, and `menu_items` also
`GRANT ALL ON TABLE <t> TO service_role` in those same two files (after each
table's service_role RLS block in baseline; before `NOTIFY pgrst` in the
forward). That does not drop their authenticated `FOR ALL` policies
(REAZED-299). Spec: [../specs/scheduling.md](../specs/scheduling.md) §17.

Catalog guests: `blocked_dates` and `menu_items` are SELECT-only for `anon`
and `authenticated` (`GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE`).
`reservations` is insert-only (`GRANT INSERT` / `REVOKE SELECT, UPDATE, DELETE`);
`DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`); public
INSERT policy stays. There is no `GRANT SELECT ON TABLE reservations`.
Nullable `reservations.email` is in baseline (CREATE TABLE column plus
`ALTER TABLE … ADD COLUMN IF NOT EXISTS`); RES-PRIV is unchanged. Spec:
[../specs/post-visit-review-email.md](../specs/post-visit-review-email.md) PV-9.
Identical RES-PRIV and PUBLIC-READ-PRIV strings live in
`00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`,
and `20260827160000_public_catalog_privileges.sql` (apply the dated file when
`20260825140000` is already recorded; do not `db push`). Spec:
[../specs/scheduling.md](../specs/scheduling.md) §18,
[../specs/booking-rules.md](../specs/booking-rules.md) AC-5,
[../specs/menu-availability.md](../specs/menu-availability.md) AC-2.

`validate_reservation_availability` (`enforce_booking_rules`) is
`SECURITY DEFINER` so that insert-only path can still cover-count and
table-fit `reservations` / `tables` for the occupancy window (booking-rules
BW-9) and compatible-table bookability (BW-12). Last-writer body is identical
in baseline, `20260818162000_operating_hour_segments.sql`,
`20260827180000_occupancy_duration_buffer.sql`, and
`20260828121224_table_fit_availability.sql`.

## Env vars

| Variable                        | Scope       |
| ------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only |
| `CRON_SECRET`                   | Server only |

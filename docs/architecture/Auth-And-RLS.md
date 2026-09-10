# Auth & RLS

**Status:** Reference  
**Last updated:** 2026-09-10

## Auth flow

1. Staff signs in at `/auth/login` (Supabase Auth). Auth pages live under flat
   `app/auth/**` (not `app/[locale]/`); locale middleware skips `/auth/**` so routes
   like `/auth/login` are not rewritten into a missing `[locale]` path.
2. Root `proxy.ts` (`export async function proxy`) refreshes session via
   `lib/supabase/proxy.ts`, then applies next-intl routing only when
   `i18n/middleware-scope.ts` returns `localize`.
3. Protected routes: `/admin`, `/pos`, `/kds` (`lib/supabase/proxy.ts`)
   require JWT `app_metadata.role` `"staff"` or `"super_admin"` (`isStaffUser`
   in `lib/supabase/is-staff-user.ts`) — not a session alone and not
   `user_metadata`. Unauthenticated requests redirect to `/auth/login`.
   Authenticated non-staff redirect to `/`. Staff-claim sessions continue
   (super-admin implies staff).

## Staff and super-admin claims

Staff is `user.app_metadata.role === "staff"` **or** super-admin.
`isSuperAdminUser` is true only when that role is the string `"super_admin"`.
`requireStaffUser` (`lib/supabase/require-staff.ts`) returns the user for
either staff claim; `requireSuperAdminUser` returns the user only for
super-admin (staff-only sessions get `null`). Both gates read
`app_metadata.role` only. Privileged mutations use one of those two guards;
booking-config **reads** stay on `requireStaffUser`. `/auth/login` is sign-in
only (no `signUp`); after `signInWithPassword` it calls `isStaffUser(data.user)`
before `window.location.href = "/admin"`.

Seed identities in `supabase/seed.sql` (every `db reset`, `--local` and
`--linked` non-prod): `admin@test.local` (`11111111-1111-1111-1111-111111111111`,
`"staff"`) and `superadmin@test.local`
(`22222222-2222-2222-2222-222222222222`, `"super_admin"`). Those login
addresses are also `auth.users.email` (not identities-only). Never seed
production.

Local `supabase/config.toml` has `[auth] enable_signup = false` and
`[auth.email] enable_signup = false`. Those keys do not control hosted Auth —
see [../runbooks/deploy.md](../runbooks/deploy.md). Spec:
[../specs/staff-authorization.md](../specs/staff-authorization.md)
(SA-1–SA-11; SA-6 is manual-UAT). Staff-only sessions still open `/admin` /
`/pos` / `/kds`; SA-10 disables (does not hide) super-admin-only chrome via
an `isSuperAdmin` prop from `isSuperAdminUser(authUser)`.

## Service role

`lib/supabase/service.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.
The module begins with `import "server-only"` (SA-11) so a Client Component
import fails at Next.js build time. A file-level `"use server"` directive or
warning comment is not a substitute. Factory URL selection, service-role
RLS-bypass behavior, and auth options are unchanged.

## RLS expectations

Every guest-facing table must have RLS **enabled** and **forced** where specs require it.

Schema is consolidated in `supabase/migrations/00000000000000_baseline.sql` (single
idempotent baseline; extend in place per `.cursor/rules/supabase-migrations.mdc`).
Tables with RLS today: `operating_windows`, `blocked_dates`, `reservations`,
`menu_items`, `restaurant_settings`, `tables`, `servers`, `orders`,
`order_items`, `review_email_sends`. `servers` mirrors
`tables` (`REVOKE ALL` from `PUBLIC`, `anon`, `authenticated`;
`GRANT ALL` to `service_role`; `-- REAZED-329` / RES-42). `servers`,
`table_merges`, `table_merge_members`, `status_events`, `orders`, and
`order_items` use the same private sibling recipe: `DROP POLICY IF EXISTS`
the authenticated `FOR ALL` (never `CREATE`), service-role `FOR ALL`,
`REVOKE ALL ON TABLE <t> FROM PUBLIC, anon, authenticated`, then
`GRANT ALL TO service_role` only. Sequence `orders_order_number_seq` is
`REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` then
`GRANT USAGE, SELECT` to `service_role` only (`USAGE` is `nextval`; do not
leave default sequence `UPDATE` on `service_role`). They are not added to
`supabase_realtime`; KDS polls. Spec:
[../specs/scheduling.md](../specs/scheduling.md) SIB-PRIV (§19),
[../specs/menu-availability.md](../specs/menu-availability.md) AC-5. Public storage bucket `branding` holds the
optional custom logo (`logo.{png,jpg,svg,webp}`, max 2MB). No static logo files
ship in `public/`; fresh resets show the restaurant name only until super-admin upload. Baseline migrations
create the bucket and storage RLS; `uploadRestaurantLogo` (service role) can call
`storage.createBucket` when upload returns bucket-not-found, then retry. Reference
data (`operating_windows`, `menu_items`,
`restaurant_settings` singleton, `servers`) loads from `supabase/seed.sql` on `db reset`.

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

`restaurant_settings` is SELECT-only for `anon` and `authenticated`
(`GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE`). Table privileges
`GRANT ALL ON TABLE restaurant_settings TO service_role`. There is no authenticated
`FOR ALL` policy (`DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"`;
no `CREATE`). Public SELECT and `service_role` `FOR ALL` stay. Staff settings
writes include `setChefsPicksEnabled` via the service role after the SA-8 staff
gate. Identical GRANT/REVOKE, GRANT ALL, and DROP live in
`00000000000000_baseline.sql`,
`20260818155638_restaurant_branding_cms.sql`,
`20260825140000_operating_windows_privilege.sql`, and
`20260902214500_restaurant_settings_privilege.sql` (apply the dated file when
`20260825140000` is already recorded per [../runbooks/deploy.md](../runbooks/deploy.md);
do not `db push`). Spec: [../specs/branding-cms.md](../specs/branding-cms.md) BC-1.

Early-baseline siblings `blocked_dates`, `reservations`, and `menu_items` also
`GRANT ALL ON TABLE <t> TO service_role` in `00000000000000_baseline.sql` and
`20260825140000_operating_windows_privilege.sql` (after each table's
service_role RLS block in baseline; before `NOTIFY pgrst` in the forward).
Those two files are the defining surfaces. On an already-baselined forked
remote, apply `20260825140000_operating_windows_privilege.sql` when that
version is unrecorded; if `20260825140000` is already recorded, apply
`20260827160000_public_catalog_privileges.sql` for catalog privilege changes
instead of replaying the applied file (do not `db push`). Authenticated
`FOR ALL` on those tables is dropped (no `CREATE`) — SIB-PRIV / RES-PRIV /
menu AC-2. Spec:
[../specs/scheduling.md](../specs/scheduling.md) §17, §19.

Staff list and mutation for those siblings (including `getReservations`,
`getAllMenuItems`, and menu CRUD/toggle) is `requireStaffUser` plus
`createServiceClient` (`lib/supabase/service.ts`). The cookie JWT client
(`lib/supabase/server.ts`) is not used on those paths. Guest catalog reads
stay on the anon client (`lib/supabase/client-server.ts`). Spec:
[../specs/booking-rules.md](../specs/booking-rules.md) AC-5,
[../specs/menu-availability.md](../specs/menu-availability.md) AC-2.

Catalog guests: `blocked_dates` and `menu_items` are SELECT-only for `anon`
and `authenticated` (`REVOKE ALL ON TABLE <t> FROM PUBLIC, anon, authenticated`
then `GRANT SELECT` only).
`reservations` is insert-only (`REVOKE ALL` then
`GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code)`);
guest INSERT is not table-wide. Server-owned `id`, `status`, `table_label`,
`created_at`, and `completed_at` have no guest INSERT privilege.
`DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`); public
INSERT policy stays. There is no `GRANT SELECT ON TABLE reservations`.
There is no authenticated `FOR ALL` (or other write) policy on those three
tables.
Nullable `reservations.email` and `reservations.completed_at` are in baseline
(CREATE TABLE column plus `ALTER TABLE … ADD COLUMN IF NOT EXISTS`); RES-PRIV
is unchanged. `review_email_sends` is service-role-only (`ENABLE RLS`,
`service_role` `FOR ALL`, `GRANT ALL`, `REVOKE ALL` from `anon`/`authenticated`).
Spec: [../specs/post-visit-review-email.md](../specs/post-visit-review-email.md)
PV-9, PV-12, PV-13.
Identical RES-PRIV and PUBLIC-READ-PRIV strings live in
`00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`,
and `20260827160000_public_catalog_privileges.sql` (on an already-baselined
forked remote, apply `20260825140000_operating_windows_privilege.sql` when
that version is absent; if `20260825140000` is already recorded, apply
`20260827160000_public_catalog_privileges.sql` for catalog privilege changes
instead of replaying the applied file; do not `db push`). Spec:
[../specs/scheduling.md](../specs/scheduling.md) §18,
[../specs/booking-rules.md](../specs/booking-rules.md) AC-5,
[../specs/menu-availability.md](../specs/menu-availability.md) AC-2.

`validate_reservation_availability` (`enforce_booking_rules`) is
`SECURITY DEFINER` so that insert-only path can still cover-count and
table-fit `reservations` / `tables` for the occupancy window (booking-rules
BW-9) and compatible-table bookability (BW-12). It is trigger-only, not a
guest RPC: every migration that `CREATE OR REPLACE`s the function immediately
follows the body with `REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM PUBLIC`
and `REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM anon, authenticated`
(`CREATE OR REPLACE` preserves an already-open ACL). Spec:
[../specs/booking-rules.md](../specs/booking-rules.md) RES-TRIGGER-EXEC.
Last-writer body is identical in baseline,
`20260818162000_operating_hour_segments.sql`,
`20260827180000_occupancy_duration_buffer.sql`, and
`20260828121224_table_fit_availability.sql`.

## Env vars

| Variable                        | Scope       |
| ------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only |
| `CRON_SECRET`                   | Server only |

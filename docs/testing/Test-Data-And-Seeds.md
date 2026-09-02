# Test data & seeds

**Status:** Draft  
**Last updated:** 2026-09-02

## Current state

- **Schema:** `supabase/migrations/00000000000000_baseline.sql` — idempotent DDL for
  `operating_windows`, `blocked_dates`, `reservations` (nullable `email` via
  CREATE TABLE column plus `ALTER TABLE … ADD COLUMN IF NOT EXISTS`; RES-PRIV
  insert-only, no `GRANT SELECT`), `menu_items`,
  `restaurant_settings`, public `branding` storage bucket, and booking
  trigger `enforce_booking_rules`. `restaurant_settings.review_email_*`,
  `review_email_sends`, and `reservations.completed_at` are **not** in schema
  yet. Linked/remote also has
  `20260818155638_restaurant_branding_cms.sql` (same objects, forward-only)
  and `20260818162000_operating_hour_segments.sql` (`replace_operating_windows`;
  version recorded on `tilcqrudqxznnpepxjqq` — not a full `db push`), plus
  `20260825140000_operating_windows_privilege.sql` (OH-PRIV SELECT-only on
  `operating_windows` plus `GRANT ALL` for `operating_windows`, `blocked_dates`,
  `reservations`, `menu_items`; RES-PRIV insert-only on `reservations`;
  PUBLIC-READ-PRIV `GRANT SELECT` / `REVOKE` DML on `blocked_dates` and
  `menu_items`; apply on already-baselined remotes — not a full `db push`), and
  `20260827160000_public_catalog_privileges.sql` (same RES-PRIV / PUBLIC-READ-PRIV
  strings when `20260825140000` is already recorded), plus
  `20260827180000_occupancy_duration_buffer.sql` (occupancy duration + safety
  buffer columns and last-writer `validate_reservation_availability`; apply on
  already-baselined remotes — not a full `db push`), plus
  `20260828121224_table_fit_availability.sql` (last-writer table-fit +
  date-scoped `pg_advisory_xact_lock`; apply on already-baselined remotes that
  already recorded occupancy — not a full `db push`).
- **Seed:** `supabase/seed.sql` — reference data loaded after migrations when
  `[db.seed] enabled = true` in `supabase/config.toml`:
  - `auth.users` + `auth.identities` — 2 test accounts (see Personas below)
  - `restaurant_settings` — 1 singleton row (`id = 1`, no custom logo)
  - `operating_windows` — 7 rows (Mon–Sat 09:00–22:00, Sunday closed)
  - `menu_items` — 120 rows (sample `lib/menu-catalog.json` catalog)
- **Branding bucket runtime:** Migrations define the public `branding` bucket and
  storage policies. If storage still reports bucket-not-found on first logo upload,
  `uploadRestaurantLogo` creates the bucket (public, 2MB, allowed image MIME types)
  via the service role and retries — see BC-9 in
  [../specs/branding-cms.md](../specs/branding-cms.md).
- **Unit tests:** `tests/unit/branding/` — upload/remove actions (including missing-bucket
  retry), MIME alias validation, and a `next.config.mjs` `bodySizeLimit` schema guard.
  `tests/unit/marketing/` — review-email settings persist, send gates, queue-on-complete,
  cron job auth, marketing page. `tests/unit/auth/` — staff and super-admin claim gates
  plus seed `raw_app_meta_data` pins.
- **Mocks:** `lib/data.ts` still holds MVP fixtures for tables, reservations UI
  samples, and POS/KDS tickets not yet persisted in Postgres.

## Personas (stable IDs)

| Persona     | Email                   | Password      | User ID                                | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ----------------------- | ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Staff admin | `admin@test.local`      | `password123` | `11111111-1111-1111-1111-111111111111` | Local and linked non-prod (`db reset --local` and `--linked`). Signs in at `/auth/login`. JWT `raw_app_meta_data.role` is `"staff"` (not `raw_user_meta_data`, not `auth.users.role`). Staff routes `/admin`, `/pos`, `/kds` require `"staff"` or `"super_admin"`. Email lives on `auth.identities`, not `auth.users.email`. Email pre-confirmed. Never seed production. |
| Super-admin | `superadmin@test.local` | `password123` | `22222222-2222-2222-2222-222222222222` | Same reset scope as staff. Distinct id. JWT `raw_app_meta_data.role` is `"super_admin"` (not GoTrue `is_super_admin`). Login email on `auth.identities`. `ON CONFLICT DO NOTHING`. Never seed production.                                                                                                                                                                |

When integration tests need more stable IDs, document additional personas here as
suites grow.

## Local reset

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --fail-on error
```

## Linked remote reset

Non-production linked project (`supabase-green-tree`, ref `tilcqrudqxznnpepxjqq`):

```powershell
npx supabase db reset --linked --yes
npx supabase db lint --linked --fail-on error
```

Schema-only: append `--no-seed`. See [../runbooks/deploy.md](../runbooks/deploy.md).

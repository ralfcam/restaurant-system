# Test data & seeds

**Status:** Draft  
**Last updated:** 2026-08-18

## Current state

- **Schema:** `supabase/migrations/00000000000000_baseline.sql` — idempotent DDL for
  `operating_windows`, `blocked_dates`, `reservations`, `menu_items`,
  `restaurant_settings`, public `branding` storage bucket, and booking
  trigger `enforce_booking_rules`. Linked/remote also has
  `20260818155638_restaurant_branding_cms.sql` (same objects, forward-only).
- **Seed:** `supabase/seed.sql` — reference data loaded after migrations when
  `[db.seed] enabled = true` in `supabase/config.toml`:
  - `auth.users` + `auth.identities` — 1 staff test account (see Personas below)
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
- **Mocks:** `lib/data.ts` still holds MVP fixtures for tables, reservations UI
  samples, and POS/KDS tickets not yet persisted in Postgres.

## Personas (stable IDs)

| Persona | Email | Password | User ID | Notes |
| --- | --- | --- | --- | --- |
| Staff admin | `admin@test.local` | `password123` | `11111111-1111-1111-1111-111111111111` | **Local dev only.** Signs in at `/auth/login`; grants `/admin`, `/pos`, `/kds` (staff routes authorize any authenticated user). Email pre-confirmed. Never seed against production. |

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

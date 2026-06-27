# Test data & seeds

**Status:** Draft  
**Last updated:** 2026-06-27

## Current state

- **Schema:** `supabase/migrations/00000000000000_baseline.sql` — idempotent DDL for
  `operating_windows`, `blocked_dates`, `reservations`, `menu_items`, and booking
  trigger `enforce_booking_rules`.
- **Seed:** `supabase/seed.sql` — reference data loaded after migrations when
  `[db.seed] enabled = true` in `supabase/config.toml`:
  - `auth.users` + `auth.identities` — 1 staff test account (see Personas below)
  - `operating_windows` — 7 rows (Mon–Sat 09:00–22:00, Sunday closed)
  - `menu_items` — 120 rows (äkta menu catalog)
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

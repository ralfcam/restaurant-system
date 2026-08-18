# Auth & RLS

**Status:** Reference  
**Last updated:** 2026-08-18

## Auth flow

1. Staff signs in at `/auth/login` (Supabase Auth). Auth pages live under flat
   `app/auth/**` (not `app/[locale]/`); locale middleware skips `/auth/**` so routes
   like `/auth/login` are not rewritten into a missing `[locale]` path.
2. `middleware.ts` refreshes session via `lib/supabase/proxy.ts`, then applies
   next-intl routing only when `i18n/middleware-scope.ts` returns `localize`.
3. Protected routes: `/admin`, `/pos`, `/kds` require `user` from `getUser()`.

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

## Env vars

| Variable | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |

# Auth & RLS

**Status:** Reference  
**Last updated:** 2026-06-27

## Auth flow

1. Staff signs in at `/auth/login` (Supabase Auth).
2. `middleware.ts` refreshes session via `lib/supabase/proxy.ts`.
3. Protected routes: `/admin`, `/pos`, `/kds` require `user` from `getUser()`.

## Service role

`lib/supabase/service.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.
Import only from `"use server"` modules — never from Client Components or `"use client"` files.

## RLS expectations

Every guest-facing table must have RLS **enabled** and **forced** where specs require it.

Schema is consolidated in `supabase/migrations/00000000000000_baseline.sql` (single
idempotent baseline; extend in place per `.cursor/rules/supabase-migrations.mdc`).
Tables with RLS today: `operating_windows`, `blocked_dates`, `reservations`, `menu_items`.
Reference data (`operating_windows`, `menu_items` rows) loads from `supabase/seed.sql`
on `db reset`.

## Env vars

| Variable | Scope |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |

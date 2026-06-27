# Platform overview

**Status:** Reference  
**Last updated:** 2026-06-27

## Stack

- **App:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui
- **Data:** Supabase (Postgres, Auth, RLS) via `@supabase/ssr` and `@supabase/supabase-js`
- **Deploy:** Vercel ([GitHub](https://github.com/ralfcam/restaurant-system))
- **Tracking:** Linear — [restaurant-system](https://linear.app/realized/project/restaurant-system-a19062c2799e) (`REAZED-###`)

## Route map

| Path | Audience | Purpose |
| --- | --- | --- |
| `/`, `/menu` | Guest | Marketing home and menu (default locale **fr**, unprefixed) |
| `/en`, `/en/menu` | Guest | English public site (`localePrefix: as-needed`) |
| `/auth/login`, `/auth/callback`, `/auth/error` | Staff | Supabase auth (flat routes; no locale segment) |
| `/admin/*` | Staff | Menu, reservations, scheduling, floor (English-only; no locale segment) |
| `/pos` | Staff | Point of sale |
| `/kds` | Staff | Kitchen display |

## Localization

Public guest routes live under `app/[locale]/` with **next-intl** (`i18n/routing.ts`,
`messages/fr.json`, `messages/en.json`). Default locale is **fr**; English uses an
`/en` prefix. A navbar `LanguageSwitcher` replaces the old in-menu EN/FR toggle.
Spec: [../specs/site-localization.md](../specs/site-localization.md).

## Middleware

`middleware.ts` always runs Supabase `updateSession`, then applies next-intl locale
routing for public paths. `/admin/**`, `/auth/**`, and `/api/**` skip locale middleware
(`i18n/middleware-scope.ts`). Staff paths
(`/admin`, `/pos`, `/kds`) redirect unauthenticated users to `/auth/login`.

## Server actions

| Module | Path |
| --- | --- |
| Auth | `app/actions/auth.ts` |
| Menu | `app/actions/menu.ts` |
| Reservations | `app/actions/reservations.ts` |
| Availability | `app/actions/availability.ts` |

## Supabase clients

| Client | Path | Use |
| --- | --- | --- |
| Browser | `lib/supabase/client.ts` | Client components |
| Server (cookie) | `lib/supabase/server.ts` | Server Components / actions |
| Service role | `lib/supabase/service.ts` | Admin-only; **never** client boundary |

## Database

Linked project: `supabase-green-tree` (ref `tilcqrudqxznnpepxjqq`). Schema in a single
idempotent baseline (`supabase/migrations/00000000000000_baseline.sql`); reference data
in `supabase/seed.sql`. Reset and lint commands: [../runbooks/deploy.md](../runbooks/deploy.md).
RLS detail: [Auth-And-RLS.md](./Auth-And-RLS.md).

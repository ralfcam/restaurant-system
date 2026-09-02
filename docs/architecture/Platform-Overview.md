# Platform overview

**Status:** Reference  
**Last updated:** 2026-09-01

## Stack

- **App:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui
- **Data:** Supabase (Postgres, Auth, RLS) via `@supabase/ssr` and `@supabase/supabase-js`
- **Deploy:** Vercel ([dashboard](https://vercel.com/ralfcams-projects/restaurant-system), [GitHub](https://github.com/ralfcam/restaurant-system))
- **Tracking:** Linear — [restaurant-system](https://linear.app/realized/project/restaurant-system-a19062c2799e) (`REAZED-###`)

## Restaurant identity

Bootstrapping template (**Restaurant Link**): name, tagline, and contact
fixtures live in `lib/data.ts`. Sample menu catalog: `lib/menu-catalog.json`
(`lib/menu-catalog.ts`). There is **no bundled logo** in `public/` — guest
header, login, and staff chrome show the restaurant name only until staff
upload a mark (`BrandMark` + branding CMS). `lib/site-chrome.ts` exports
`SITE_LOGO` dimensions/alt only (no `src`). Spec:
[../specs/site-chrome.md](../specs/site-chrome.md),
[../specs/branding-cms.md](../specs/branding-cms.md).

## Route map

| Path                                           | Audience | Purpose                                                                                      |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `/`, `/menu`                                   | Guest    | Marketing home and menu (default locale **fr**, unprefixed)                                  |
| `/en`, `/en/menu`                              | Guest    | English public site (`localePrefix: as-needed`)                                              |
| `/auth/login`, `/auth/callback`, `/auth/error` | Staff    | Supabase auth (flat routes; no locale segment)                                               |
| `/admin/*`                                     | Staff    | Menu, reservations, scheduling, floor, branding, marketing (English-only; no locale segment) |
| `/api/cron/review-email`                       | Cron     | Bearer `CRON_SECRET` GET; throwing mailer stub; no `vercel.json` schedule                    |
| `/pos`                                         | Staff    | Point of sale                                                                                |
| `/kds`                                         | Staff    | Kitchen display                                                                              |

## Localization

Public guest routes live under `app/[locale]/` with **next-intl** (`i18n/routing.ts`,
`messages/fr.json`, `messages/en.json`). Default locale is **fr**; English uses an
`/en` prefix. A navbar `LanguageSwitcher` replaces the old in-menu EN/FR toggle.
Spec: [../specs/site-localization.md](../specs/site-localization.md).

## Middleware

`middleware.ts` always runs Supabase `updateSession`, then applies next-intl locale
routing for public paths. `/admin/**`, `/pos/**`, `/kds/**`, `/auth/**`, and `/api/**` skip locale middleware
(`i18n/middleware-scope.ts`). Staff paths
(`/admin`, `/pos`, `/kds`) require JWT `app_metadata.role === "staff"`:
unauthenticated → `/auth/login`, authenticated non-staff → `/`. Spec:
[../specs/staff-authorization.md](../specs/staff-authorization.md).

## Server actions

| Module       | Path                          |
| ------------ | ----------------------------- |
| Auth         | `app/actions/auth.ts`         |
| Menu         | `app/actions/menu.ts`         |
| Reservations | `app/actions/reservations.ts` |
| Availability | `app/actions/availability.ts` |
| Branding     | `app/actions/branding.ts`     |
| Marketing    | `app/actions/marketing.ts`    |

Custom logo uploads use base64 on a Server Action (not multipart). `next.config.mjs` sets
`experimental.serverActions.bodySizeLimit` to `4mb` (`LOGO_UPLOAD_BODY_SIZE_LIMIT` in
`lib/branding.ts`) so a file at the 2MB validation cap still fits after encoding.
If storage reports the public `branding` bucket missing, the action creates it and
retries. Spec: [../specs/branding-cms.md](../specs/branding-cms.md) (BC-8, BC-9).

## Supabase clients

| Client          | Path                      | Use                                   |
| --------------- | ------------------------- | ------------------------------------- |
| Browser         | `lib/supabase/client.ts`  | Client components                     |
| Server (cookie) | `lib/supabase/server.ts`  | Server Components / actions           |
| Service role    | `lib/supabase/service.ts` | Admin-only; **never** client boundary |

## Database

Linked project: `supabase-green-tree` (ref `tilcqrudqxznnpepxjqq`,
https://tilcqrudqxznnpepxjqq.supabase.co). Local schema is the idempotent
baseline (`supabase/migrations/00000000000000_baseline.sql`) plus dated
forwards; reference data in `supabase/seed.sql`. Repo SQL is not the deployed
PostgREST cache: remotes that already applied baseline must apply
`20260818162000_operating_hour_segments.sql` so `replace_operating_windows`
is visible (OH-SAVE). That file is recorded on this project as
`20260818162000` / `operating_hour_segments` — not a full `db push`; remote
history is still forked. Apply/reset: [../runbooks/deploy.md](../runbooks/deploy.md).
RLS detail: [Auth-And-RLS.md](./Auth-And-RLS.md). Spec:
[../specs/scheduling.md](../specs/scheduling.md) (§15).

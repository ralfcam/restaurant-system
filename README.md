# restaurant-system

**Restaurant Link** is a bootstrapping restaurant-operations template: guest
menu and online reservations, staff admin (menu, reservations, scheduling,
floor, branding), plus in-service POS and KDS. Name, copy, and menu catalog
live in `lib/data.ts` / `lib/menu-catalog.json` for a new venue.

There is **no production deployment** and no live users yet. MVP does not
include payments, multi-location, or guest accounts beyond reservation lookup.
Product scope: [docs/PRD/restaurant-system-PRD.md](docs/PRD/restaurant-system-PRD.md).

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui, Supabase
(Postgres, Auth, RLS), Vercel, pnpm.

Repo: [ralfcam/restaurant-system](https://github.com/ralfcam/restaurant-system).
Tracking: Linear [restaurant-system](https://linear.app/realized/project/restaurant-system-a19062c2799e)
(`REAZED-###`). Detail: [docs/architecture/Platform-Overview.md](docs/architecture/Platform-Overview.md).

## Getting started

```powershell
pnpm install
npx supabase start
npx supabase db reset --local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Default locale is **fr**
(unprefixed); English is at `/en`.

Set these in the shell (or `.env.local` for `pnpm dev`). Local keys come from
`npx supabase status`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never expose the service role key to the client bundle. Production env and
remote schema: [docs/runbooks/deploy.md](docs/runbooks/deploy.md).

## Routes

| Path                                           | Audience | Purpose                                         |
| ---------------------------------------------- | -------- | ----------------------------------------------- |
| `/`, `/menu`                                   | Guest    | Marketing home and menu (default locale **fr**) |
| `/en`, `/en/menu`                              | Guest    | English public site                             |
| `/auth/login`, `/auth/callback`, `/auth/error` | Staff    | Supabase auth                                   |
| `/admin/*`                                     | Staff    | Menu, reservations, scheduling, floor, branding |
| `/pos`                                         | Staff    | Point of sale                                   |
| `/kds`                                         | Staff    | Kitchen display                                 |

Middleware, server actions, and Supabase clients:
[docs/architecture/Platform-Overview.md](docs/architecture/Platform-Overview.md).

## Tests and gates

```powershell
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm format:check
```

Integration tests need local Supabase **and** the env vars above exported in
the shell — Vitest does not load `.env.local`. Strict mode:

```powershell
$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration
```

Pyramid, skip-vs-strict, and E2E:
[docs/testing/Pyramid-Overview.md](docs/testing/Pyramid-Overview.md),
[docs/testing/Vitest-Integration-Guide.md](docs/testing/Vitest-Integration-Guide.md).

## Documentation

Start at [docs/README.md](docs/README.md). Acceptance criteria live in
[docs/specs/](docs/specs/) (`docs/specs/` is the sole acceptance authority).

## Deploy

Merges to `main` deploy on the git-linked Vercel project
[ralfcams-projects/restaurant-system](https://vercel.com/ralfcams-projects/restaurant-system)
(`prj_wFVDqQOtf6cjuUXscIoHDbtHzTTz`). Production alias:
[restaurant-system-ralfcams-projects.vercel.app](https://restaurant-system-ralfcams-projects.vercel.app).
Runbook: [docs/runbooks/deploy.md](docs/runbooks/deploy.md).

Historical v0 chat project (not the hosting target):
[prj_Be4qMWXY4RzLyIZOq2jgTicLj4CO](https://v0.app/chat/projects/prj_Be4qMWXY4RzLyIZOq2jgTicLj4CO).

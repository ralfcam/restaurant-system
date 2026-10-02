# E2E Playwright guide

**Status:** Reference  
**Last updated:** 2026-10-01

## Layout

- Config: `playwright.config.ts` (`globalSetup: "./playwright.global-setup.ts"`)
- Tests: `tests/e2e/**/*.spec.ts`
- Localization: `tests/e2e/localization.spec.ts` (AC-11 Staff/Book CTAs use
  `getByRole("button")`; login shows a French heading and `html lang` `fr`)
- Floor drag (FP-9): `tests/e2e/floor/floor-drag.spec.ts` (mouse follow, snap,
  persist). Staff login helper: `tests/e2e/helpers/staff-login.ts`. iPhone
  touch drag (M-1) stays manual-UAT.
- Guest profile overlay (GP-13): `tests/e2e/admin/guest-profile-overlay.spec.ts`.
  Run with `CI=true` so the Playwright `webServer` inherits the local Supabase env.
  GP-16: that run fails closed on a hosted `NEXT_PUBLIC_SUPABASE_URL` via
  Playwright `globalSetup`. `playwright.global-setup.ts` calls
  `loadEnvConfig(process.cwd())`, then zero-arg
  `assertPlaywrightSupabaseUrlIsLocalOrUnset()`. Omitted or empty URL
  returns; any other host goes to `assertIsolatedHoursMutationTarget`
  before `guest-profile-overlay.spec.ts` inserts reservations.

## Running

Start the app, then:

```powershell
pnpm dev
pnpm test:e2e
```

Override base URL: `$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'`.

Placeholder specs may be `test.skip` until flows are implemented.

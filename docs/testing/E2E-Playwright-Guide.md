# E2E Playwright guide

**Status:** Reference  
**Last updated:** 2026-09-24

## Layout

- Config: `playwright.config.ts`
- Tests: `tests/e2e/**/*.spec.ts`
- Localization: `tests/e2e/localization.spec.ts` (AC-11 Staff/Book CTAs use
  `getByRole("button")`; login shows a French heading and `html lang` `fr`)
- Floor drag (FP-9): `tests/e2e/floor/floor-drag.spec.ts` (mouse follow, snap,
  persist). Staff login helper: `tests/e2e/helpers/staff-login.ts`. iPhone
  touch drag (M-1) stays manual-UAT.

## Running

Start the app, then:

```powershell
pnpm dev
pnpm test:e2e
```

Override base URL: `$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'`.

Placeholder specs may be `test.skip` until flows are implemented.

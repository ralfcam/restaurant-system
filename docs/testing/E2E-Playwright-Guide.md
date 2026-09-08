# E2E Playwright guide

**Status:** Reference  
**Last updated:** 2026-09-08

## Layout

- Config: `playwright.config.ts`
- Tests: `tests/e2e/**/*.spec.ts`
- Localization: `tests/e2e/localization.spec.ts` (AC-11 Staff/Book CTAs use
  `getByRole("button")`)

## Running

Start the app, then:

```powershell
pnpm dev
pnpm test:e2e
```

Override base URL: `$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'`.

Placeholder specs may be `test.skip` until flows are implemented.

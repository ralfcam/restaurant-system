# Vitest unit guide

**Status:** Reference  
**Last updated:** 2026-09-02

## Layout

- Config: `vitest.unit.config.ts`
- Setup: `tests/unit/setup.ts`
- Tests: `tests/unit/**/*.test.ts`
- Branding logo upload: `tests/unit/branding/` (actions, validation, `next.config.mjs`
  bodySizeLimit schema guard)
- Post-visit review email: `tests/unit/marketing/` (settings persist, send gates,
  queue-on-complete, cron job auth, marketing page)
- Staff authorization: `tests/unit/auth/` (`requireStaffUser` /
  `requireSuperAdminUser` claims, staff-route proxy, login landing gate,
  local signup TOML, seed `raw_app_meta_data` for staff and super-admin)
- Site chrome / template identity: `tests/unit/site-chrome.test.ts` (no bundled
  `SITE_LOGO.src`, Restaurant Link name, `menu-catalog` rename guard, SC-4a
  `shouldUseLightNavText`); `tests/unit/site-header.test.ts`; homepage HP-1
  `tests/unit/site/homepage-layout.test.ts`
- Super-admin chrome (SA-10): `tests/unit/branding/super-admin-chrome.test.ts`,
  `tests/unit/scheduling/super-admin-chrome.test.ts`,
  `tests/unit/floor/super-admin-chrome.test.ts`,
  `tests/unit/marketing/super-admin-chrome.test.ts`
- POS live pickers: `tests/unit/floor/pos-table-picker.test.ts`,
  `tests/unit/floor/pos-server-picker.test.ts`,
  `tests/unit/floor/get-servers.test.ts`

## Conventions

- Mock Supabase at `@/lib/supabase/*` boundaries — no real network or Postgres.
- DOM tests: add `// @vitest-environment happy-dom` at the top of the file.
- One behavior per test; name tests after the criterion they prove.
- Assert one exact HTTP status or error shape per scenario.

## Running

```powershell
pnpm test:unit
pnpm test:unit tests/unit/smoke.test.ts
```

Promoted recipes belong in [Design-And-Patterns.md](./Design-And-Patterns.md).

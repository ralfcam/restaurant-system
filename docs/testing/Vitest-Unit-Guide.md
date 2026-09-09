# Vitest unit guide

**Status:** Reference  
**Last updated:** 2026-09-09

## Layout

- Config: `vitest.unit.config.ts`
- Setup: `tests/unit/setup.ts`
- Tests: `tests/unit/**/*.test.ts`
- Branding logo upload: `tests/unit/branding/` (actions, validation, `next.config.mjs`
  bodySizeLimit schema guard)
- Post-visit review email: `tests/unit/marketing/` (settings persist, send gates,
  queue-on-complete, cron job auth, cron mailer factory, Supabase hourly
  Edge Function pin, marketing page, PV-ISO schema isolation scan)
- Staff authorization: `tests/unit/auth/` (`requireStaffUser` /
  `requireSuperAdminUser` claims, staff-route proxy, login landing gate,
  local signup TOML, seed `raw_app_meta_data` for staff and super-admin)
- Site chrome / template identity: `tests/unit/site-chrome.test.ts` (no bundled
  `SITE_LOGO.src`, Restaurant Link name, `menu-catalog` rename guard, SC-4a
  `shouldUseLightNavText`); `tests/unit/site-header.test.ts` (SiteHeader JSX
  in `components/site/home-page-client.tsx`); homepage HP-1/HP-3
  `tests/unit/site/homepage-layout.test.ts`; HP-2
  `tests/unit/site/home-page-chefs-picks-ssr.test.ts`
- Guest i18n: `tests/unit/i18n/` (header locale nav, catalog chrome,
  `isActiveNavPath`, `resolveDocumentLang`, `DocumentLangSync` layout mount,
  sheet switcher, middleware-scope cookie-option merge and segment-bounded
  locale skip)
- Super-admin chrome (SA-10): `tests/unit/branding/super-admin-chrome.test.ts`,
  `tests/unit/scheduling/super-admin-chrome.test.ts`,
  `tests/unit/floor/super-admin-chrome.test.ts`,
  `tests/unit/marketing/super-admin-chrome.test.ts`
- Dev toolchain: `tests/unit/dev-toolchain/` (G-T1/G-L1/G-F1/G-W1/G-P1/G-O1,
  including `pnpm-overrides-toolchain.test.ts`)
- POS live pickers: `tests/unit/floor/pos-table-picker.test.ts`,
  `tests/unit/floor/pos-server-picker.test.ts`,
  `tests/unit/floor/get-servers.test.ts`,
  `tests/unit/floor/pos-menu-availability.test.ts`
- Reservation isolation (RES-ISO):
  `tests/unit/reservations/reservation-integ-isolation.test.ts` (AST
  glob-scan of `tests/integration/reservations/*.integ.test.ts`; zero-arg
  call; rejects an explicit-URL helper argument)
- Review-email isolation (PV-ISO):
  `tests/unit/marketing/review-email-schema-isolation.test.ts` (AST
  glob-scan of `tests/integration/marketing/*.integ.test.ts`; `WRITE_HOOKS`
  includes `beforeEach`)
- POS order isolation (ORD-ISO):
  `tests/unit/pos/orders-persistence-isolation.test.ts` (AST glob-scan of
  `tests/integration/pos/*.integ.test.ts`; requires `beforeAll`)

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

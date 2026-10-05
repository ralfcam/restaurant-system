# Vitest unit guide

**Status:** Reference  
**Last updated:** 2026-10-04

## Layout

- Config: `vitest.unit.config.ts` (`test.testTimeout: 15_000`)
- Setup: `tests/unit/setup.ts`
- Tests: `tests/unit/**/*.test.ts`
- Branding logo upload: `tests/unit/branding/` (actions, validation, `next.config.mjs`
  bodySizeLimit schema guard)
- Post-visit review email: `tests/unit/marketing/` (settings persist, send gates,
  queue-on-complete, cron job auth, cron mailer factory, Supabase hourly
  Edge Function pin, marketing page, PV-ISO schema isolation scan)
- Staff authorization: `tests/unit/auth/` (`requireStaffUser` /
  `requireSuperAdminUser` claims, staff-route proxy, login landing gate,
  local signup TOML, seed `raw_app_meta_data` for staff and super-admin);
  SA-11 service-role module fence: `tests/unit/supabase/service-boundary.test.ts`
- Site chrome / template identity: `tests/unit/site-chrome.test.ts` (no bundled
  `SITE_LOGO.src`, Restaurant Link name, `menu-catalog` rename guard, SC-4a
  `shouldUseLightNavText`); `tests/unit/site-header.test.ts` (SiteHeader JSX
  in `components/site/home-page-client.tsx`); homepage HP-1/HP-3
  `tests/unit/site/homepage-layout.test.ts`; HP-2
  `tests/unit/site/home-page-chefs-picks-ssr.test.ts`
- Standalone reservation page (SW-1–SW-7):
  `tests/unit/site/standalone-reservation-widget.test.ts` (editorial
  upsert including `show_reservation_phone`, settings editor submit,
  editor hydrate from `restaurant_settings` id `1`, phone visibility,
  display name, centered `/[locale]/reserve`, hero/hours/address,
  existing widget accordions)
- Guest and staff i18n: `tests/unit/i18n/` (header locale nav, catalog chrome,
  `isActiveNavPath`, `resolveDocumentLang`, `DocumentLangSync` layout mount,
  sheet switcher, middleware-scope cookie-option merge and segment-bounded
  locale skip, `staff-locale`, `staff-surfaces/`, `guest-surfaces/`,
  `no-hardcoded-copy.test.ts`)
- Super-admin chrome (SA-10): `tests/unit/branding/super-admin-chrome.test.ts`,
  `tests/unit/scheduling/super-admin-chrome.test.ts`,
  `tests/unit/floor/super-admin-chrome.test.ts`,
  `tests/unit/marketing/super-admin-chrome.test.ts`
- Dev toolchain: `tests/unit/dev-toolchain/` (G-T1/G-L1/G-F1/G-W1/G-P1/G-O1/G-CR1,
  including `pnpm-overrides-toolchain.test.ts` and
  `coderabbit-cloud-install.test.ts`; advisory local G-CR2 in
  `.cursor/checks/coderabbit-gate.test.mjs`,
  `.cursor/checks/coderabbit-review-policy.test.mjs`,
  `.cursor/checks/tdd-guard-policy.test.mjs`, and
  `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts`;
  fail-closed remote G-CR3 in `.cursor/checks/coderabbit-pr-policy.test.mjs` and
  `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` (`.cursor/plans/`
  work-order threads and `isOutdated === true` leftovers excluded from
  `unresolved_threads`; incremental-pause SUCCESS is exact
  `REQUIRED_US_STATUS_CONTEXT` plus `isUsApp` checks, with CodeRabbit label
  `name` or `app.name`; `fetchSnapshot` paginates `GET /commits/{sha}/status`);
  spawn-proven G-TD1 in `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`;
  G-CAP1 PHASE 5 heading-range chrome-scan in
  `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`; G-DES1 PowerShell
  runtime-probe, isolated STEP 0 fail-closed denial (`MUST NOT enter STEP
0B`), and labeled command-index paragraph isolation (one-shot trio plus
  interactive `/design`) in
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`)
- POS live pickers: `tests/unit/floor/pos-table-picker.test.ts`,
  `tests/unit/floor/pos-server-picker.test.ts`,
  `tests/unit/floor/get-servers.test.ts`,
  `tests/unit/floor/pos-menu-availability.test.ts`
- Floor drag (FP-9): `tests/unit/floor/layout.test.ts` (`floorDropCell`),
  `tests/unit/floor/drag-follow.test.ts` (follow, grab-offset drop, `touch-none`),
  `tests/unit/floor/schema.test.ts` (`floorDropCell` source pin)
- Weekly service overview (WA-1–WA-7):
  `tests/unit/floor/weekly-service-overview.test.ts`,
  `tests/unit/floor/dashboard-weekly-overview.test.ts`
- Restaurant cover capacity (CC-1–CC-11):
  `tests/unit/floor/cover-capacity.test.ts`.
  `tests/unit/floor/operations-shape.test.ts` and
  `tests/unit/floor/message-keys.test.ts` script the settings read.
- Staff Data API cookie vs service: `tests/unit/menu/catalog-service-client.test.ts`,
  `tests/unit/reservations/get-range-service-client.test.ts`
- Live menu tabs (`menus`): `tests/unit/menu/menu-tab-identity.test.ts`,
  `tests/unit/menu/menu-tab-persistence.test.ts`,
  `tests/unit/menu/dish-menu-tab-options.test.ts`,
  `tests/unit/menu/guest-menu-tabs.test.ts`,
  `tests/unit/menu/menus-bootstrap.test.ts` (MT-4a CREATE-before-GRANT; MT-4c
  hosted RLS + five-id `INSERT … ON CONFLICT (id) DO NOTHING`; MT-4e every
  `CREATE TABLE IF NOT EXISTS menus` file seeds those five ids),
  `tests/unit/menu/menus-integ-strict.test.ts` (MT-4b PRE-SATISFIED pin; MT-4d
  `vitest.integration.config.ts` `test.env`)
- Availability: `tests/unit/availability/actions.test.ts` (OH-NOTE-SAVE guest-note
  cap; BD-READ-FAIL blocked-date SELECT fail-closed)
- Reservation isolation (RES-ISO):
  `tests/unit/reservations/reservation-integ-isolation.test.ts` (AST
  glob-scan of `tests/integration/reservations/*.integ.test.ts`; zero-arg
  call; rejects an explicit-URL helper argument)
- Walk-in seating (WI-1–WI-8): `tests/unit/reservations/walk-in.test.ts`
  (`seatWalkIn` staff gate, seated insert, trigger message, fit/overlap,
  party size above 8, contact format, table-group seat, seated completion)
- Allergen capture (AL-1–AL-6): `tests/unit/reservations/allergen-capture.test.ts`
  (blank guest field stores null; trimmed service-role write and rollback;
  staff row shows non-null text; per-reservation isolation; completed
  transition leaves `allergens`; name, email, party cap, and confirmation stay)
- External booking import (EI-1–EI-8): `tests/unit/reservations/external-booking-import.test.ts`
  (staff gate and `reservation-import`; hidden `external_booking_id` omitted
  from guest INSERT; confirmed insert, existing-id skip, and in-file duplicate;
  all-or-nothing on a bad row or trigger refusal; no import exception on
  `validate_reservation_availability`; file shape via exported `DATE_RE` /
  `TIME_RE`; result counts and the date list)
- Staff list guest email (STAFF-GUEST-EMAIL / STAFF-GUEST-EMAIL-ABSENT):
  `tests/unit/reservations/staff-list-guest-email.test.ts` (source-scan
  visible `{r.email}` after stripping GP-9 `guestProfileHref`; blank-omit
  `r.email?.trim()` gate)
- Guest widget fully booked confirm (BW-16):
  `tests/unit/reservation-widget/fully-booked-error.test.ts` (source-scan
  `confirm()` exact-string branch; no page toast; step 2 `role="alert"`;
  Back-clear: every step-2 `setStep(1)` `onClick` calls the denial setter
  with `null` — "fully booked rejection is cleared when the guest leaves
  the confirmation form")
- Guest widget collapsed summary gap (BW-17):
  `tests/unit/reservation-widget/collapsed-summary-gap.test.ts` (source-scan
  named `cn` `accordionTriggerCls`; exclude inner icon-to-label `gap-1.5`
  when asserting label↔summary separation — "collapsed guests and date
  summaries are separated from their accordion labels")
- Manual-assign dropdown occupancy (FP-5-DROPDOWN-OCCUPANCY):
  `tests/unit/reservations/selectable-tables.test.ts` (non-overlap keep;
  configured occupancy duration + safety buffer),
  `tests/unit/components/staff/table-assignment.test.ts` (in-memory list,
  not `getReservationTables`)
- Slot/service cover limits (BW-18–BW-22 / CL-1–CL-3):
  `tests/unit/reservations/available-slots.test.ts` (slot cap, service cap,
  BW-22 table-fit AND), `tests/unit/reservations/cover-limits.test.ts`
  (`coversFitSlotAndService`), `tests/unit/scheduling/cover-limits.test.ts`
  (staff `validateOperatingDays` CL-1–CL-3)
- Review-email isolation (PV-ISO):
  `tests/unit/marketing/review-email-schema-isolation.test.ts` (AST
  glob-scan of `tests/integration/marketing/*.integ.test.ts`; `WRITE_HOOKS`
  includes `beforeEach`)
- POS order isolation (ORD-ISO):
  `tests/unit/pos/orders-persistence-isolation.test.ts` (AST glob-scan of
  `tests/integration/pos/*.integ.test.ts`; requires `beforeAll`)
- Reservation analytics: `tests/unit/analytics/` (staff gate, fail-closed
  reader, period, duration, patterns, staff-page PII)
- Event inquiries: `tests/unit/inquiries/` (staff gate + Service `NAV_GROUPS`,
  schema CHECKs, create allowlist, STAFF-LIST, status-only update, no
  convert/confirm export, EI-9 isolation scan)
- Guest profiles: `tests/unit/guest-profiles/` (`normalizeGuestEmail` /
  `guestEmailFromRouteParam`, `buildGuestProfile` summary, RES-PRIV, staff
  gate + ficha Save/PII/history table, PII `ok` / `notFound`, live
  `email_normalized` read, reservation-row `fichaHref` `Link`,
  `playwright-local-supabase.test.ts` source-scan of Playwright `globalSetup`)

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

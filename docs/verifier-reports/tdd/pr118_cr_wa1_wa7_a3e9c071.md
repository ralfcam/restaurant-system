# TDD log: pr118_cr_wa1_wa7_a3e9c071

### C1

Suggested review order:
- Isolation of weekly load from current-day Dashboard — `app/admin/page.tsx:59` `Promise.all` of `getAuthUser` / `getFloorSnapshot` / guarded weekly sibling
- Isolation guard (the WA-7 contract) — `app/admin/page.tsx:62` [booking] `.catch(() => ({ days: [] }))` so a weekly throw cannot reject the snapshot path
- Failure render surface — `app/admin/page.tsx:208` `WeeklyServiceOverview` receives `weeklyOverview.days` (empty array on catch)

Reusable pattern: Isolate a non-critical `Promise.all` sibling with `.catch(() => emptyFallback)` at the call site — do not switch the whole `all()` to `allSettled`, so auth/snapshot rejections still fail the page.

### C2

Suggested review order:
- Configured-only contract (WA-1) — `app/actions/availability.ts:174` `getConfiguredOperatingWindows` [booking]
- Empty/error → no services — `app/actions/availability.ts:182` `[]` (no `DEFAULT_OPERATING_DAYS`)
- Strip DEFAULT-seeded weekdays — `app/actions/availability.ts:187` `ledgerWeekdays` filter after `groupRowsByDay` [booking]
- Overview loader uses that export — `app/admin/page.tsx:11` import; `app/admin/page.tsx:34` `await getConfiguredOperatingWindows()`
- Guest DEFAULT fallback (must stay) — `app/actions/availability.ts:141` `getAllOperatingWindowsMap`
- WA-7 isolation (must stay) — `app/admin/page.tsx:62` `.catch(() => ({ days: [] }))`

Reusable pattern: Staff overview must not call `getAllOperatingWindowsMap`; read configured rows, return `[]` on empty/error, and strip `groupRowsByDay`’s DEFAULT-seeded weekdays so a partial ledger cannot leak template services.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

- [booking] Configured-only windows (no DEFAULT templates)
  - `app/actions/availability.ts:174` `getConfiguredOperatingWindows`
  - `app/actions/availability.ts:182` empty/error → `[]`
  - `app/actions/availability.ts:187` `ledgerWeekdays` filter after `groupRowsByDay`
  - `app/admin/page.tsx:34` `await getConfiguredOperatingWindows()`
  - `app/actions/availability.ts:141` guest `getAllOperatingWindowsMap` DEFAULT (must stay)
- [booking] Isolate weekly load from FP-11
  - `app/admin/page.tsx:59` `Promise.all` of auth / snapshot / guarded weekly sibling
  - `app/admin/page.tsx:62` `.catch(() => ({ days: [] }))`

## Traceability (final)

Run: 2026-09-16 · plan: pr118_cr_wa1_wa7_a3e9c071 · issue: none (PR #118 / RES-76 context)

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md WA-7 | dashboard-weekly-overview.test.ts::weekly overview load is isolated from tonight's floor snapshot | app/admin/page.tsx | P1 | shipped |
| C2 | scheduling.md WA-1 | dashboard-weekly-overview.test.ts::weekly overview does not load DEFAULT operating-day templates | app/admin/page.tsx, app/actions/availability.ts | P1 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: pr118_cr_wa1_wa7_a3e9c071
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 10 left on ledger (below floor/cap) — cap 3/run

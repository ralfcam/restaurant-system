# TDD verifier report — REAZED-304 floor select blur (`reazed-304_floor_blur_320155e0`)

FIX run. Linear: [REAZED-304](https://linear.app/realized/issue/REAZED-304).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — FP-12 desktop (lg+): selection does not open the Sheet

Suggested review order:
- Gate: do not open the mobile Sheet at `lg+` [public-api]
  - `lib/floor/layout.ts:13` — `FLOOR_LG_MIN_PX`
  - `lib/floor/layout.ts:16` — `shouldOpenMobileInspector`
  - `components/staff/floor-plan.tsx:673` — `selectTable` [public-api]
- Close Sheet when the viewport becomes `lg+`
  - `components/staff/floor-plan.tsx:311` — resize listener → `setMobileInspectorOpen(false)`
- Inspector chrome (overlay is owned by `open`, not `lg:hidden`)
  - `components/staff/floor-plan.tsx:1139` — desktop side inspector `lg:block`
  - `components/staff/floor-plan.tsx:1411` — `<Sheet open={mobileInspectorOpen}>`
  - `components/staff/floor-plan.tsx:1412` — `SheetContent` `lg:hidden` (inversion: not sufficient for FP-12)

Reusable pattern: Pure `shouldOpenMobileInspector(width)` keyed off a named Tailwind `lg` constant, plus a caller-side Sheet `open` gate — never treat `lg:hidden` on `SheetContent` as mobile-only while the overlay still mounts.

### C2 — FP-12 below lg: selection still opens the bottom Sheet

Suggested review order:
- Below-lg open-on-select [public-api]
  - `components/staff/floor-plan.tsx:673` — `selectTable`
  - `components/staff/floor-plan.tsx:676` — `shouldOpenMobileInspector(window.innerWidth)` gate
  - `components/staff/floor-plan.tsx:677` — `setMobileInspectorOpen(true)`
- Helper contract (C1, unchanged this phase)
  - `lib/floor/layout.ts:13` — `FLOOR_LG_MIN_PX`
  - `lib/floor/layout.ts:16` — `shouldOpenMobileInspector`
- Sheet chrome (overlay owned by `open`, not `lg:hidden`) [public-api]
  - `components/staff/floor-plan.tsx:1413` — `<Sheet open={mobileInspectorOpen}>`
  - `components/staff/floor-plan.tsx:1414` — `SheetContent` `side="bottom"` / `lg:hidden`

Reusable pattern: Source-regex lock-in of the `true` open-path (`setMobileInspectorOpen(true)` beside `shouldOpenMobileInspector`) so a boolean-assign cannot silently delete below-lg open-on-select.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Selection must not open a desktop overlay `[public-api]`

- `components/staff/floor-plan.tsx:673` — `selectTable` [public-api]
- `components/staff/floor-plan.tsx:676` — `shouldOpenMobileInspector(window.innerWidth)` gate
- `components/staff/floor-plan.tsx:677` — `setMobileInspectorOpen(true)` only when the helper is true (below `lg`)
- Do **not** globally strip `SheetOverlay` in `components/ui/sheet.tsx` (StaffShell / SiteHeader still need it)

### 2. Named `lg` helper `[public-api]`

- `lib/floor/layout.ts:13` — `FLOOR_LG_MIN_PX` (1024)
- `lib/floor/layout.ts:16` — `shouldOpenMobileInspector`

### 3. Close Sheet when the viewport becomes `lg+`

- `components/staff/floor-plan.tsx:311` — resize listener → `setMobileInspectorOpen(false)`

### 4. Inspector chrome (overlay is owned by `open`, not `lg:hidden`)

- `components/staff/floor-plan.tsx:1139` — desktop side inspector `lg:block`
- `components/staff/floor-plan.tsx:1413` — `<Sheet open={mobileInspectorOpen}>`
- `components/staff/floor-plan.tsx:1414` — `SheetContent` `side="bottom"` / `lg:hidden` (inversion: hide-only does not satisfy FP-12)

## Traceability (final)

Run: 2026-08-28 · plan: reazed-304_floor_blur_320155e0 · issue: REAZED-304

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-12 (lg+) | `schema.test.ts::selecting a table at lg does not open the mobile inspector Sheet` | `components/staff/floor-plan.tsx`, `lib/floor/layout.ts` | P1 | shipped |
| C2 | scheduling.md FP-12 (below lg) | `schema.test.ts::selecting a table below lg opens the bottom Sheet inspector` | `components/staff/floor-plan.tsx`, `lib/floor/layout.ts` | P2 | shipped |

## Run metrics

Run: 2026-08-28 → 2026-08-28 · plan: reazed-304_floor_blur_320155e0
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 4 left on ledger (below floor) — cap 3/run

# TDD verifier report — RES-119 mobile floor inspector (`res-119_mobile_inspector_dbb6`)

FIX run. Linear: RES-119.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — mobile Sheet management actions

Suggested review order:
- One handler path for seats and expected time: `components/staff/floor-plan.tsx:248`, `:285`, `:310`
- Mobile Sheet still names those handlers: `components/staff/floor-plan.tsx:1721` [public-api]
- Sheet close does not clear canvas selection: `components/staff/floor-plan.tsx:1641` [booking]
- Desktop expected-time hint stays on the `lg` inspector only: `components/staff/floor-plan.tsx:1538`
- Shared merge-partner chips, combine still at the call site: `components/staff/floor-plan.tsx:334`, `:1756`
Reusable pattern: When a source-slice test requires handler identifiers inside a JSX region, share markup by passing the existing functions as props (`onAdjustSeats={adjustSeats}`) so the slice still contains the tokens.

## Suggested Review Order (collated)

- Sheet close leaves the canvas selection in place [booking] → `components/staff/floor-plan.tsx:1641`
- Mobile Sheet still names the shared handlers [public-api] → `components/staff/floor-plan.tsx:1715` (`setStatus`), `:1721` (`onAdjustSeats={adjustSeats}`), `:1756` (`combineSelected`), `:1770` (`toggleUnlock`), `:1784` (`removeTable`)
- One seat and expected-time handler path → `components/staff/floor-plan.tsx:248` (`InspectorCapacityControls`), `:1541` (desktop), `:1721` (sheet)
- Desktop expected-time hint stays on the `lg` inspector → `components/staff/floor-plan.tsx:1538`, `:1543`
- Merge chips are shared; combine stays at the call site → `components/staff/floor-plan.tsx:334`, `:1603`, `:1746`

## Traceability (final)

Run: 2026-10-05 · plan: res-119_mobile_inspector_dbb6 · issue: RES-119

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-12 | tests/unit/floor/schema.test.ts::mobile Sheet inspector exposes the same permitted table management actions as the side inspector | components/staff/floor-plan.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: res-119_mobile_inspector_dbb6
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 4 left on ledger (below floor/cap) — cap 3/run

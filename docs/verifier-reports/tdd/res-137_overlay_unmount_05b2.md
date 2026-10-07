# TDD verifier report — RES-137 overlay unmount (`res-137_overlay_unmount_05b2`)

FIX run. Linear: RES-137.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — mobile Sheet unmounts at lg

Suggested review order:
- unmount gate `components/staff/floor-plan.tsx:1658`
- SheetContent class has no `lg:hidden` `components/staff/floor-plan.tsx:1660`
- resize records width and closes at lg+ `components/staff/floor-plan.tsx:474`
- SSR initial width `FLOOR_LG_MIN_PX` `components/staff/floor-plan.tsx:408`
- `selectTable` opens only below lg `components/staff/floor-plan.tsx:875`

Reusable pattern: A source pin that requires `shouldOpenMobileInspector(<ident>) && (` at the end of the prefix before `<Sheet` stays valid after prettier if the child is indented and only whitespace sits between `(` and the tag.

## Suggested Review Order (collated)

- Unmount the mobile Sheet at lg so the overlay cannot stick [public-api] → `components/staff/floor-plan.tsx:1658`, `SheetContent` without `lg:hidden` at `:1660`
- Resize records width and closes the sheet at lg+ → `components/staff/floor-plan.tsx:474`
- SSR initial width is `FLOOR_LG_MIN_PX` so the first client render matches → `components/staff/floor-plan.tsx:408`
- `selectTable` opens the sheet only below lg → `components/staff/floor-plan.tsx:875`
- Spec unmount rule → `docs/specs/scheduling.md` FP-12

## Traceability (final)

Run: 2026-10-06 · plan: res-137_overlay_unmount_05b2 · issue: RES-137

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-12 | tests/unit/floor/schema.test.ts::mobile Sheet unmounts at lg so the overlay cannot stick | components/staff/floor-plan.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-137_overlay_unmount_05b2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: two low residuals (test-debt source pin, tech-debt width vs Tailwind lg) left for ledger merge

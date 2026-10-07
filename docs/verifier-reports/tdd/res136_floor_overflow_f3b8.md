# TDD log — res136_floor_overflow_f3b8

### C1

Suggested review order:
- Containment — grid can shrink below the canvas: `components/staff/floor-plan.tsx:923` (costliest stop; not auth/booking/schema/public-api/security)
- Containment — main column is the grid item with `min-w-0`: `components/staff/floor-plan.tsx:924`
- Scrollport — existing wrapper `overflow-auto`: `components/staff/floor-plan.tsx:1139` (fixed canvas `canvasRef` at `:1141`, size at `:1144`)
- Contract — `min-w-0` on both classes, then `overflow-auto`: `tests/unit/floor/schema.test.ts:675`, `:683`, `:696`

Reusable pattern: A fixed-pixel canvas inside `overflow-auto` still widens the page until both the `lg:grid-cols-[1fr_300px]` grid and the next main-column class include `min-w-0`. A scan that only asserts `overflow-auto` is a false pass.

### C2

Suggested review order:
- Stacking: canvas wrapper creates the stacking context that holds chip `z-10` / `z-20` — `components/staff/floor-plan.tsx:1139`, chip classes `components/staff/floor-plan.tsx:1205`
- Sticky desktop inspector (show/hide pair plus the `lg` stick and own scroll box) — `components/staff/floor-plan.tsx:1428`

Reusable pattern: Keep FP-12 class pins as one `className="..."` literal. The schema scan slices that quoted string, so `cn()` or a pulled-out constant would fail the pin without changing the rendered classes.

## Suggested Review Order (collated)

- Containment — grid and main column `min-w-0` so the fixed canvas does not widen the page → `components/staff/floor-plan.tsx:923`, `components/staff/floor-plan.tsx:924`, scrollport `components/staff/floor-plan.tsx:1139`
- Stacking — `isolate` on that scrollport so chip `z-10` / `z-20` stay under the staff header → `components/staff/floor-plan.tsx:1139`, `components/staff/floor-plan.tsx:1205`
- Sticky inspector — `lg:sticky` with its own max-height scroll so the header does not cover it → `components/staff/floor-plan.tsx:1428`
- Contract — source scans → `tests/unit/floor/schema.test.ts:675`, `tests/unit/floor/schema.test.ts:752`
- Spec — FP-12 containment and stacking sentences → `docs/specs/scheduling.md`

## Traceability (final)

Run: 2026-10-07 · plan: res136_floor_overflow_f3b8 · issue: RES-136

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-12 containment | tests/unit/floor/schema.test.ts::floor grid shrinks so the fixed canvas scrolls inside the page | components/staff/floor-plan.tsx | P1 | shipped |
| C2 | scheduling.md FP-12 stacking | tests/unit/floor/schema.test.ts::floor canvas stacking stays under the header and the side inspector sticks below it | components/staff/floor-plan.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: res136_floor_overflow_f3b8
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: 0 — none
Issues: one low product-gap (focusFloor scrollIntoView) left for ledger merge


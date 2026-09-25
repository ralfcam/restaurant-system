# TDD log: res-115-floor-drag

### C1

Suggested review order:
- Grab-offset snap: `lib/floor/layout.ts:34` doc, `lib/floor/layout.ts:39` formula `[public-api]`
- Rounding and grid clamp reused by that formula: `lib/floor/layout.ts:22`, `lib/floor/layout.ts:27`
- Pinned deltas from origin `{1,1}`: `tests/unit/floor/layout.test.ts:121`

Reusable pattern: none

### C2

Suggested review order:
- Drop cell (grab offset) — `lib/floor/layout.ts:35`
- Shared delta — `components/staff/floor-plan.tsx:133`
- Merge highlight — `components/staff/floor-plan.tsx:636`
- Drop outcome [booking] — `components/staff/floor-plan.tsx:655` (`floorDropCell`), `659` (`resolveMergeDrop`), `681` (`resolveSplitDrop`), `705` (`persistPosition`)

Reusable pattern: one `pointerDelta(drag, point)` for the move threshold, merge highlight, and drop cell so the grab offset cannot drift between handlers.

### C3

Suggested review order:
- Continuous follow without per-move React position writes: `components/staff/floor-plan.tsx:608` (`onChipPointerMove`), `:620` (`translate3d` on the drag-layer ref), `:622`–`:627` (drop target only when the key changes)
- Origin is the persisted cell: `components/staff/floor-plan.tsx:596`
- Draft still cleared after persist: `components/staff/floor-plan.tsx:577`–`:585` (`persistPosition` → `clearDraft`), state at `:275`, clearer at `:350`

Reusable pattern: Drive the in-drag chip with an imperative `translate3d` on a ref, and keep React state for drop-target changes only.

### C4

Suggested review order:
- `components/staff/floor-plan.tsx:1024` — `unlocked` is edit mode plus an unlocked id; `canMove` at `:1025` is `editMode && unlocked && !merging`
- `components/staff/floor-plan.tsx:1130` — chip button class; `:1131` is the only `touch-none`; `:1132` is `cursor-pointer` for locked and service-mode chips
- `components/staff/floor-plan.tsx:588` — `onChipPointerDown`; `:592` returns when the table is locked or a merge is in progress
- `components/staff/floor-plan.tsx:1044` — move-lock span; `stopPropagation` on pointerdown `:1069`, click `:1071`, and keydown `:1078`

Reusable pattern: Put `touch-none` only in the movable-chip class arm so locked and service-mode chips keep the browser default `touch-action` and the floor can still pan.

### C5

Suggested review order:
- Seed staff session: `tests/e2e/helpers/staff-login.ts:7` [auth]
- Mouse follow, snap, reload, and return to the seed cell: `tests/e2e/floor/floor-drag.spec.ts:8`
- Grab-offset snap: `lib/floor/layout.ts:35`
- Continuous translate, no per-move cell write: `components/staff/floor-plan.tsx:596`
- Drop outcome and persist: `components/staff/floor-plan.tsx:618` and `components/staff/floor-plan.tsx:567` [booking]
- `touch-none` only when `canMove`: `components/staff/floor-plan.tsx:1002` and `components/staff/floor-plan.tsx:1107`

Reusable pattern: none

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers are after C5; follow the symbols if they drift.

### 1. Drop correctness [booking]

- `lib/floor/layout.ts:35` — `floorDropCell` grab-offset snap [public-api]
- `lib/floor/layout.ts:27` — `clampFloorCell` reused by that formula
- `components/staff/floor-plan.tsx:133` — shared `pointerDelta`
- `components/staff/floor-plan.tsx:618` — `finishPointerDrag` resolves the drop cell [booking]
- `components/staff/floor-plan.tsx:567` — `persistPosition`

### 2. In-drag rendering

- `components/staff/floor-plan.tsx:596` — `onChipPointerMove` writes `translate3d` on the drag-layer ref and does not write draft cells

### 3. Touch and service-mode panning

- `components/staff/floor-plan.tsx:1002` — `canMove` is edit mode + unlocked + not merging
- `components/staff/floor-plan.tsx:1107` — `touch-none` only in the movable-chip class arm

### 4. E2E harness [auth]

- `tests/e2e/helpers/staff-login.ts:7` — seed staff login [auth]
- `tests/e2e/floor/floor-drag.spec.ts:8` — mid-drag pixel follow, snap, reload, cleanup

## Traceability (final)

Run: 2026-09-24 · plan: res-115-floor-drag · issue: RES-115

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-9-DROP | `layout.test.ts::floorDropCell resolves the nearest cell from the drag delta, preserving the grab offset` | `lib/floor/layout.ts` | P1 | shipped |
| C2 | scheduling.md FP-9-DROP | `drag-follow.test.ts::drop and merge highlight resolve from floorDropCell, not the absolute pointer cell` | `components/staff/floor-plan.tsx`, `lib/floor/layout.ts` | P1 | shipped |
| C3 | scheduling.md FP-9-FOLLOW | `drag-follow.test.ts::dragging chip translates by the pointer delta without per-move cell writes` | `components/staff/floor-plan.tsx` | P1 | shipped |
| C4 | scheduling.md FP-9-TOUCH | `drag-follow.test.ts::movable chips opt out of browser panning; locked chips do not` | `components/staff/floor-plan.tsx` | P1 | shipped |
| C5 | scheduling.md FP-9-FOLLOW/DROP | `floor-drag.spec.ts::mouse drag follows the pointer, snaps to the nearest cell, and persists` | `components/staff/floor-plan.tsx`, `lib/floor/layout.ts` | P1 | shipped |
| M-1 | scheduling.md FP-9-TOUCH/FOLLOW | — | — | P2 | manual-uat |

## Run metrics

Run: 2026-09-24 → 2026-09-24 · plan: res-115-floor-drag
Criteria: 5 shipped · 1 manual-uat · 6 total
Phases delegated: 15 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 10 left on ledger (below floor) — cap 3/run

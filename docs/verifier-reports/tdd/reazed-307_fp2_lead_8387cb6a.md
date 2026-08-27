# TDD verifier report — REAZED-307 FP-2 lead (`reazed-307_fp2_lead_8387cb6a`)

FIX run. Linear: [REAZED-307](https://linear.app/realized/issue/REAZED-307).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — FP-2 due at T−DEFAULT_EXPECTED_MINUTES

Suggested review order:
- [schema] `lib/reservations/auto-assign.ts:16` — lead constant aliases `DEFAULT_EXPECTED_MINUTES` (90)
- [booking] `lib/reservations/auto-assign.ts:86` — due-check JSDoc = booked time minus expected turn, default 90
- `lib/reservations/auto-assign.ts:1` — module header aligned with FP-2

Reusable pattern: Alias the due-check lead to `DEFAULT_EXPECTED_MINUTES` and pin `TABLE_ASSIGNMENT_LEAD_MINUTES === DEFAULT_EXPECTED_MINUTES === 90` so a second literal cannot drift.

### C2 — FP-4 Tonight’s book copy

Suggested review order:
- [booking] `components/staff/floor-plan.tsx:917` — Tonight’s book helper: booked time minus expected turn (default 90), not T−15
- `tests/unit/floor/schema.test.ts:67` — source-text pin of literal `90` (do not interpolate `DEFAULT_EXPECTED_MINUTES`)

Reusable pattern: When a source-text test pins a numeral in TSX, wrap the string for Prettier but keep the digit in source — interpolating a shared constant drops it from the file and fails the pin while runtime copy is still correct.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Due-check default `[schema]` `[booking]`

- `lib/reservations/auto-assign.ts:17` — `TABLE_ASSIGNMENT_LEAD_MINUTES` aliases `DEFAULT_EXPECTED_MINUTES` (90); due-check runs before a table is chosen
- `lib/reservations/auto-assign.ts:86-89` — `isReservationDueForAssignment` JSDoc: booked time minus expected turn, default 90
- `lib/reservations/auto-assign.ts:1-8` — module header aligned with FP-2 (no T−15, not “dependency-free”)

### 2. Staff helper copy `[booking]`

- `components/staff/floor-plan.tsx:917-918` — Tonight’s book helper: booked time minus expected turn (default 90), not T−15

### 3. Source-text contract

- `tests/unit/reservations/auto-assign.test.ts` — NOW 18:00 → 19:30 due / 19:31 not; lead pinned to `DEFAULT_EXPECTED_MINUTES` and 90
- `tests/unit/floor/schema.test.ts:67-76` — Tonight’s book copy must not match `/15 minutes before the booked time/`; pins literal `90` in TSX

## Traceability (final)

Run: 2026-08-27 · plan: reazed-307_fp2_lead_8387cb6a · issue: REAZED-307

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-2 | `auto-assign.test.ts::is due once the lead window opens` (also `is not due before the lead window`; `planAutoAssignments` `assigns due reservations and leaves future ones unassigned`) | `lib/reservations/auto-assign.ts` | P1 | shipped |
| C2 | scheduling.md FP-4 helper copy | `schema.test.ts::Tonight’s book copy uses expected-turn lead default 90` | `components/staff/floor-plan.tsx` | P2 | shipped |

## Run metrics

Run: 2026-08-27 → 2026-08-27 · plan: reazed-307_fp2_lead_8387cb6a
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor) — cap 3/run

# TDD verifier report — REAZED-306 dashboard live occupancy (`reazed-306_live_occupancy_44f250a2`)

FIX run. Linear: [REAZED-306](https://linear.app/realized/issue/REAZED-306).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — FP-11 Dashboard occupancy is live floor inventory

Suggested review order:
- Live snapshot wiring (wrong fetch = seed occupancy returns)
  - [public-api] `app/admin/page.tsx:19` — `dynamic = "force-dynamic"`
  - [public-api] `app/admin/page.tsx:21-26` — `getFloorSnapshot(today)` beside `getAuthUser`
  - `app/admin/page.tsx:27-35` — bookings from `snapshot.reservations`; `countFloorOccupancy(snapshot.tables)`
- Occupancy math (physical rows, persisted status)
  - [public-api] `lib/floor/table-use.ts:148-166` — `countFloorOccupancy` / `Record<TableStatus, number>`
- Widget interpolation (FP-11 copy)
  - `app/admin/page.tsx:65-70` — Floor occupancy `` `${seated}/${total}` `` + available hint
  - `app/admin/page.tsx:83-85` — Service is live seated/available
  - `app/admin/page.tsx:149-154` — Floor status `byStatus[status]`

Reusable pattern: Anti-seed occupancy fixture (7 seated / 9 total / 0 available) plus a page source pin that forbids `\bTABLES\b` and requires `getFloorSnapshot(` + the helper name — inversion-proof without importing the Server Component.

## Suggested Review Order (collated)

Highest-risk first. One criterion (FP-11); collated from the C1 Refactor section.

### 1. Live snapshot wiring `[public-api]`

- `app/admin/page.tsx:19` — `dynamic = "force-dynamic"`
- `app/admin/page.tsx:21-26` — `getFloorSnapshot(today)` beside `getAuthUser`
- `app/admin/page.tsx:27-35` — bookings from `snapshot.reservations`; `countFloorOccupancy(snapshot.tables)`

### 2. Occupancy math `[public-api]`

- `lib/floor/table-use.ts:148-166` — `countFloorOccupancy` / `Record<TableStatus, number>`

### 3. Widget interpolation

- `app/admin/page.tsx:65-70` — Floor occupancy `` `${seated}/${total}` `` + available hint
- `app/admin/page.tsx:83-85` — Service is live seated/available
- `app/admin/page.tsx:149-154` — Floor status `byStatus[status]`

## Traceability (final)

Run: 2026-08-27 · plan: reazed-306_live_occupancy_44f250a2 · issue: REAZED-306

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 / FP-11 | scheduling.md FP-11 | tests/unit/floor/dashboard-occupancy.test.ts::dashboard Floor occupancy, Service is live, and Floor status count getFloorSnapshot tables, not TABLES seed | app/admin/page.tsx, lib/floor/table-use.ts | P1 | shipped |

## Run metrics

Run: 2026-08-27 → 2026-08-27 · plan: reazed-306_live_occupancy_44f250a2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red / tdd-green / tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 1 filed · 0 attached-to-existing · 3 left on ledger (below floor/cap) — cap 3/run

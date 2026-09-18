# TDD log — pr118_cr_wa7_exec_f2a91c08

### C1

Suggested review order:
- [booking] isolation at the concurrent call site — `app/admin/page.tsx:59`
- [booking] weekly helper still allowed to reject (isolation is not inside the loader) — `app/admin/page.tsx:28`
- executed WA-7 failure path — `tests/unit/floor/dashboard-weekly-overview.test.ts:153`

Reusable pattern: Prove Dashboard isolation by invoking the Server Component with a rejecting weekly slot mock and asserting tonight's occupancy/bookings still settle — source-scanning `Promise.all` / `.catch` is not sufficient.

## Suggested Review Order (collated)

Highest-risk first.

- [booking] isolation at the concurrent call site — `app/admin/page.tsx:59`
- [booking] weekly helper still allowed to reject (isolation is not inside the loader) — `app/admin/page.tsx:28`
- executed WA-7 failure path — `tests/unit/floor/dashboard-weekly-overview.test.ts:153`

## Traceability (final)

Run: 2026-09-16 · plan: pr118_cr_wa7_exec_f2a91c08 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md WA-7 | dashboard-weekly-overview.test.ts::weekly overview rejection still settles tonight's floor snapshot | app/admin/page.tsx | P0 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: pr118_cr_wa7_exec_f2a91c08
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 2 (tdd-red, tdd-refactor; Green skipped already-green)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run


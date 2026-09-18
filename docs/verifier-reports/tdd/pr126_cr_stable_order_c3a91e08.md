# TDD log: pr126_cr_stable_order_c3a91e08

### C1

Suggested review order:
- [booking] Stable page key — `app/actions/reservations.ts:601` `.order("id", { ascending: true })` then `:602` `.range`
- [booking] Offset loop completeness — `app/actions/reservations.ts:595-609` `fetchAllOrderPages`
- [auth] Staff gate before service-role orders read — `app/actions/reservations.ts:572-584`

Reusable pattern: PostgREST `.range` pages need a unique immutable `.order(pk)` first; Red pin is a thenable that withholds page 2 unless that order preceded `.range`

## Suggested Review Order (collated)

Highest-risk first.

- [booking] Stable page key — `app/actions/reservations.ts:601` `.order("id", { ascending: true })` then `:602` `.range`
- [booking] Offset loop completeness — `app/actions/reservations.ts:595-609` `fetchAllOrderPages`
- [auth] Staff gate before service-role orders read — `app/actions/reservations.ts:572-584`

## Traceability (final)

Run: 2026-09-18 · plan: pr126_cr_stable_order_c3a91e08 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-15-COMPLETE | floor-snapshot-bills.test.ts::floor snapshot pages orders with a stable id order | app/actions/reservations.ts | P0 | shipped |

## Run metrics

Run: 2026-09-18 → 2026-09-18 · plan: pr126_cr_stable_order_c3a91e08
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (C1 R/G/Rf)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 6 left on ledger (below floor) — cap 3/run


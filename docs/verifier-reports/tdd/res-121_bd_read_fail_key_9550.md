# TDD verifier report — RES-121 BD-READ-FAIL catalog key (`res-121_bd_read_fail_key_9550`)

FIX run. Linear: RES-121.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — BD-READ-FAIL names the catalog key

Suggested review order: public message is the bare catalog key [public-api] — `docs/specs/booking-rules.md:277`; trace row uses the same key — `docs/specs/booking-rules.md:427`; spec pin — `tests/unit/availability/actions.test.ts:345`
Reusable pattern: Read the owning spec in a unit test and assert both the numbered criterion and its trace row contain the bare `errors.*` key and not the retired English sentence.

## Suggested Review Order (collated)

- Public message is `errors.availability.blockedDatesLoadFailed` [public-api] → `docs/specs/booking-rules.md:277`
- Trace row names that same key → `docs/specs/booking-rules.md:427`
- Spec pin covers item 24 and the trace row → `tests/unit/availability/actions.test.ts:345`

## Traceability (final)

Run: 2026-10-07 · plan: res-121_bd_read_fail_key_9550 · issue: RES-121

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| BD-READ-FAIL | booking-rules.md BD-READ-FAIL | tests/unit/availability/actions.test.ts::BD-READ-FAIL names the blockedDatesLoadFailed catalog key | app/actions/availability.ts | P2 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: res-121_bd_read_fail_key_9550
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: n/a

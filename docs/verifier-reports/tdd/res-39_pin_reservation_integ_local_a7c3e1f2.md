# TDD log — res-39_pin_reservation_integ_local_a7c3e1f2

## C1

Suggested review order:
- Isolation scan contract [security]
  - `tests/unit/reservations/reservation-integ-isolation.test.ts:7` (`INTEG_GLOB`)
  - `tests/unit/reservations/reservation-integ-isolation.test.ts:27-51` (named import + call AST)
  - `tests/unit/reservations/reservation-integ-isolation.test.ts:103-115` (first-statement `WRITE_HOOKS` walk)
- Integ pin-before-write [security]
  - `tests/integration/reservations/atomic-booking.integ.test.ts:4,60,74`
  - `tests/integration/reservations/occupancy-window.integ.test.ts:4,44,56`
  - `tests/integration/reservations/table-fit.integ.test.ts:4,31,43`
  - `tests/integration/reservations/public-privileges.integ.test.ts:6,64,69,134,139,188,193` [security] (three describes)
  - `tests/integration/reservations/review-email-pii.integ.test.ts:4,41,46`
- Confirm no client-level guard
  - `lib/supabase/service.ts:8-21`

Reusable pattern: AST glob-scan: require the named import plus a first-statement `assertIsolatedHoursMutationTarget()` call in `beforeAll` and every write-cleanup hook; iterate one `WRITE_HOOKS` list so the const is not type-only

## Suggested Review Order (collated)

Highest-risk first.

- [security] isolation scan contract — `tests/unit/reservations/reservation-integ-isolation.test.ts:7` (`INTEG_GLOB`); `:27-51` (named import + call AST); `:103-115` (`WRITE_HOOKS` first-statement walk)
- [security] reservation integ pin-before-write — `tests/integration/reservations/atomic-booking.integ.test.ts:4,60,74`; `occupancy-window.integ.test.ts:4,44,56`; `table-fit.integ.test.ts:4,31,43`; `public-privileges.integ.test.ts:6,64,69,134,139,188,193` (three describes); `review-email-pii.integ.test.ts:4,41,46`
- [security] confirm no client-level guard — `lib/supabase/service.ts:8-21`

## Traceability (final)

Run: 2026-09-09 · plan: res-39_pin_reservation_integ_local_a7c3e1f2 · issue: RES-39

| Criterion | Spec ref     | Test file::name                                                                                                      | Source file(s) | Risk | Status  |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- | -------------- | ---- | ------- |
| C1        | RES-ISO      | reservation-integ-isolation.test.ts::reservation integ suites call assertIsolatedHoursMutationTarget before mutating writes | none (reuse `lib/scheduling/hours-mutation-target.ts`; wired existing integ suites) | P0   | shipped |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: res-39_pin_reservation_integ_local_a7c3e1f2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 4
Back-loops: C1: 1 extra Red (red-wire after scan RED)
BLOCKED events: none
Issues: 0 filed · 0 attached · 8 left on ledger (3 high proposed, Cloud no-create; 5 below floor) — cap 3/run


# TDD log — pr122_cr_bw16_attempt_scope_c4e8a1b2

### C1

Suggested review order:
- attempt-scoped denial clear **[booking]**
  `components/site/reservation-widget.tsx:925`
  `components/site/reservation-widget.tsx:928`
  `components/site/reservation-widget.tsx:930`
- confirm() assigns the same setter **[booking]**
  `components/site/reservation-widget.tsx:456`
  `components/site/reservation-widget.tsx:469`
  `components/site/reservation-widget.tsx:470`
- guest-visible alert **[public-api]**
  `components/site/reservation-widget.tsx:997`
- test-proof (chrome-scan; do not edit)
  `tests/unit/reservation-widget/fully-booked-error.test.ts:194`
  `tests/unit/reservation-widget/fully-booked-error.test.ts:202`
  `tests/unit/reservation-widget/fully-booked-error.test.ts:208`

Reusable pattern: chrome-scan leave-step clear — extract the confirm() denial setter(s) and assert every step-2 `setStep(1)` onClick also calls that setter with null (no RTL)

## Suggested Review Order (collated)

Highest-risk first.

- [booking] Attempt-scoped denial clear — `components/site/reservation-widget.tsx:925` Back `onClick`; `:928` `setStep(1)`; `:930` `setFullyBookedError(null)`
- [booking] Same setter on confirm() — `components/site/reservation-widget.tsx:456` start-of-submit clear; `:469-470` P0001 `setFullyBookedError(error)`
- [public-api] Guest-visible alert — `components/site/reservation-widget.tsx:997` step-2 `role="alert"`
- Test-proof — `tests/unit/reservation-widget/fully-booked-error.test.ts:194` Back-clear chrome-scan

## Traceability (final)

Run: 2026-09-17 · plan: pr122_cr_bw16_attempt_scope_c4e8a1b2 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md §27 BW-16 (attempt-scoped clear) | fully-booked-error.test.ts::fully booked rejection is cleared when the guest leaves the confirmation form | components/site/reservation-widget.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-17 → 2026-09-17 · plan: pr122_cr_bw16_attempt_scope_c4e8a1b2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 4 (C1 red, C1 green, C1 red typecheck repair, C1 refactor)
Back-loops: C1: 1 extra Red (TS1503 named-group repair)
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 3 left on ledger (below floor) — cap 3/run


# TDD log — res-66_inwidget_fully_booked_a7c2e1d4

### C1

Suggested review order:
- [booking] [public-api] `components/site/reservation-widget.tsx:469` — exact-string fully booked branch (`setFullyBookedError`, no toast, no `setStep`)
- [public-api] `components/site/reservation-widget.tsx:996` — step-2 in-form `role="alert"`
- guest-field preservation `components/site/reservation-widget.tsx:469-472` — no `reset()` / field clears on that branch
- comment split `components/site/reservation-widget.tsx:468` and `:473` — BW-16 vs dedicated-toast for `isSlotError`

Reusable pattern: Reservation-widget chrome-scans isolate the fully booked `if` by the literal `fully booked` in the condition — do not hoist that P0001 string to a module-level constant or the scanner falls through to the `isSlotError` else (toast) path

## Suggested Review Order (collated)

Highest-risk first.

- [booking] [public-api] Exact-string fully booked branch — `components/site/reservation-widget.tsx:469` `setFullyBookedError`, no `toast.error`, no `setStep(1)` / `setStep(3)`
- [public-api] Step-2 in-form rejection — `components/site/reservation-widget.tsx:996` `role="alert"` renders the BW-12 / BW-15 string
- Guest-field preservation — `components/site/reservation-widget.tsx:469-472` no `reset()` / empty `setName` / `setEmail` / `setPhone`
- Comment split — `components/site/reservation-widget.tsx:468` BW-16 vs `:473` dedicated toast for blocked / closed / hours

## Traceability (final)

Run: 2026-09-16 · plan: res-66_inwidget_fully_booked_a7c2e1d4 · issue: RES-66

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md BW-16 | fully-booked-error.test.ts::fully booked rejection is shown inside the confirmation form without a page toast | components/site/reservation-widget.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: res-66_inwidget_fully_booked_a7c2e1d4
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor) — cap 3/run

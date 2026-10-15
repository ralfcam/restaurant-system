# TDD log — pr189_cr_back_restore_d4a1

## C-back — history restoration of a queued date

Suggested review order:
- History restoration adopts the route date [booking] — `components/staff/reservations-manager.tsx:189`
- A same-turn staff click keeps its date when the route date is already reconciled [booking] — `components/staff/reservations-manager.tsx:196`
- `popstate` bumps `historyEpoch` — `components/staff/reservations-manager.tsx:174`
- The click clears the restoration flag — `components/staff/reservations-manager.tsx:217`

Reusable pattern: a `popstate` epoch re-runs route reconciliation when `selectedDate` is unchanged; if a same-turn staff click cleared the flag, return immediately when `currentDate` still equals the last reconciled date.

Re-verify (orchestrator): `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` 5 passed, 0 skipped. `pnpm lint` clean (0 warnings). `pnpm typecheck` clean.

## Suggested Review Order (collated)

- Browser back or forward adopts the route date, including a date that was queued, and a staff click in that same turn keeps the clicked date [booking] → `components/staff/reservations-manager.tsx:174`, `:189`, `:196`, `:217`
- Spec → `docs/specs/scheduling.md` item 3

## Traceability (final)

Run: 2026-10-07 · plan: pr189_cr_back_restore_d4a1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C-back | scheduling.md item 3 | tests/unit/reservations/date-navigation.test.ts::browser back to a queued date updates the list | components/staff/reservations-manager.tsx | P1 | shipped |
| C-back-click | scheduling.md item 3 | tests/unit/reservations/date-navigation.test.ts::a staff date chosen after browser back stays shown | components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: pr189_cr_back_restore_d4a1
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: C-back: 1 extra Red (same-turn click after popstate)
BLOCKED events: none
Issues: 0 filed · 0 attached · 0 left on ledger

# TDD log — pr189_cr_route_date_c7e2

## C-route — route date vs newer staff selection

Suggested review order:
- Route-date reconciliation [booking] — `components/staff/reservations-manager.tsx:108` `inFlightRouteDates`
- Adopt or trim when `selectedDate` changes — `components/staff/reservations-manager.tsx:165` through `:178`
- Record the staff target before `router.push` — `components/staff/reservations-manager.tsx:183`

Reusable pattern: lagging route prop vs in-flight ref list — tail equality clears, earliest `indexOf` drops that date and the prefix, otherwise adopt; do not use `lastIndexOf`.

Re-verify (orchestrator): `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` 3 passed, 0 skipped. `pnpm lint` clean (0 warnings). `pnpm typecheck` clean.

## Suggested Review Order (collated)

- A later route `selectedDate` updates the date control and the list, and an earlier in-flight route update does not replace a newer staff date [booking] → `components/staff/reservations-manager.tsx:108`, `:172`, `:177`, `:183`
- Spec → `docs/specs/scheduling.md` item 3

## Traceability (final)

Run: 2026-10-07 · plan: pr189_cr_route_date_c7e2 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C-route | scheduling.md item 3 | tests/unit/reservations/date-navigation.test.ts::a later route date updates the list unless a newer staff date is in flight | components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: pr189_cr_route_date_c7e2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 0 left on ledger — the prior product-gaps line for a stale `selectedDate` is archived as resolved

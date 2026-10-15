# TDD log — res-122_date_nav_e94a

## C1 — one calendar day

Suggested review order:
- Calendar shift — `lib/timezone.ts:26` `shiftCalendarDate`
- Immediate date before navigation — `components/staff/reservations-manager.tsx` `navigateToDate`
- Arrow clicks and date input — previous/next `onClick` and `value={displayedDate}`

Reusable pattern: none

Re-verify (orchestrator): `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` 1 passed, 0 skipped. `pnpm lint` clean. `pnpm typecheck` clean. `prettier --check` clean on `lib/timezone.ts`, `components/staff/reservations-manager.tsx`, and `docs/specs/scheduling.md`.

## C2 — latest list wins

Suggested review order:
- Latest list fetch — `components/staff/reservations-manager.tsx:151` `getReservationsByDate(displayedDate)`
- Drop the in-flight result — `components/staff/reservations-manager.tsx:147` `cancelled`, cleanup at `:159`
- Re-run when the control date changes — `components/staff/reservations-manager.tsx:162`

Reusable pattern: key the list effect on the date the control shows and let the effect cleanup flag drop a late `getReservationsByDate` for the previous date.

Re-verify (orchestrator): `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` 2 passed, 0 skipped. `pnpm test:unit tests/unit/reservations/list-empty-copy.test.ts` 1 passed. `pnpm lint` clean. `pnpm typecheck` clean.

## Suggested Review Order (collated)

- Calendar shift uses UTC date parts so a positive browser offset cannot skip a day → `lib/timezone.ts:26` `shiftCalendarDate`
- Both arrows call that helper and the date input updates before `router.push` → `components/staff/reservations-manager.tsx:164`, `:289`, `:297`, `:304`
- The list fetch follows the date the control shows, and a late earlier response is dropped → `components/staff/reservations-manager.tsx:147`, `:151`, `:162`
- Spec → `docs/specs/scheduling.md` item 3 and `docs/specs/booking-rules.md` STAFF-LIST

## Traceability (final)

Run: 2026-10-07 · plan: res-122_date_nav_e94a · issue: RES-122

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md item 3 | tests/unit/reservations/date-navigation.test.ts::previous and next move one calendar day in a positive UTC offset | lib/timezone.ts, components/staff/reservations-manager.tsx | P1 | shipped |
| C2 | booking-rules.md STAFF-LIST | tests/unit/reservations/date-navigation.test.ts::a stale reservations response does not replace the latest date | components/staff/reservations-manager.tsx | P1 | shipped |
| C3 | RES-122 staging check | — | — | P2 | manual-uat |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: res-122_date_nav_e94a
Criteria: 2 shipped · 1 manual-uat · 3 total
Phases delegated: 8
Back-loops: C2: 2 extra Red (stale resolve order, then react/no-children-prop)
BLOCKED events: 1 — C2 refactor lint failed on the new test; a follow-up Red fixed it before close-out
Issues: 0 filed · 0 attached · 3 left on ledger (below floor) — cap 3/run


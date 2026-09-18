# TDD log: pr126_cr_fp15_majors_7c2e9d14

### C1

Suggested review order:
- paging completeness / money invariant `[booking]` → `app/actions/reservations.ts:584-603` (`POSTGREST_MAX_ROWS` + `fetchAllOrderPages` + inclusive `.range`)
- short-page stop / error return `[booking]` → `app/actions/reservations.ts:597-601` (first error still fail-open; C2)
- sum contract `[booking]` → `app/actions/reservations.ts:617-625` (`Number(total)` → `sumOpenOrderTotalsByTableLabel`)
- C1 pin → `tests/unit/floor/floor-snapshot-bills.test.ts:149-155` (1001st matching total in `tableTotals["7"]`)

Reusable pattern: PostgREST complete-read: `.range(start, start + maxRows - 1)` until `page.length < maxRows`; the mock must cap both an unpaginated select and each `.range` page at `max_rows` so only the 1001st matching row can turn the sum green.

### C2

Suggested review order:
- fail-closed snapshot `[booking]` → `app/actions/reservations.ts:498-502` (`tableTotals: Record<string, number> | null`)
- fail-closed snapshot `[booking]` → `app/actions/reservations.ts:614-620` (orders error → `tableTotals: null`)
- hook pass-through `[public-api]` → `hooks/use-floor-plan.ts:38-39` (`data?.tableTotals`, no empty-map coerce)
- overlay omit vs successful zero `[booking]` → `lib/reservations/auto-assign.ts:351-355` (`!= null` omit; seated `?? 0`)
- numeric-only CHF `[ux]` → `components/staff/floor-plan.tsx:1075-1081` (seated wrapper + `typeof t.billTotal === "number"`)

Reusable pattern: Fail-closed money: `null` = unavailable, `{}`/`0` = successful empty; hook passes `data?.tableTotals` (never `?? {}`); overlay `!= null` omits `billTotal`; chip gates CHF on `typeof billTotal === "number"`.

### C3

Suggested review order:
- party-size slot / FP-4-PARTY `[booking]` → `components/staff/floor-plan.tsx:1061-1066` (Users span gated; `{t.reservation.partySize}` only)
- capacity cue stays seats `[ux]` → `components/staff/floor-plan.tsx:1038` (`tableChipSizeClass(t.seats)`)
- C2 CHF left intact `[ux]` → `components/staff/floor-plan.tsx:1077-1083` (`typeof t.billTotal === "number"`)
- C3 pin → `tests/unit/floor/schema.test.ts:294-329`

Reusable pattern: Floor-chip party slot: keep `<Users` in the dining-room `<button>` so the source pin can find it; gate the whole span on `{t.reservation ? … : null}` and render `{t.reservation.partySize}` (no `?? t.seats`). Chip size class may still use `t.seats`.

## Suggested Review Order (collated)

Highest-risk first.

- [booking] Complete bill sum — `app/actions/reservations.ts:584-603` (`POSTGREST_MAX_ROWS` + `fetchAllOrderPages` + inclusive `.range`); `app/actions/reservations.ts:498-502` / `:614-620` (orders error → `tableTotals: null`)
- [booking] Overlay omit vs successful zero — `lib/reservations/auto-assign.ts:351-355` (`!= null` omit; seated `?? 0`)
- [public-api] Hook pass-through — `hooks/use-floor-plan.ts:38-39` (`data?.tableTotals`, no `?? {}`)
- [ux] Numeric-only CHF — `components/staff/floor-plan.tsx:1077-1083`
- [booking] Party-size slot — `components/staff/floor-plan.tsx:1061-1066` (gated `{t.reservation.partySize}`; size class still `t.seats` at `:1038`)

## Traceability (final)

Run: 2026-09-18 · plan: pr126_cr_fp15_majors_7c2e9d14 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-15-COMPLETE | floor-snapshot-bills.test.ts::floor snapshot sums orders past the PostgREST max_rows page | app/actions/reservations.ts | P0 | shipped |
| C2 | scheduling.md FP-15-UNAVAILABLE | floor-snapshot-bills.test.ts::floor snapshot does not treat an orders query error as a zero bill | app/actions/reservations.ts, hooks/use-floor-plan.ts, lib/reservations/auto-assign.ts, components/staff/floor-plan.tsx | P0 | shipped |
| C3 | scheduling.md FP-4-PARTY | schema.test.ts::floor chip party size does not fall back to table seats | components/staff/floor-plan.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-18 → 2026-09-18 · plan: pr126_cr_fp15_majors_7c2e9d14
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 11 (C1 R/G/Rf; C2 R + schema-it R + G + typecheck-narrow R + Rf; C3 R/G/Rf)
Back-loops: C2: 2 extra Red (existing-test permission; C1 null-narrow for typecheck)
BLOCKED events: 1 — C2 Green STOP until operator yes on `tests/unit/floor/schema.test.ts` seated CHF `it`
Issues: 0 filed · 0 attached-to-existing · leftovers left on ledger (below floor: no high / no security-med) — cap 3/run

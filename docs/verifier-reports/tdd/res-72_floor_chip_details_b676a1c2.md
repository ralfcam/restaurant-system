# TDD log — res-72_floor_chip_details_b676a1c2

### C1

Suggested review order:
- **FP-15 exclusion / money sum** [booking]
  - `lib/floor/table-bills.ts:1-4` — module contract (`completed` counts)
  - `lib/floor/table-bills.ts:17-20` [booking] — skip `cancelled`/`voided`, add `total` by `table_label`
  - `tests/unit/floor/table-bills.test.ts:5-18` — C1 fixture (no `completed` row)
- **Locked public name**
  - `lib/floor/table-bills.ts:12-14` — export kept for the C1 import
  - `tests/unit/floor/table-bills.test.ts:2-4` — import/`describe` pin

Reusable pattern: When a C1 export name says “Open” but the spec counts `completed`, freeze the name and JSDoc the exclude-cancelled/voided contract rather than renaming while tests are locked.

### C2

Suggested review order:
- seated-only bill attach `[booking]`
  - `lib/reservations/auto-assign.ts:63-70` — `FloorTableView.billTotal`
  - `lib/reservations/auto-assign.ts:307-316` — JSDoc + optional `tableTotals` `[public-api]`
  - `lib/reservations/auto-assign.ts:351-356` — attach only when the map is passed; confirmed stays `null` `[booking]`

Reusable pattern: After a defaulted overlay arg (`merges = []`), attach the optional payload only when the map is actually passed so 3-arg callers stay field-free; keep explicit `null` on the mapped path so confirmed can be distinguished from seated.

### C3

Suggested review order:
- **Snapshot contract** [public-api]
  - `app/actions/reservations.ts:493-499` — `FloorSnapshot.tableTotals`
  - `app/actions/reservations.ts:567-577` — staff gate; unauthorized empty includes `tableTotals: {}`
- **Privileged orders load + sum** [booking] [security]
  - `app/actions/reservations.ts:581-587` — service-role `from("orders")` column select, no date window
  - `app/actions/reservations.ts:589-602` — fail-open on query error; `Number(total)` then `sumOpenOrderTotalsByTableLabel`
- **5s hook overlay** [booking]
  - `hooks/use-floor-plan.ts:18,26-29` — `FLOOR_REFRESH_MS = 5000` still the SWR interval
  - `hooks/use-floor-plan.ts:32-39` — 4th overlay arg `data?.tableTotals ?? {}`

Reusable pattern: When a source-regex AC pins `from("table")` + columns and the spec states no date window, keep the column-only select, stamp `// minimality:`, and ledger the unbounded scan — do not invent a filter that would change production sums while the test still passes.

### C4

Suggested review order:
- **Chip overlay copy** [booking]
  - `components/staff/floor-plan.tsx:1058-1060` — `{t.label}` remains the heading
  - `components/staff/floor-plan.tsx:1065-1074` [booking] — gated guest + time; time on its own non-truncated line
  - `components/staff/floor-plan.tsx:1061-1063` — party slot still `t.reservation?.partySize ?? t.seats`
- **C4 source-regex contract**
  - `tests/unit/floor/schema.test.ts:211-245` — chip slice still requires `{t.reservation.time}` inside the button

Reusable pattern: Floor-chip source-regex (FP-4): keep `{t.reservation.time}` inside the dining-room `<button>` and behind `{t.reservation ? ( … ) : null}`; put time on its own non-truncated line so guest `truncate` cannot clip occupying time.

### C5

Suggested review order:
- **Seated bill gate** [booking]
  - `components/staff/floor-plan.tsx:1075` — `t.reservation?.status === "seated"` (not `displayStatus`)
  - `components/staff/floor-plan.tsx:1076-1078` [booking] — `CHF {(t.billTotal ?? 0).toFixed(2)}`
- **Chip identity chrome**
  - `components/staff/floor-plan.tsx:1058-1060` — `{t.label}` still the heading
  - `components/staff/floor-plan.tsx:1052-1057` — seated ping still `t.displayStatus === "seated"`

Reusable pattern: Floor-chip source-regex (FP-15): keep `t.reservation?.status === "seated"` plus inlined `CHF {(t.billTotal ?? 0).toFixed(2)}` as a sibling of `{t.reservation ? … }` so C4’s overlay strip still isolates guest/time.

## Suggested Review Order (collated)

Highest-risk first.

- **Money sum + snapshot** [booking] [security]
  - `lib/floor/table-bills.ts` — exclude only `cancelled`/`voided`; `completed` counts
  - `app/actions/reservations.ts:567-602` — staff gate, service-role `orders` select, `Number(total)`, `tableTotals` on snapshot
  - `lib/reservations/auto-assign.ts:307-356` — seated-only `billTotal` from the map
- **Live hook** [booking] [public-api]
  - `hooks/use-floor-plan.ts` — 5s SWR + 4th overlay arg `data?.tableTotals ?? {}`
- **Chip chrome** [booking]
  - `components/staff/floor-plan.tsx:1052-1079` — label heading, guest+time overlay, seated-gated `CHF` bill, ping stays on `displayStatus`

## Traceability (final)

Run: 2026-09-18 · plan: res-72_floor_chip_details_b676a1c2 · issue: RES-72

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-15 | tests/unit/floor/table-bills.test.ts::sums non-cancelled order totals by table_label and ignores cancelled or voided | lib/floor/table-bills.ts | P0 | shipped |
| C2 | scheduling.md FP-15 + FP-4 | tests/unit/reservations/auto-assign.test.ts::attaches billTotal only for seated overlays from the table totals map | lib/reservations/auto-assign.ts | P0 | shipped |
| C3 | scheduling.md FP-15 | tests/unit/floor/schema.test.ts::floor snapshot and live hook carry table bill totals on the 5s refresh | app/actions/reservations.ts, hooks/use-floor-plan.ts | P1 | shipped |
| C4 | scheduling.md FP-4 | tests/unit/floor/schema.test.ts::floor chip renders the assigned reservation time without hiding the table label | components/staff/floor-plan.tsx | P1 | shipped |
| C5 | scheduling.md FP-15 + FP-4 | tests/unit/floor/schema.test.ts::seated floor chip renders CHF bill total and reserved chips do not | components/staff/floor-plan.tsx | P1 | shipped |
| visual-density-on-busy-floor | scheduling.md FP-15 | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-09-18 → 2026-09-18 · plan: res-72_floor_chip_details_b676a1c2
Criteria: 5 shipped · 1 manual-uat · 6 total
Phases delegated: 15
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 24 left on ledger (below floor/cap) — cap 3/run

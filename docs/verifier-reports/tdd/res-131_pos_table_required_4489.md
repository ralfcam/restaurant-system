# TDD verifier report — RES-131 POS kitchen send requires a table (`res-131_pos_table_required_4489`)

FIX run. Linear: RES-131.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — server rejects a send with no matching table

Suggested review order: rejection before insert — `app/actions/operations.ts:1057` lookup then `app/actions/operations.ts:1062` [security] `errors.floor.tableNotFound` when no row; persist contract — `app/actions/operations.ts:1066` [booking] `table_id: table.id`
Reusable pattern: after a label lookup that must hit a persisted row, throw the catalog key before any insert and pass `row.id` with no `?? null`, leaving the existing query order intact so message-key queue scripts stay valid.

### C2 — Send disabled until a table is selected

Suggested review order: client no-op while no table is selected — `components/staff/pos-terminal.tsx:78` [security]; Send button disabled contract — `components/staff/pos-terminal.tsx:273` [public-api]; empty selection comes from `tables[0]?.label ?? ""` and `value={table || undefined}` — `components/staff/pos-terminal.tsx:36`, `components/staff/pos-terminal.tsx:157`
Reusable pattern: When a unit test slices both a JSX `disabled={…}` expression and the handler guard before `try` for the same tokens, keep those tokens inlined in each slice — a shared boolean drops them from one side and the source assertion goes blind.

## Suggested Review Order (collated)

- Server rejects a send with no persisted table before any insert [security] → `app/actions/operations.ts:1057` (tables lookup), `:1062` (`errors.floor.tableNotFound`)
- No null `table_id` is ever stored [booking] → `app/actions/operations.ts:1066` (`table_id: table.id`)
- Client send handler no-ops with no table [security] → `components/staff/pos-terminal.tsx:78`
- Send button disabled contract [public-api] → `components/staff/pos-terminal.tsx:273`
- Where an empty selection comes from → `components/staff/pos-terminal.tsx:36`, `:157`
- Spec amendment → `docs/specs/scheduling.md` FP-13 (item 34, final paragraph) and the FP-13 trace row

## Traceability (final)

Run: 2026-10-06 · plan: res-131_pos_table_required_4489 · issue: RES-131

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | scheduling.md FP-13 | tests/unit/floor/pos-table-picker.test.ts::createKitchenOrder rejects a kitchen send whose table matches no tables row | app/actions/operations.ts | P0 | shipped |
| C2 | scheduling.md FP-13 | tests/unit/floor/pos-table-picker.test.ts::Send stays disabled until a live table is selected | components/staff/pos-terminal.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-131_pos_table_required_4489
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor/cap) — cap 3/run

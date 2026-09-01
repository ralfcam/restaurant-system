# TDD verifier report — REAZED-316 POS table picker (`reazed-316_pos_table_picker_28440958`)

FIX run. Linear: [REAZED-316](https://linear.app/realized/issue/REAZED-316).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — FP-13 POS table picker is live floor inventory

Suggested review order:
- Live inventory fetch (Server Component) `[public-api]` — `app/pos/page.tsx:8`, `app/pos/page.tsx:10-11`, `app/pos/page.tsx:23`
- Staff action used as inventory source `[auth]` — `app/actions/operations.ts:237` (`getTables` → `requireStaffUser`; empty array if unauthenticated)
- Client picker contract — `components/staff/pos-terminal.tsx:30-34`, `components/staff/pos-terminal.tsx:37`
- Table `Select` options from prop `[booking]` — `components/staff/pos-terminal.tsx:143-154`

Reusable pattern: Live-inventory Server Component prop-drill for a client picker (`getTables()` → `page.tsx` → `PosTerminal`), proven by page-source-pin without a render harness

## Suggested Review Order (collated)

Highest-risk first. One criterion (FP-13); collated from the C1 Refactor section.

### 1. Live inventory fetch `[public-api]`

- `app/pos/page.tsx:8` — `dynamic = "force-dynamic"`
- `app/pos/page.tsx:10-11` — async `PosPage` + `await getTables()`
- `app/pos/page.tsx:23` — `<PosTerminal tables={tables} />`

### 2. Staff action used as inventory source `[auth]`

- `app/actions/operations.ts:237` — `getTables` → `requireStaffUser`; empty array if unauthenticated

### 3. Client picker contract

- `components/staff/pos-terminal.tsx:30-34` — `PosTerminalProps` (`tables: PersistedTable[]`)
- `components/staff/pos-terminal.tsx:37` — `useState(tables[0]?.label ?? "")`

### 4. Table `Select` options from prop `[booking]`

- `components/staff/pos-terminal.tsx:143-154` — `tables.map` into `SelectItem` (`row.id` / `row.label`)

## Traceability (final)

Run: 2026-09-01 · plan: reazed-316_pos_table_picker_28440958 · issue: REAZED-316

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 / FP-13 | scheduling.md FP-13 | tests/unit/floor/pos-table-picker.test.ts::POS table picker lists live getTables() tables, not the TABLES seed | app/pos/page.tsx, components/staff/pos-terminal.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-01 → 2026-09-01 · plan: reazed-316_pos_table_picker_28440958
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red / tdd-green / tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (below floor/cap) — cap 3/run

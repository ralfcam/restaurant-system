# TDD verifier report — REAZED-311/312 POS catalog + persistence (`reazed-311-312_pos-catalog-persistence_7c3f9a1d`)

FIX run. Linear: [REAZED-311](https://linear.app/realized/issue/REAZED-311), [REAZED-312](https://linear.app/realized/issue/REAZED-312).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### 312-C1 — Orders/order_items schema exists in baseline

Suggested review order:
- **schema persistence (AC-5)** [schema]
  - `supabase/migrations/00000000000000_baseline.sql:611` `CREATE TABLE IF NOT EXISTS orders`
  - `supabase/migrations/00000000000000_baseline.sql:626` `CREATE TABLE IF NOT EXISTS order_items`
- **ticket status CHECK** [booking]
  - `supabase/migrations/00000000000000_baseline.sql:620`
- **RLS + staff-only grants** [security] [public-api]
  - `supabase/migrations/00000000000000_baseline.sql:637` ENABLE RLS
  - `supabase/migrations/00000000000000_baseline.sql:640` authenticated FOR ALL on `orders`
  - `supabase/migrations/00000000000000_baseline.sql:668` table grants (no anon)
  - `supabase/migrations/00000000000000_baseline.sql:673` sequence grants
- **lock-in test**
  - `tests/unit/floor/schema.test.ts:133`

Reusable pattern: Staff-only POS tables copy `tables`/`servers` (IF NOT EXISTS + DROP POLICY IF EXISTS + authenticated/service_role FOR ALL + matching grants, no anon); BIGSERIAL also needs `GRANT USAGE, SELECT` on `{table}_{column}_seq` for authenticated.

### 312-C2 — Local reset persists orders/order_items

Suggested review order:
- persist contract matching `createKitchenOrder` insert · `tests/integration/pos/orders-persistence.integ.test.ts:23-50` · `[public-api]`
- nested KDS read matching `getActiveKitchenOrders` select · `tests/integration/pos/orders-persistence.integ.test.ts:52-70` · `[public-api]`
- probe teardown (id-only `afterEach`) · `tests/integration/pos/orders-persistence.integ.test.ts:13-18`
- cascade parent delete · `supabase/migrations/00000000000000_baseline.sql:626-628` · `[schema]`

Reusable pattern: Integration runs must export local `127.0.0.1` URL + anon + service_role from `npx supabase status` in the same shell — `vitest.integration.config.ts` does not load `.env.local` (which may be the linked remote).

### 311-C2 — createKitchenOrder rejects an 86'd line item

Suggested review order:
- Live catalog gate (reject whole order, no insert) `[security]`
  - `app/actions/operations.ts:945` — `requireStaffUser`
  - `app/actions/operations.ts:950` — unique `itemIds` + one `.in()` `[public-api]`
  - `app/actions/operations.ts:955` — `menuById`; throw `"Menu item is unavailable"` if missing or `available !== true`
- Persist only after catalog ok
  - `app/actions/operations.ts:974` — `tables` lookup
  - `app/actions/operations.ts:979` — `orders` insert
  - `app/actions/operations.ts:993` — `order_items` insert
- Test pin
  - `tests/unit/floor/pos-menu-availability.test.ts:98` — 86'd row → `/unavailable/i`; insert spies never called

Reusable pattern: POS send-to-kitchen re-check: unique line ids → one `menu_items` `.in()` of `id, name, price_value, available` → Map lookup → throw before any `orders`/`order_items` insert; do not fall back to the static seed.

### 311-C1 — POS picker sources live catalog, not the static seed

Suggested review order:
- Live catalog fetch (staff POS page) [public-api]
  - `app/pos/page.tsx:14` — `Promise.all` includes `getMenuItems()`
  - `app/pos/page.tsx:32` — `items={menuItems}` into `PosTerminal`
- Client picker/pricing from live rows [public-api]
  - `components/staff/pos-terminal.tsx:25` — `items: MenuItemRow[]`
  - `components/staff/pos-terminal.tsx:38` — `pickerItems` by `menu_id`
  - `components/staff/pos-terminal.tsx:60` — `priceOf` via `price_value`
  - `components/staff/pos-terminal.tsx:112` — picker render `name`/`price`
- Wiring contract
  - `tests/unit/floor/pos-menu-availability.test.ts:122`

Reusable pattern: Staff terminal live catalog = `Promise.all` fetch + pass as `items` prop; keep the static seed import banned by `\bMENU_ITEMS\b` while `MENUS`/`MenuId` stay for tabs.

## Suggested Review Order (collated)

Highest-risk first. Collated from 312-C1 / 312-C2 / 311-C2 / 311-C1 Refactor sections.

### 1. Persist contract after local reset `[public-api]` `[schema]` (312-C2, P0)

- `tests/integration/pos/orders-persistence.integ.test.ts:23-50` — insert shape matching `createKitchenOrder`
- `tests/integration/pos/orders-persistence.integ.test.ts:52-70` — nested KDS read matching `getActiveKitchenOrders`
- `tests/integration/pos/orders-persistence.integ.test.ts:13-18` — probe teardown
- `supabase/migrations/00000000000000_baseline.sql:626-628` — `order_items` CASCADE

### 2. Live catalog gate on send-to-kitchen `[security]` `[public-api]` (311-C2, P1)

- `app/actions/operations.ts:945` — `requireStaffUser`
- `app/actions/operations.ts:950` — unique `itemIds` + one `.in()`
- `app/actions/operations.ts:955` — throw `"Menu item is unavailable"` if missing or `available !== true`
- `app/actions/operations.ts:979` / `:993` — `orders` / `order_items` insert only after catalog ok
- `tests/unit/floor/pos-menu-availability.test.ts:98` — 86'd row; insert spies never called

### 3. Orders schema in baseline `[schema]` `[security]` (312-C1, P1)

- `supabase/migrations/00000000000000_baseline.sql:611` — `CREATE TABLE IF NOT EXISTS orders`
- `supabase/migrations/00000000000000_baseline.sql:626` — `CREATE TABLE IF NOT EXISTS order_items`
- `supabase/migrations/00000000000000_baseline.sql:620` — status CHECK
- `supabase/migrations/00000000000000_baseline.sql:637-673` — RLS + staff-only grants + sequence grants
- `tests/unit/floor/schema.test.ts:133` — lock-in test

### 4. POS picker from live catalog `[public-api]` (311-C1, P2)

- `app/pos/page.tsx:14` — `Promise.all` includes `getMenuItems()`
- `app/pos/page.tsx:32` — `items={menuItems}`
- `components/staff/pos-terminal.tsx:25` — `items: MenuItemRow[]`
- `components/staff/pos-terminal.tsx:38` / `:60` / `:112` — picker/pricing from prop
- `tests/unit/floor/pos-menu-availability.test.ts:122` — wiring contract

## Traceability (final)

Run: 2026-09-03 · plan: reazed-311-312_pos-catalog-persistence_7c3f9a1d · issue: REAZED-311, REAZED-312

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| 312-C1 | menu-availability.md AC-5 | tests/unit/floor/schema.test.ts::baseline persists orders and order_items for POS/KDS send-to-kitchen | supabase/migrations/00000000000000_baseline.sql | P1 | shipped |
| 312-C2 | menu-availability.md AC-5 | tests/integration/pos/orders-persistence.integ.test.ts::service-role can persist and query orders/order_items after a local reset (send-to-kitchen) | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| 311-C2 | menu-availability.md AC-4 | tests/unit/floor/pos-menu-availability.test.ts::createKitchenOrder rejects a line item that is 86'd in the live menu_items table | app/actions/operations.ts | P1 | shipped |
| 311-C1 | menu-availability.md AC-4 | tests/unit/floor/pos-menu-availability.test.ts::POS sources menu items from the live catalog, not the static MENU_ITEMS seed | app/pos/page.tsx, components/staff/pos-terminal.tsx | P2 | shipped |

## Run metrics

Run: 2026-09-03 → 2026-09-03 · plan: reazed-311-312_pos-catalog-persistence_7c3f9a1d
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 12 (tdd-red / tdd-green / tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 1 attached-to-existing · 19 left on ledger (below floor/cap) — cap 3/run


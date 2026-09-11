# Order flow (menu → POS → KDS)

**Status:** Reference  
**Last updated:** 2026-09-10

Summary — criteria in [../specs/menu-availability.md](../specs/menu-availability.md).

```mermaid
flowchart LR
  Menu[Guest menu] --> POS[POS terminal]
  POS --> Ticket[Order ticket]
  Ticket --> KDS[KDS board]
```

Components: `components/staff/pos-terminal.tsx`, `components/staff/kds-board.tsx`.
`/pos` (`app/pos/page.tsx`) loads `getTables()`, `getServers()`, and
`getMenuItems()` in one `Promise.all` and passes them into `PosTerminal`
(`tables` / `servers` / `items`); empty table/server lists disable the
Table/Server `Select` with a placeholder (`value={… || undefined}`).
POS picker lines come from live `menu_items` (`available = true`), not
`MENU_ITEMS`. `createKitchenOrder` re-checks unique line ids against
`menu_items` (`id, name, price_value, available`) and throws before any
`orders` / `order_items` insert. Tickets persist in those tables
(`00000000000000_baseline.sql`): service-role `FOR ALL` + `GRANT ALL` only;
`REVOKE ALL` from `PUBLIC`/`anon`/`authenticated`; no authenticated policy.
Sequence `orders_order_number_seq` is `REVOKE ALL` from
`PUBLIC`, `anon`, `authenticated`, and `service_role`, then
`GRANT USAGE, SELECT` to `service_role` only. Staff catalog list/CRUD/toggle
uses `requireStaffUser` + `createServiceClient`; guest `getMenuItems` stays
anon. Spec: [../specs/menu-availability.md](../specs/menu-availability.md) AC-2, AC-5.
KDS (`kds-board.tsx`) polls `getActiveKitchenOrders` every 5s — `orders` is
not in `supabase_realtime`.

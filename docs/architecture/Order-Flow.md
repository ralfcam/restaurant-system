# Order flow (menu → POS → KDS)

**Status:** Reference  
**Last updated:** 2026-09-03

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
(`00000000000000_baseline.sql`); KDS (`kds-board.tsx`) polls
`getActiveKitchenOrders` every 5s — `orders` is not in `supabase_realtime`.

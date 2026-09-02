# Order flow (menu → POS → KDS)

**Status:** Reference  
**Last updated:** 2026-09-02

Summary — criteria in [../specs/menu-availability.md](../specs/menu-availability.md).

```mermaid
flowchart LR
  Menu[Guest menu] --> POS[POS terminal]
  POS --> Ticket[Order ticket]
  Ticket --> KDS[KDS board]
```

Components: `components/staff/pos-terminal.tsx`, `components/staff/kds-board.tsx`.
`/pos` (`app/pos/page.tsx`) loads `getTables()` and `getServers()` in one
`Promise.all` and passes them into `PosTerminal`; empty lists disable the
Table/Server `Select` with a placeholder (`value={… || undefined}`).
Stores: `lib/order-store.ts`, `lib/menu-store.ts`.

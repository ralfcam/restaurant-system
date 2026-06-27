# Order flow (menu → POS → KDS)

**Status:** Reference  
**Last updated:** 2026-06-27

Summary — criteria in [../specs/menu-availability.md](../specs/menu-availability.md).

```mermaid
flowchart LR
  Menu[Guest menu] --> POS[POS terminal]
  POS --> Ticket[Order ticket]
  Ticket --> KDS[KDS board]
```

Components: `components/staff/pos-terminal.tsx`, `components/staff/kds-board.tsx`.
Stores: `lib/order-store.ts`, `lib/menu-store.ts`.

# Menu availability

**Status:** Draft  
**Last updated:** 2026-06-27

## Scope

Guest menu (`app/[locale]/menu`), staff menu manager (`app/admin/menu`), POS (`app/pos`),
KDS (`app/kds`). Server actions in `app/actions/menu.ts`; stores in
`lib/menu-store.ts`, `lib/order-store.ts`.

## Acceptance criteria

_(Expand during first `/sdd-to-tdd` run.)_

1. **86'd items** — Items marked unavailable are hidden from the guest menu and
   cannot be ordered from the guest path.
2. **Staff toggle** — Staff can mark items available/unavailable; change persists
   in Supabase `menu_items` (seeded from `supabase/seed.sql`; staff writes via
   `app/actions/menu.ts`).
3. **POS/KDS** — Order tickets reflect line items and status transitions
   (`new` → `preparing` → `ready`).

## References

- [../architecture/Order-Flow.md](../architecture/Order-Flow.md)
- `menu_items` table in `supabase/migrations/00000000000000_baseline.sql`; catalog rows
  in `supabase/seed.sql` (120 items)
- `lib/data.ts` (remaining MVP mocks for POS/KDS tickets)

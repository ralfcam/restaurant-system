# Menu availability

**Status:** Draft  
**Last updated:** 2026-09-03

## Scope

Guest menu (`app/[locale]/menu`), staff menu manager (`app/admin/menu`), POS (`app/pos`),
KDS (`app/kds`). Server actions in `app/actions/menu.ts` and kitchen tickets in
`app/actions/operations.ts` (`orders` / `order_items`).

## Acceptance criteria

_(Expand during first `/sdd-to-tdd` run.)_

1. **86'd items** — Items marked unavailable are hidden from the guest menu and
   cannot be ordered from the guest path.
2. **Staff toggle** — Staff can mark items available/unavailable; change persists
   in Supabase `menu_items` (seeded from `supabase/seed.sql`; staff writes via
   `app/actions/menu.ts`). Table privileges MUST
   `GRANT ALL ON TABLE menu_items TO service_role` in
   `00000000000000_baseline.sql` and
   `20260825140000_operating_windows_privilege.sql` (scheduling.md §17). Guest
   menu reads (`getMenuItems`, `getHomepageChefsPicks`) use the anon client.
   Table privileges MUST `GRANT SELECT ON TABLE menu_items TO anon, authenticated`
   and
   `REVOKE INSERT, UPDATE, DELETE ON TABLE menu_items FROM anon, authenticated`
   in the same three files as scheduling.md §18. Public SELECT RLS stays.
   Authenticated `FOR ALL` stays (REAZED-299).
3. **POS/KDS** — Order tickets reflect line items and status transitions
   (`new` → `preparing` → `ready`).
4. **POS live catalog** — The POS terminal (`/pos`) sources menu items from the
   live `menu_items` table (`available = true`), not the static
   `lib/data.ts`/`lib/menu-catalog.ts` `MENU_ITEMS` seed. When staff toggle an
   item unavailable in `/admin/menu`, it disappears from the POS picker without
   a server restart. `createKitchenOrder` re-validates every submitted line
   against the live `menu_items` table and rejects the whole order if any line's
   item is unavailable or does not exist there, even if the client sent a stale
   cart.
5. **Orders schema persistence** — `orders` and `order_items` exist as real
   tables in `supabase/migrations/00000000000000_baseline.sql` (RLS enabled,
   `authenticated` FOR ALL + `service_role` FOR ALL policies, matching table
   grants — the same convention as `tables`/`servers`/`status_events`), so
   `npx supabase db reset --local` provisions them and `createKitchenOrder` /
   `getActiveKitchenOrders` / `updateKitchenOrderStatus` durably persist and
   query kitchen tickets across a local reset.

## Implementation trace (non-normative)

| Criterion             | Shipped in                                                                                                                                                                                                                                                                                                                                                                                                                                 | Tests                                                                                                                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-2 PUBLIC-READ-PRIV | `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` on `menu_items` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql`                                                                                                                                                                             | `tests/integration/reservations/public-privileges.integ.test.ts` → "anon can SELECT menu_items and cannot INSERT"                                                                                                                                                    |
| AC-4 POS live catalog | `/pos` (`app/pos/page.tsx`) `Promise.all` includes `getMenuItems()` and `<PosTerminal items={menuItems} />`; `PosTerminal` takes `items: MenuItemRow[]` (no `\bMENU_ITEMS\b`; `MENUS` / `MenuId` remain for tabs). `createKitchenOrder` unique line ids → one `menu_items` `.in()` of `id, name, price_value, available` → Map lookup → throw before any `orders` / `order_items` insert (`app/actions/operations.ts`).                    | `tests/unit/floor/pos-menu-availability.test.ts` → "POS sources menu items from the live catalog, not the static MENU_ITEMS seed"; "createKitchenOrder rejects a line item that is 86'd in the live menu_items table"                                                |
| AC-5 orders schema    | `CREATE TABLE IF NOT EXISTS orders` / `order_items` in `supabase/migrations/00000000000000_baseline.sql` (RLS; `DROP POLICY IF EXISTS` + authenticated / `service_role` `FOR ALL`; `GRANT SELECT, INSERT, UPDATE, DELETE` to authenticated; `GRANT ALL` to `service_role`; no anon). `GRANT USAGE, SELECT ON SEQUENCE orders_order_number_seq TO authenticated`. Not in `supabase_realtime` — KDS polls `getActiveKitchenOrders` every 5s. | `tests/unit/floor/schema.test.ts` → "baseline persists orders and order_items for POS/KDS send-to-kitchen"; `tests/integration/pos/orders-persistence.integ.test.ts` → "service-role can persist and query orders/order_items after a local reset (send-to-kitchen)" |

## References

- [../architecture/Order-Flow.md](../architecture/Order-Flow.md)
- `menu_items` table in `supabase/migrations/00000000000000_baseline.sql`; catalog rows
  in `supabase/seed.sql` (120 items)
- Kitchen tickets: `orders` / `order_items` in `supabase/migrations/00000000000000_baseline.sql` (not `supabase_realtime`)

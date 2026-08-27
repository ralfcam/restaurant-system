# Menu availability

**Status:** Draft  
**Last updated:** 2026-08-27

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

## Implementation trace (non-normative)

| Criterion             | Shipped in                                                                                                                                                                                                                                                     | Tests                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| AC-2 PUBLIC-READ-PRIV | `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` on `menu_items` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql` | `tests/integration/reservations/public-privileges.integ.test.ts` → "anon can SELECT menu_items and cannot INSERT" |

## References

- [../architecture/Order-Flow.md](../architecture/Order-Flow.md)
- `menu_items` table in `supabase/migrations/00000000000000_baseline.sql`; catalog rows
  in `supabase/seed.sql` (120 items)
- `lib/data.ts` (remaining MVP mocks for POS/KDS tickets)

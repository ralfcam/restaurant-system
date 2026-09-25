# Menu availability

**Status:** Draft  
**Last updated:** 2026-09-23

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
   Table privileges MUST `REVOKE ALL ON TABLE menu_items FROM PUBLIC, anon, authenticated`
   and then
   `GRANT SELECT ON TABLE menu_items TO anon, authenticated`
   in the same three files as scheduling.md §18. Public SELECT RLS stays.
   There MUST NOT be an authenticated write (or `FOR ALL`) RLS policy on
   `menu_items`. All staff list, CRUD, and toggle actions (`getAllMenuItems`,
   `upsertMenuItem`, `createMenuItem`, `deleteMenuItem`,
   `toggleMenuItemAvailability`) MUST use `requireStaffUser` plus
   `createServiceClient`.
3. **POS/KDS** — Order tickets reflect line items and status transitions
   (`new` → `preparing` → `ready`).
4. **POS live catalog** — The POS terminal (`/pos`) sources menu items from the
   live `menu_items` table (`available = true`), not the static
   `lib/data.ts`/`lib/menu-catalog.ts` `MENU_ITEMS` seed. When staff toggle an
   item unavailable in `/admin/menu`, it disappears from the POS picker without
   a server restart. `createKitchenOrder` re-validates every submitted line
   against the live `menu_items` table and rejects the whole order if any line's
   item is unavailable or does not exist there, even if the client sent a stale
   cart. POS picker tabs may remain on compiled `MENUS` / `MenuId` for this
   revision; admin and guest tab catalogs are the live `menus` table (MT-1–MT-9).
5. **Orders schema persistence** — `orders` and `order_items` exist as real
   tables in `supabase/migrations/00000000000000_baseline.sql` (RLS enabled;
   service-role `FOR ALL` policy and `GRANT ALL TO service_role` only). They
   MUST grant no table privilege to `PUBLIC`, `anon`, or `authenticated` and
   MUST have no RLS policy for those roles. Sequence `orders_order_number_seq`
   is also service-role-only (`REVOKE ALL` from `PUBLIC`, `anon`, and
   `authenticated`; `GRANT USAGE, SELECT` to `service_role` only). So
   `npx supabase db reset --local` provisions them and `createKitchenOrder` /
   `getActiveKitchenOrders` / `updateKitchenOrderStatus` durably persist and
   query kitchen tickets across a local reset via `requireStaffUser` plus
   `createServiceClient`.
6. **ORD-ISO — Mutating POS order integration is local-only.** Mutating
   automated coverage under `tests/integration/pos/*.integ.test.ts`
   (service-role `orders` / `order_items` insert and cleanup delete) MUST
   run only against **local** Supabase (`NEXT_PUBLIC_SUPABASE_URL` host
   `127.0.0.1`, `localhost`, or `[::1]`). It MUST fail closed — not skip —
   when the URL is the shared linked project `tilcqrudqxznnpepxjqq` (or
   any other non-local host). Use `authEnvReady` /
   `RESTAURANT_INTEGRATION_STRICT` **plus**
   `assertIsolatedHoursMutationTarget()` from
   `lib/scheduling/hours-mutation-target.ts` (same helper as booking-rules
   RES-ISO / scheduling.md §15). Call it as the **first statement** of
   `beforeAll` and of every cleanup hook that writes (`afterEach` /
   `afterAll`). The call MUST be zero-argument. Add `beforeAll` when the
   suite has none so the pin runs before the first `it()` write. Do not
   put the guard in `createServiceClient`. A new file matching that glob
   MUST include the same pin.
7. **MT-1 Staff-managed tab writes** — Staff create, rename, and reorder of
   menu tabs (`createMenuTab`, `renameMenuTab`, `reorderMenuTabs`, and staff
   `getMenuTabs`) MUST use `requireStaffUser` plus `createServiceClient`.
   Guest/public tab reads (`getPublicMenuTabs`) use the anon client. There
   MUST NOT be an authenticated write (or `FOR ALL`) RLS policy on `menus`.
8. **MT-2 Stable tab identity** — Each tab has a stable `id` distinct from
   its display `title` / `title_en`. Rename changes titles only. Reorder
   changes `sort_order` only. Existing `menu_items.menu_id` values continue
   to equal that tab `id` after rename or reorder.
9. **MT-3 Create persists** — `createMenuTab` inserts a row into `menus`. A
   subsequent staff or public list (a new read from the store, not compiled
   `lib/menu-catalog.ts` `MENUS`) includes the new tab. Seed MUST include the
   five current ids (`midi`, `soir`, `boissons`, `blanc`, `rouge`) so existing
   dishes stay associated.
10. **MT-4 menus PUBLIC-READ-PRIV** — Table `menus` exists in
    `00000000000000_baseline.sql` (and the same privilege companions as
    scheduling.md §18 / `menu_items`). RLS enabled. `REVOKE ALL ON TABLE menus
FROM PUBLIC, anon, authenticated` then
    `GRANT SELECT ON TABLE menus TO anon, authenticated` and
    `GRANT ALL ON TABLE menus TO service_role`. Public SELECT RLS stays. No
    authenticated write/`FOR ALL` policy.
11. **MT-5 Rename persists** — After `renameMenuTab`, a new read returns the
    new `title` / `title_en` for that `id`.
12. **MT-6 Reorder persists** — After `reorderMenuTabs`, a new read returns
    tabs in the saved `sort_order`.
13. **MT-7 Dish assignment lists live tabs** — Creating or editing a dish on
    `/admin/menu` offers every row from the live `menus` catalog (including
    tabs created after deploy), not only compiled `MENU_IDS`.
14. **MT-8 Guest configured names** — Guest `app/[locale]/menu` tab labels
    come from live `menus.title` / `title_en` (locale), not compiled `MENUS`
    titles.
15. **MT-9 Guest saved order** — Guest `app/[locale]/menu` lists tabs in
    saved `sort_order`, including tabs with zero dishes.
16. **MT-6a Atomic reorder** — `reorderMenuTabs` MUST apply the new
    `sort_order` mapping as one staff/service-role operation (one RPC or one
    statement). A failure MUST NOT persist a prefix of the new order. Tab
    `id` values stay unchanged (MT-2).
17. **MT-4a Forward `menus` bootstrap** — Every migration that `GRANT`s or
    `REVOKE`s on `menus` MUST `CREATE TABLE IF NOT EXISTS menus` with the same
    columns as baseline (`id`, `title`, `title_en`, `sort_order`) before those
    privilege statements. Hosted databases that already applied an older
    companion MUST still receive that bootstrap via a new dated forward
    migration (applied files do not re-run).
18. **MT-4b Strict integ fail-closed** — Mutating coverage under
    `tests/integration/menu/*.integ.test.ts` MUST run with
    `RESTAURANT_INTEGRATION_STRICT=true`. When that flag is set and auth env
    is missing, the integration harness MUST throw (not skip).
    `tests/integration/setup.ts` is the fail-closed gate;
    `vitest.integration.config.ts` MUST include the menus privilege file.
    The unit pin's `globSync` containment check MUST normalize each hit's `\\`
    to `/` before comparing it to
    `tests/integration/menu/menus-privileges.integ.test.ts`, so a Windows
    `globSync` result is the same hit as a Linux one. The pin MUST keep the
    live `globSync(include)` call.
19. **MT-4c Hosted `menus` RLS + seed** — The dated forward that still
    applies on already-recorded hosts
    (`20260915180000_menus_bootstrap.sql`) MUST `ENABLE ROW LEVEL SECURITY`
    on `menus`, create `"Allow public read menus"` and
    `"Allow service_role full access to menus"` (same names as baseline),
    and idempotently insert the five MT-3 seed ids (`midi`, `soir`,
    `boissons`, `blanc`, `rouge`) with `ON CONFLICT (id) DO NOTHING`. Every
    other migration that `CREATE TABLE IF NOT EXISTS menus` MUST also
    enable RLS and create those two policies before its `GRANT`/`REVOKE` on
    `menus`. Privilege GRANT alone is not enough for a remote that will not
    re-run `seed.sql`.
20. **MT-4d Integration config sets STRICT** —
    `vitest.integration.config.ts` (the config that includes
    `tests/integration/menu/menus-privileges.integ.test.ts`) MUST set
    `RESTAURANT_INTEGRATION_STRICT` to `true` so a bare
    `pnpm test:integration` cannot `skipIf`-skip that suite when auth env
    is missing. `tests/integration/setup.ts` remains the throw gate
    (MT-4b). Do not add a second throw in the integ file.
21. **MT-4e Companion five-id seed** — Every migration that
    `CREATE TABLE IF NOT EXISTS menus` MUST idempotently insert the five
    MT-3 seed ids (`midi`, `soir`, `boissons`, `blanc`, `rouge`) with
    `ON CONFLICT (id) DO NOTHING`. Dated-forward seed (MT-4c) is not
    enough when an operator replays a privilege companion without
    `seed.sql`.

## Implementation trace (non-normative)

| Criterion                       | Shipped in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Tests                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-2 PUBLIC-READ-PRIV           | `REVOKE ALL` then `GRANT SELECT` on `menu_items`; no authenticated write policy; staff list/CRUD/toggle is `requireStaffUser` + `createServiceClient` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql`; `app/actions/menu.ts`                                                                                                                  | `tests/integration/reservations/public-privileges.integ.test.ts` → "guest roles can SELECT menu_items only and no authenticated full-access policy remains"; `tests/unit/menu/catalog-service-client.test.ts`                                                                                                                       |
| AC-4 POS live catalog           | `/pos` (`app/pos/page.tsx`) `Promise.all` includes `getMenuItems()` and `<PosTerminal items={menuItems} />`; `PosTerminal` takes `items: MenuItemRow[]` (no `\bMENU_ITEMS\b`; `MENUS` / `MenuId` remain for POS picker tabs). `createKitchenOrder` unique line ids → one `menu_items` `.in()` of `id, name, price_value, available` → Map lookup → throw before any `orders` / `order_items` insert (`app/actions/operations.ts`).                                                          | `tests/unit/floor/pos-menu-availability.test.ts` → "POS sources menu items from the live catalog, not the static MENU_ITEMS seed"; "createKitchenOrder rejects a line item that is 86'd in the live menu_items table"                                                                                                               |
| AC-5 orders schema              | `CREATE TABLE IF NOT EXISTS orders` / `order_items` in `supabase/migrations/00000000000000_baseline.sql` (RLS; service-role `FOR ALL` + `GRANT ALL` only; `REVOKE ALL` from `PUBLIC`/`anon`/`authenticated`; no authenticated policy). Sequence `orders_order_number_seq` is service-role-only. Not in `supabase_realtime` — KDS polls `getActiveKitchenOrders` every 5s.                                                                                                                   | `tests/unit/floor/schema.test.ts` → "baseline persists orders and order_items for POS/KDS send-to-kitchen"; `tests/integration/security/sibling-privileges.integ.test.ts`; `tests/integration/pos/orders-persistence.integ.test.ts` → "service-role can persist and query orders/order_items after a local reset (send-to-kitchen)" |
| ORD-ISO                         | `assertIsolatedHoursMutationTarget()` (zero-arg) at start of `beforeAll` and write-cleanup hooks in every `tests/integration/pos/*.integ.test.ts`. Same helper as booking-rules RES-ISO.                                                                                                                                                                                                                                                                                                    | `tests/unit/pos/orders-persistence-isolation.test.ts`                                                                                                                                                                                                                                                                               |
| MT-1 Staff tab writes           | `getMenuTabs` / `createMenuTab` / `renameMenuTab` are `requireStaffUser` + `createServiceClient` + `.from("menus")`; `reorderMenuTabs` is the same gate then `.rpc("reorder_menu_tabs", { p_ordered_ids })`; `getPublicMenuTabs` is `createAnonClient` — `app/actions/menu.ts`. No authenticated write/`FOR ALL` on `menus`.                                                                                                                                                                | `tests/unit/menu/catalog-service-client.test.ts` → "staff menu tab mutations use createServiceClient after requireStaffUser"                                                                                                                                                                                                        |
| MT-2 Stable identity            | `renameMenuTab` `.update({ title, title_en }).eq("id", id)`; `reorderMenuTabs` `.rpc("reorder_menu_tabs", { p_ordered_ids })` (`UPDATE public.menus` `sort_order` only) — `app/actions/menu.ts`. Existing `menu_items.menu_id` stays the tab `id`.                                                                                                                                                                                                                                          | `tests/unit/menu/menu-tab-identity.test.ts` → "rename and reorder keep menu item menu_id"                                                                                                                                                                                                                                           |
| MT-3 Create persists            | `createMenuTab` inserts `{ id: crypto.randomUUID(), title, title_en }`; later `getMenuTabs` is `from("menus").select("id, title, title_en, sort_order")` (empty on error, not compiled `MENUS`). Seed ids `midi`, `soir`, `boissons`, `blanc`, `rouge` — `supabase/seed.sql`.                                                                                                                                                                                                               | `tests/unit/menu/menu-tab-persistence.test.ts` → "created menu tab is returned by a subsequent list from menus"                                                                                                                                                                                                                     |
| MT-4 menus PUBLIC-READ-PRIV     | `CREATE TABLE menus` (`id`, `title`, `title_en`, `sort_order`) in `00000000000000_baseline.sql`; RLS; `"Allow public read menus"`; `DROP POLICY IF EXISTS "Allow authenticated full access to menus"` (no `CREATE`); `REVOKE ALL` then `GRANT SELECT` + `GRANT ALL TO service_role`. Companions `CREATE TABLE IF NOT EXISTS menus` before the same DROP + REVOKE/GRANT trio (MT-4a).                                                                                                        | `tests/integration/menu/menus-privileges.integ.test.ts` → "guest roles can SELECT menus only and no authenticated full-access policy remains"                                                                                                                                                                                       |
| MT-5 Rename persists            | After `renameMenuTab`, a new `getMenuTabs` read returns the new `title` / `title_en` for that `id`.                                                                                                                                                                                                                                                                                                                                                                                         | `tests/unit/menu/menu-tab-persistence.test.ts` → "renamed menu tab title is returned by a subsequent list from menus"                                                                                                                                                                                                               |
| MT-6 Reorder persists           | After `reorderMenuTabs` (one `reorder_menu_tabs` RPC), a new read returns tabs in saved `sort_order` (PostgREST `.order("sort_order")` plus in-action JS sort).                                                                                                                                                                                                                                                                                                                             | `tests/unit/menu/menu-tab-persistence.test.ts` → "reordered menu tabs are returned in saved sort_order"                                                                                                                                                                                                                             |
| MT-7 Dish live tabs             | `getDishMenuTabOptions` aliases `getMenuTabs`; `/admin/menu` `Promise.all`s it and passes `{ id, title }[]` as `menuTabOptions`; `MenuManager` `menuTabOptions.map` (not compiled `MENUS`). Filter chips / list labels / section CMS stay compiled `MENUS`.                                                                                                                                                                                                                                 | `tests/unit/menu/dish-menu-tab-options.test.ts` → "dish menu options include newly created live tabs"                                                                                                                                                                                                                               |
| MT-8 Guest names                | `/[locale]/menu` `Promise.all`s `getMenuItems()` + `getPublicMenuTabs()`; `MenuBrowser` labels from live `title` / `title_en` (not compiled `MENUS`). Footer notes still compiled `MENUS`.                                                                                                                                                                                                                                                                                                  | `tests/unit/menu/guest-menu-tabs.test.ts` → "guest menu tabs use live titles not compiled MENUS"                                                                                                                                                                                                                                    |
| MT-9 Guest order                | Guest chrome maps every `getPublicMenuTabs` row in that reader's `sort_order` — empty tabs stay visible (`menus.map`, no empty-tab filter).                                                                                                                                                                                                                                                                                                                                                 | `tests/unit/menu/guest-menu-tabs.test.ts` → "guest menu tabs follow saved sort_order including empty tabs"                                                                                                                                                                                                                          |
| MT-6a Atomic reorder            | `requireStaffUser` + `createServiceClient().rpc("reorder_menu_tabs", { p_ordered_ids })` into `plpgsql` `SET search_path = ''`, qualified `UPDATE public.menus … FROM jsonb_array_elements_text(…) WITH ORDINALITY`; `REVOKE ALL` from PUBLIC/anon/authenticated; `GRANT EXECUTE` to `service_role` only; not SECURITY DEFINER. Same body in `00000000000000_baseline.sql` and `20260915180000_menus_bootstrap.sql`.                                                                        | `tests/unit/menu/menu-tab-persistence.test.ts` → "reorder menu tabs applies sort_order in one operation"                                                                                                                                                                                                                            |
| MT-4a Forward menus bootstrap   | Every file that `GRANT`s/`REVOKE`s on `menus` has `CREATE TABLE IF NOT EXISTS menus` (`id`, `title`, `title_en`, `sort_order`) before those privilege statements: `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`, `20260827160000_public_catalog_privileges.sql`. Dated `20260915180000_menus_bootstrap.sql` repeats CREATE + RLS + public-read / service_role policies + privilege trio + `reorder_menu_tabs` + `NOTIFY pgrst` for already-applied hosts. | `tests/unit/menu/menus-bootstrap.test.ts` → "menus privilege migrations create the table before granting"                                                                                                                                                                                                                           |
| MT-4b Strict integ fail-closed  | PRE-SATISFIED pin of existing `tests/integration/setup.ts` throw when `integrationStrict && !authEnvReady`; `vitest.integration.config.ts` `include` + `setupFiles`; `globSync(include)` hits are separator-normalized (`\\` → `/`) before the containment check for `tests/integration/menu/menus-privileges.integ.test.ts`; the live `globSync(include)` call stays. `describe.skipIf(!authEnvReady)` left in place — no second throw.                                                    | `tests/unit/menu/menus-integ-strict.test.ts` → "menus privilege integ is covered by STRICT fail-closed setup"                                                                                                                                                                                                                       |
| MT-4c Hosted menus RLS + seed   | Dated `20260915180000_menus_bootstrap.sql` `ENABLE ROW LEVEL SECURITY` + `"Allow public read menus"` + `"Allow service_role full access to menus"` + `INSERT … ON CONFLICT (id) DO NOTHING` of `midi`, `soir`, `boissons`, `blanc`, `rouge`. Companions `20260825140000_operating_windows_privilege.sql` and `20260827160000_public_catalog_privileges.sql` copy ENABLE RLS + those two named policies onto `CREATE TABLE IF NOT EXISTS menus` before GRANT.                                | `tests/unit/menu/menus-bootstrap.test.ts` → "hosted menus bootstrap enables RLS and seeds the five tab ids"                                                                                                                                                                                                                         |
| MT-4d Integration config STRICT | `vitest.integration.config.ts` `test.env.RESTAURANT_INTEGRATION_STRICT` is `"true"`. Throw remains in `tests/integration/setup.ts` (MT-4b). No second throw in the integ file.                                                                                                                                                                                                                                                                                                              | `tests/unit/menu/menus-integ-strict.test.ts` → "integration config sets STRICT so menus privilege integ cannot skip-green"                                                                                                                                                                                                          |
| MT-4e Companion five-id seed    | Every `CREATE TABLE IF NOT EXISTS menus` file inserts `midi`, `soir`, `boissons`, `blanc`, `rouge` with `ON CONFLICT (id) DO NOTHING` after that file's menus GRANT/REVOKE trio: `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`, `20260827160000_public_catalog_privileges.sql`, `20260915180000_menus_bootstrap.sql`.                                                                                                                                     | `tests/unit/menu/menus-bootstrap.test.ts` → "every CREATE menus migration seeds the five tab ids"                                                                                                                                                                                                                                   |

## References

- [../architecture/Order-Flow.md](../architecture/Order-Flow.md)
- `menus` table in `supabase/migrations/00000000000000_baseline.sql` (PUBLIC-READ-PRIV;
  same recipe as `menu_items`; five-id `INSERT … ON CONFLICT (id) DO NOTHING` after
  GRANT/REVOKE, same as companions `20260825140000` / `20260827160000`); dated forward
  `supabase/migrations/20260915180000_menus_bootstrap.sql` (RLS + five-id
  `INSERT … ON CONFLICT (id) DO NOTHING`); seed ids `midi`, `soir`, `boissons`, `blanc`,
  `rouge` in `supabase/seed.sql` (local reset)
- `menu_items` table in `supabase/migrations/00000000000000_baseline.sql`; catalog rows
  in `supabase/seed.sql` (120 items)
- Kitchen tickets: `orders` / `order_items` in `supabase/migrations/00000000000000_baseline.sql` (not `supabase_realtime`)

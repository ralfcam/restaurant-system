# TDD log: res-70_admin_menu_tabs_c3a91f2b

### C1

Suggested review order:
- authz guard [auth] `app/actions/menu.ts:283-289` (`getMenuTabs`)
- authz guard [auth] `app/actions/menu.ts:292-298` (`createMenuTab`)
- authz guard [auth] `app/actions/menu.ts:301-312` (`renameMenuTab`)
- authz guard [auth] `app/actions/menu.ts:314-321` (`reorderMenuTabs`)
- service-role boundary [security] `lib/supabase/require-staff.ts:23-28` then `lib/supabase/service.ts:10-23`
- reserved persist signatures `app/actions/menu.ts:292`, `301-304`, `314`

Reusable pattern: Staff catalog stubs: `requireStaffUser` → `const supabase = createServiceClient()` → `from("<table>")`; reserved later-criterion args must be referenced (`void arg`) because eslint-config-next unused-vars has no `argsIgnorePattern` and CI is `--max-warnings 0`.

### C2

Suggested review order:
- stable tab identity [schema] `app/actions/menu.ts:301-310` (`renameMenuTab` patches `title`/`title_en` only, `.eq("id", id)`)
- stable tab identity [schema] `app/actions/menu.ts:312-322` (`reorderMenuTabs` patches `sort_order` only per existing id)
- authz guard [auth] `app/actions/menu.ts:306-307` and `314-315` (`requireStaffUser` before any write)
- service-role boundary [security] `app/actions/menu.ts:308-309` and `316-319` (`createServiceClient` + `.from("menus")` only)

Reusable pattern: Catalog identity mutations: `.update({ displayOrOrderCols })` keyed by existing `.eq("id", id)` — never put `id` in the patch and never touch the child FK table.

### C3

Suggested review order:
- persist write [public-api] `app/actions/menu.ts:309-313` (`createMenuTab` insert: generated `id` + titles)
- persist read [public-api] `app/actions/menu.ts:288-295` (`getMenuTabs` new `from("menus")` select; empty on error, not `MENUS`)
- authz guard [auth] `app/actions/menu.ts:284-285` and `305-306` (`requireStaffUser` before any client)
- service-role boundary [security] `app/actions/menu.ts:287` and `308`

Reusable pattern: Staff catalog persist is insert-with-app-generated `id` plus a later `from("menus").select("id, title, title_en")` — never fall back to compiled `MENUS` on read error.

### C4

Suggested review order:
- privilege contract [security] `supabase/migrations/00000000000000_baseline.sql:166-187` (RLS on; public SELECT; DROP auth FOR ALL; REVOKE then GRANT SELECT; GRANT ALL service_role)
- privilege companions [security] `supabase/migrations/20260825140000_operating_windows_privilege.sql:44-49`
- privilege companions [security] `supabase/migrations/20260827160000_public_catalog_privileges.sql:34-39`
- catalog table [schema] `supabase/migrations/00000000000000_baseline.sql:159-164`
- seed five ids [schema] `supabase/seed.sql:206-213`

Reusable pattern: New PUBLIC-READ-PRIV catalog table: define in baseline (RLS public SELECT + service FOR ALL + REVOKE ALL then GRANT SELECT / GRANT ALL service_role) and copy the same DROP-auth-FOR-ALL + REVOKE/GRANT trio into both privilege companions (keep DROP, never CREATE).

### C5

Suggested review order:
- persist write [public-api] `app/actions/menu.ts:319-327` (`renameMenuTab` patches `title`/`title_en` only, `.eq("id", id)`)
- persist read [public-api] `app/actions/menu.ts:283-295` (`getMenuTabs` new `from("menus").select("id, title, title_en")`)
- authz guard [auth] `app/actions/menu.ts:323-324` (`requireStaffUser` before any client)
- service-role boundary [security] `app/actions/menu.ts:326-327`

Reusable pattern: Pre-satisfied persist AC: when an earlier write+list pair already makes the later persist `it` pass, treat Red as PRE-SATISFIED and skip a Green delta — do not invent a second persist path.

### C6

Suggested review order:
- persist write [public-api] `app/actions/menu.ts:334-343` (`reorderMenuTabs` patches `sort_order` by array index, id unchanged)
- persist read [public-api] `app/actions/menu.ts:288-299` (`getMenuTabs` selects `sort_order`, `.order("sort_order")`, JS sort overlay)
- authz guard [auth] `app/actions/menu.ts:284-285` and `335-336` (`requireStaffUser` before list/reorder)
- service-role boundary [security] `app/actions/menu.ts:287` and `338`

Reusable pattern: Persistence thenables that ignore `.order()` need an in-action JS sort *plus* PostgREST `.order()` for the live path — do not “fix” the mock in Refactor (tests are frozen).

### C7

Suggested review order:
- live options contract [public-api] `app/actions/menu.ts:302-305` (`getDishMenuTabOptions` → `getMenuTabs`)
- page wiring [public-api] `app/admin/menu/page.tsx:14-18,31` (`Promise.all` + `menuTabOptions` prop)
- Select consume [public-api] `components/staff/menu-manager.tsx:543-546` (`menuTabOptions.map`, not `MENUS`)
- type boundary [schema] `components/staff/menu-manager.tsx:57` (`Draft.menu_id: string`) and `:196` (`as MenuId` at save)
- auth inherited [auth] `app/actions/menu.ts:284-285` (`requireStaffUser` inside `getMenuTabs`)

Reusable pattern: Live catalog Select: page `Promise.all`s a dedicated options action (even if it aliases the staff list) and passes `{ id, title }[]` into the client Select — keep compiled `MENUS` out of the options map.

### C8

Suggested review order:
- live guest reader [public-api] `app/actions/menu.ts:307-322` (`getPublicMenuTabs`)
- anon SELECT boundary [security] `app/actions/menu.ts:3` + `:309-313` (`createAnonClient` → `.from("menus")`)
- page wiring [public-api] `app/[locale]/menu/page.tsx:34-37,71` (`Promise.all` + `menus` prop)
- chrome labels [public-api] `components/site/menu-browser.tsx:68-82` (`title` / `title_en`, not compiled `MENUS`)

Reusable pattern: Guest live catalog: page `Promise.all`s items + a dedicated anon reader and passes `{ id, title, title_en }[]` into client tab chrome — keep compiled `MENUS` out of the label map.

### C9

Suggested review order:
- persist read [public-api] `app/actions/menu.ts:308-320` (`getPublicMenuTabs` `.order("sort_order")` + JS sort)
- chrome order [public-api] `components/site/menu-browser.tsx:62-77` (`menus.map` with no empty-tab filter)
- page wiring [public-api] `app/[locale]/menu/page.tsx:34-37,71` (`Promise.all` + `menus` prop)

Reusable pattern: Guest tab order is the public reader's `sort_order` plus chrome that maps every returned row — do not hide empty tabs with `populatedMenus` / `filter`/`some`.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from the last Refactor close-out of each criterion.

- **[security] [schema]** `menus` PUBLIC-READ-PRIV — `supabase/migrations/00000000000000_baseline.sql:166-187` (RLS on; public SELECT; DROP auth FOR ALL; REVOKE then GRANT SELECT; GRANT ALL service_role); companions `supabase/migrations/20260825140000_operating_windows_privilege.sql:44-49` and `supabase/migrations/20260827160000_public_catalog_privileges.sql:34-39`; seed five ids `supabase/seed.sql:206-213`
- **[auth] [security]** Staff tab I/O is `requireStaffUser` then `createServiceClient` — `app/actions/menu.ts:283-287` (`getMenuTabs`); `:331-335` (`createMenuTab`); `:349-353` (`renameMenuTab`); `:356-360` (`reorderMenuTabs`)
- **[security]** Guest/public tabs use anon SELECT only — `app/actions/menu.ts:308-313` (`getPublicMenuTabs` → `createAnonClient` → `.from("menus")`)
- **[schema]** Stable tab identity — `app/actions/menu.ts:345-353` (`renameMenuTab` patches `title`/`title_en` only, `.eq("id", id)`); `:356-365` (`reorderMenuTabs` patches `sort_order` only per existing id)
- **[public-api]** Create + list persist — `app/actions/menu.ts:324-342` (`createMenuTab` insert generated `id` + titles); `:288-299` (`getMenuTabs` `from("menus")` select + `.order("sort_order")` + JS sort)
- **[public-api]** Reorder persist — `app/actions/menu.ts:356-365` (index → `sort_order`); list same as above
- **[public-api]** Dish create/edit live options — `app/actions/menu.ts:302-305` (`getDishMenuTabOptions`); `app/admin/menu/page.tsx:14-18,31`; `components/staff/menu-manager.tsx:543-546` (`menuTabOptions.map`, not `MENUS`)
- **[public-api]** Guest labels + saved order including empty tabs — `app/[locale]/menu/page.tsx:34-37,71`; `components/site/menu-browser.tsx:62-77` (`title`/`title_en`, `menus.map` unfiltered)

## Traceability (final)

Run: 2026-09-15 · plan: res-70_admin_menu_tabs_c3a91f2b · issue: RES-70

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-1 | tests/unit/menu/catalog-service-client.test.ts::staff menu tab mutations use createServiceClient after requireStaffUser | app/actions/menu.ts | P0 | shipped |
| C2 | menu-availability.md MT-2 | tests/unit/menu/menu-tab-identity.test.ts::rename and reorder keep menu item menu_id | app/actions/menu.ts | P0 | shipped |
| C3 | menu-availability.md MT-3 | tests/unit/menu/menu-tab-persistence.test.ts::created menu tab is returned by a subsequent list from menus | app/actions/menu.ts | P1 | shipped |
| C4 | menu-availability.md MT-4 | tests/integration/menu/menus-privileges.integ.test.ts::guest roles can SELECT menus only and no authenticated full-access policy remains | supabase/migrations/00000000000000_baseline.sql, supabase/migrations/20260825140000_operating_windows_privilege.sql, supabase/migrations/20260827160000_public_catalog_privileges.sql, supabase/seed.sql | P0 | shipped |
| C5 | menu-availability.md MT-5 | tests/unit/menu/menu-tab-persistence.test.ts::renamed menu tab title is returned by a subsequent list from menus | app/actions/menu.ts | P1 | shipped |
| C6 | menu-availability.md MT-6 | tests/unit/menu/menu-tab-persistence.test.ts::reordered menu tabs are returned in saved sort_order | app/actions/menu.ts | P1 | shipped |
| C7 | menu-availability.md MT-7 | tests/unit/menu/dish-menu-tab-options.test.ts::dish menu options include newly created live tabs | app/actions/menu.ts, app/admin/menu/page.tsx, components/staff/menu-manager.tsx | P1 | shipped |
| C8 | menu-availability.md MT-8 | tests/unit/menu/guest-menu-tabs.test.ts::guest menu tabs use live titles not compiled MENUS | app/actions/menu.ts, app/[locale]/menu/page.tsx, components/site/menu-browser.tsx | P1 | shipped |
| C9 | menu-availability.md MT-9 | tests/unit/menu/guest-menu-tabs.test.ts::guest menu tabs follow saved sort_order including empty tabs | app/actions/menu.ts, components/site/menu-browser.tsx | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-15 → 2026-09-15 · plan: res-70_admin_menu_tabs_c3a91f2b
Criteria: 9 shipped · 0 manual-uat · 9 total
Phases delegated: 27 tdd-red/green/refactor Task calls
Back-loops: C7: 1 extra Green (Select wiring after helper-only first Green)
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 40 left on ledger (3 pending confirmation / 37 below floor) — cap 3/run

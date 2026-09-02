# TDD verifier report — ux_staffchrome_pos_batch_9c4a1b

FIX run ×6. Linear: [REAZED-334](https://linear.app/realized/issue/REAZED-334), [REAZED-333](https://linear.app/realized/issue/REAZED-333), [REAZED-332](https://linear.app/realized/issue/REAZED-332), [REAZED-331](https://linear.app/realized/issue/REAZED-331), [REAZED-329](https://linear.app/realized/issue/REAZED-329), [REAZED-330](https://linear.app/realized/issue/REAZED-330).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C334-1 — nav-text-contrast helper

Suggested review order:
- SC-4a contrast predicate contract [public-api]
  - `lib/site-chrome.ts:21` JSDoc (light text iff unscrolled ∧ dark page)
  - `lib/site-chrome.ts:26` `shouldUseLightNavText(isScrolled, overDarkBackground)`
  - `lib/site-chrome.ts:30` `return !isScrolled && overDarkBackground`
- Four-cell unit pin (unchanged)
  - `tests/unit/site-chrome.test.ts:25` `describe("shouldUseLightNavText")`
  - `tests/unit/site-chrome.test.ts:27` unscrolled + light page → false
  - `tests/unit/site-chrome.test.ts:31` unscrolled + dark page → true
  - `tests/unit/site-chrome.test.ts:35` scrolled → false for both backgrounds

Reusable pattern: Document a two-boolean chrome predicate with a spec-id JSDoc that names both inputs and the scrolled-always-dark override, and keep call-site defaults (`overDarkBackground = true`) out of the helper.

### C334-2 — SiteHeader consumes overDarkBackground

Suggested review order:
- Contrast contract `[public-api]` — `lib/site-chrome.ts:26` `shouldUseLightNavText`; `components/site/site-header.tsx:21` `overDarkBackground = true`; `components/site/site-header.tsx:28` wiring
- Homepage wiring `[public-api]` — `app/[locale]/page.tsx:32` `hasHero`; `app/[locale]/page.tsx:37` `overDarkBackground={hasHero}`
- Menu default (unchanged) — `app/[locale]/menu/page.tsx:38` `<SiteHeader />`
- Class collapse — `components/site/site-header.tsx:29` `navTextClass`; `components/site/site-header.tsx:30` `mutedNavTextClass`
- Five SC-4a surfaces — `components/site/site-header.tsx:61` logo; `components/site/site-header.tsx:77` Menu link; `components/site/site-header.tsx:92` LanguageSwitcher className; `components/site/site-header.tsx:100` Staff login; `components/site/site-header.tsx:121` mobile trigger
- Intentionally untouched — `components/site/site-header.tsx:89` LanguageSwitcher `variant`

Reusable pattern: Collapse repeated SC-4a light/dark class ternaries into two local consts derived from `shouldUseLightNavText` (`navTextClass` / `mutedNavTextClass`) so all nav surfaces stay in lockstep without duplicating the pairs.

### C333-1 — two-column hero/reservation layout at md+

Suggested review order:
- Two-column contract (HP-1) [public-api]
  - `app/[locale]/page.tsx:58` — `grid gap-10 md:grid-cols-2 md:gap-12` (stack below `md`, two cols from `md`)
  - `app/[locale]/page.tsx:59` — copy column (`hero.tagline` / `hero.headline`)
  - `app/[locale]/page.tsx:110` — `id="reserve"` column [booking]
  - `app/[locale]/page.tsx:153` — `ReservationWidget`
- Header chrome (must stay)
  - `app/[locale]/page.tsx:37` — `<SiteHeader overDarkBackground={hasHero} />`
- Guard (source-level, assertions unchanged)
  - `tests/unit/site/homepage-layout.test.ts:30` — `isTwoColumnAtMd`
  - `tests/unit/site/homepage-layout.test.ts:39` — HP-1 it-block

Reusable pattern: For a responsive two-column split, `grid … md:grid-cols-2` already stacks below `md`; do not also add `md:grid`.

### C332-1 — branding editors disable for staff-only

Suggested review order:
- SA-10 chrome flag (server compute → required prop) [auth]
  - `app/admin/settings/page.tsx:18` `getAuthUser`
  - `app/admin/settings/page.tsx:25` StaffShell `isSuperAdmin={isSuperAdminUser(authUser)}`
  - `app/admin/settings/page.tsx:39` [public-api] `RestaurantLogoEditor isSuperAdmin={isSuperAdminUser(authUser)}`
  - `app/admin/settings/page.tsx:53-54` [public-api] `RestaurantHeroImageEditor` same expression
- Mutation controls disabled (not hidden); Choose `disabled` before `onClick` [auth]
  - `components/staff/restaurant-logo-editor.tsx:36-41` required prop
  - `components/staff/restaurant-logo-editor.tsx:148` file input
  - `components/staff/restaurant-logo-editor.tsx:155-156` Choose (order)
  - `components/staff/restaurant-logo-editor.tsx:181` Remove
  - `components/staff/restaurant-logo-editor.tsx:194` Save
  - `components/staff/restaurant-hero-image-editor.tsx:36-39` required prop
  - `components/staff/restaurant-hero-image-editor.tsx:150` file input
  - `components/staff/restaurant-hero-image-editor.tsx:157-158` Choose (order)
  - `components/staff/restaurant-hero-image-editor.tsx:180` Remove
  - `components/staff/restaurant-hero-image-editor.tsx:193` Save
- Sidebar threading [auth]
  - `components/staff/staff-shell.tsx:226-239` StaffShell → SidebarContent
  - `components/staff/staff-shell.tsx:255` mobile sheet
  - `components/staff/sidebar-logo-manager.tsx:22-25` required prop
  - `components/staff/sidebar-logo-manager.tsx:60-62` editor pass-through
- POS/KDS `getAuthUser` pass-through
  - `app/pos/page.tsx:13-19` `Promise.all` + `isSuperAdmin`
  - `app/kds/page.tsx:9-18` `dynamic` + `getAuthUser`
- Source-regex contract
  - `tests/unit/branding/super-admin-chrome.test.ts:27-40` tag-local `disabled` + `!isSuperAdmin`
  - `tests/unit/branding/super-admin-chrome.test.ts:55-59` settings page inline expressions

Reusable pattern: SA-10 chrome tests pin source shape — keep Choose `disabled` before `onClick`, and keep editor JSX as `isSuperAdmin={isSuperAdminUser(authUser)}` (do not hoist a local boolean on the settings page).

### C332-2 — contact-info fields disable for staff-only

Suggested review order:
- Prop contract (required `isSuperAdmin`) — `components/staff/scheduling-manager.tsx:109-120`
- Server → client flag [auth] — `app/admin/scheduling/page.tsx:26-46`
- Handler early-return [auth] — `components/staff/scheduling-manager.tsx:226-228`
- Address/phone `disabled={!isSuperAdmin}` [auth] — `components/staff/scheduling-manager.tsx:351-368`
- Save contact `|| !isSuperAdmin` [auth] — `components/staff/scheduling-manager.tsx:373-379`
- Hours stay ungated — `components/staff/scheduling-manager.tsx:556-564`
- Source-regex test — `tests/unit/scheduling/super-admin-chrome.test.ts:33-61`

Reusable pattern: SA-10 chrome: required `isSuperAdmin` prop + keep `!isSuperAdmin` inside the `disabled={…}` source (regex tests) + `if (!isSuperAdmin) return` at the mutation handler; do not extract a helper that hides the flag from `disabled`.

### C332-3 — occupancy/safety-buffer controls disable for staff-only

Suggested review order:
- SA-10 chrome flag plumbing — `app/admin/floor/page.tsx:39` [auth] `isSuperAdmin={isSuperAdminUser(authUser)}`; `components/staff/floor-plan.tsx:211` / `:218` required `isSuperAdmin` on `FloorPlan`
- Occupancy / safety steppers gated, slot-interval not — `components/staff/floor-plan.tsx:748-770` slot-interval Buttons (no `disabled={!isSuperAdmin}`); `components/staff/floor-plan.tsx:784-793` [auth] occupancy `disabled={!isSuperAdmin}`; `components/staff/floor-plan.tsx:808-817` [auth] safety-buffer `disabled={!isSuperAdmin}`
- Shared stepper composition — `components/staff/floor-plan.tsx:152-171` `disabled = false`; `:179` / `:196` `disabled ||` min/max

Reusable pattern: Gate SA-10 chrome on a shared stepper via an optional `disabled = false` prop at the call site so min/max bounds still apply, and omit the prop (or leave Buttons ungated) on surfaces the spec carves out (slot-interval).

### C332-4 — review-email form disables for staff-only

Suggested review order:
- pass-through from Server Component [auth]: `app/admin/marketing/page.tsx:3` · `app/admin/marketing/page.tsx:18-24` · `app/admin/marketing/page.tsx:35` [auth]
- form contract: `app/admin/marketing/review-email-settings-form.tsx:14-18`
- chrome disable (staff locked) [security]: `review-email-settings-form.tsx:58` · `:71` · `:82` · `:98` · `:102`

Reusable pattern: SA-10 source-regex requires `!isSuperAdmin` (or `isSuperAdmin === false`) **inside each** `disabled={…}` and `isSuperAdmin={isSuperAdminUser(authUser)}` **on the JSX**; do not hoist a local boolean on the page or form.

### BC-2 (amended) — hero upload/remove named as super-admin-only writes

Spec-only correction. No Red/Green/Refactor. Pre-existing coverage:

Suggested review order:
- BC-2 named writes — `docs/specs/branding-cms.md` BC-2 (`uploadRestaurantHeroImage`, `removeRestaurantHeroImage`)
- Pre-existing server gate [auth] — `app/actions/branding.ts` `requireSuperAdminUser` on hero upload/remove
- Pre-existing tests — `tests/unit/branding/actions.test.ts` "rejects unauthenticated callers" / "rejects staff-only callers" under `uploadRestaurantHeroImage` and `removeRestaurantHeroImage`

Reusable pattern: none (spec-only)

### C329-1 — servers table + seed (FP-14)

Suggested review order:
- Schema contract `[schema]` `supabase/migrations/00000000000000_baseline.sql:481` (`CREATE TABLE IF NOT EXISTS servers`)
- RLS + table privileges `[security]` `…/00000000000000_baseline.sql:490` (`ENABLE ROW LEVEL SECURITY`)
- `[security]` `…/00000000000000_baseline.sql:492` (authenticated `FOR ALL`)
- `[security]` `…/00000000000000_baseline.sql:499` (`service_role` `FOR ALL`)
- `[security]` `…/00000000000000_baseline.sql:506` (`GRANT` authenticated DML + `GRANT ALL` `service_role`)
- Seed inventory `supabase/seed.sql:191` (Maya/Jon/Priya/Dev, `WHERE NOT EXISTS`)
- File pin `tests/unit/scheduling/schema.test.ts:123`

Reusable pattern: Fold new inventory into baseline right after the sibling `tables` GRANT block; `-- REAZED-###` tag; seed with the same `INSERT … SELECT VALUES … WHERE NOT EXISTS` shape as `tables`.

### C329-2 — `getServers()` staff inventory

Suggested review order:
- Staff gate `[auth]`: `app/actions/operations.ts:284` (`getServers` → `requireStaffUser` → `[]` without `from`)
- Query contract: `app/actions/operations.ts:288` (`servers` / `id, name` / `order("name")`)
- Map shape: `app/actions/operations.ts:48` (`PersistedServer`) and `app/actions/operations.ts:297` (`String(id/name)`)
- Fail-soft log `[public-api]`: `app/actions/operations.ts:293` (log then `[]`; same empty as unauth/empty table)
- Unit pin: `tests/unit/floor/get-servers.test.ts`

Reusable pattern: Staff-gated list actions that fail-soft to `[]` should log `[operations] <fn>:` on query error so empty inventory and query failure stay distinguishable in logs, without changing the return type.

### C329-3 — PosTerminal sources servers live

Suggested review order:
- Live server inventory wiring [public-api]
  - `app/pos/page.tsx:12` — `Promise.all` includes `getServers()`
  - `app/pos/page.tsx:30` — `<PosTerminal tables={tables} servers={servers} />`
  - `app/actions/operations.ts:284` — staff-gated `getServers()`
- Client picker contract
  - `components/staff/pos-terminal.tsx:30` — `servers: PersistedServer[]`
  - `components/staff/pos-terminal.tsx:39` — `useState(servers[0]?.name ?? "")`
  - `components/staff/pos-terminal.tsx:158` — Server `Select` maps `servers`
- Seed removal — `lib/data.ts` — `SERVERS` export gone
- Auth chrome left in place [auth]
  - `app/pos/page.tsx:23` — inline `isSuperAdmin={isSuperAdminUser(authUser)}`

Reusable pattern: POS pickers (tables, servers) should be source-text contract tests plus a live `getX()` fetch in the same `Promise.all` as sibling floor reads, then drop the `lib/data.ts` seed only after a workspace-wide import check.

### C329-4 — empty-servers guard

Suggested review order:
- empty server inventory UX `[public-api]`
  - `components/staff/pos-terminal.tsx:39` initial `server` from `servers[0]?.name ?? ""`
  - `components/staff/pos-terminal.tsx:160-166` `value={server || undefined}` + `disabled={servers.length === 0}` + placeholder
  - `components/staff/pos-terminal.tsx:145-147` Table Select left without empty-guard (C330-1)
- send path (confirm out of scope)
  - `components/staff/pos-terminal.tsx:252-255` kitchen button still cart/sending only
- pin `tests/unit/floor/pos-server-picker.test.ts:27`

Reusable pattern: controlled Base UI Select needs `value={x || undefined}` (not `""`) for `SelectValue` placeholder to appear when inventory is empty.

### C330-1 — empty-tables guard (FP-13 extended)

Suggested review order:
- Empty-inventory UX (Table Select matches Server) — `components/staff/pos-terminal.tsx:145` `[public-api]`
- Literal disable + placeholder — `components/staff/pos-terminal.tsx:148`
- Placeholder copy — `components/staff/pos-terminal.tsx:151`
- Sibling Server pattern — `components/staff/pos-terminal.tsx:165`
- Unchanged fire path — `components/staff/pos-terminal.tsx:74`
- Pin `tests/unit/floor/pos-table-picker.test.ts:31`

Reusable pattern: Base UI/shadcn `Select` only shows `SelectValue` placeholder when `value` is `undefined`, not `""`; pair `value={field || undefined}` with `disabled={items.length === 0}`.

## Suggested Review Order (collated)

Highest-risk first. Grouped by concern. Line numbers drift; follow symbols.

### 1. SA-10 staff chrome gating `[auth]` `[security]`

Disable (do not hide) every SA-8 super_admin-only control for staff-only sessions. Keep `isSuperAdmin={isSuperAdminUser(authUser)}` **inline on JSX**.

- Branding editors — `app/admin/settings/page.tsx:39` / `:53-54`; `components/staff/restaurant-logo-editor.tsx:148` / `:155-156` / `:181` / `:194`; `restaurant-hero-image-editor.tsx` same pattern
- Sidebar logo threading — `components/staff/staff-shell.tsx:226-239`; `sidebar-logo-manager.tsx:22-25`
- POS/KDS pass-through — `app/pos/page.tsx:23`; `app/kds/page.tsx`
- Scheduling contact-info — `components/staff/scheduling-manager.tsx:226-228` handler early-return; `:351-368` address/phone; `:373-379` save; hours stay ungated `:556-564`
- Floor occupancy/safety (slot-interval **ungated** per this cycle's carve-out) — `components/staff/floor-plan.tsx:748-770` slot-interval; `:784-793` occupancy; `:808-817` safety-buffer
- Review-email form — `app/admin/marketing/page.tsx:35`; `review-email-settings-form.tsx:58` / `:71` / `:82` / `:98` / `:102`

### 2. `servers` schema / RLS `[schema]` `[security]`

- `CREATE TABLE IF NOT EXISTS servers` — `supabase/migrations/00000000000000_baseline.sql:481`
- RLS enable + authenticated `FOR ALL` — `:490` / `:492`
- `service_role` `FOR ALL` + GRANTs — `:499` / `:506`
- Seed Maya/Jon/Priya/Dev — `supabase/seed.sql:191`
- Pin — `tests/unit/scheduling/schema.test.ts:123`

### 3. `getServers()` staff inventory `[auth]` `[public-api]`

- Staff gate → `[]` without `from` — `app/actions/operations.ts:284`
- `from("servers").select("id, name").order("name")` — `:288`
- `PersistedServer` map + fail-soft log — `:48` / `:293` / `:297`
- Pin — `tests/unit/floor/get-servers.test.ts`

### 4. POS live pickers + empty-inventory UX `[public-api]`

- Page fetch — `app/pos/page.tsx:12` `Promise.all` `getTables` / `getServers` / `getAuthUser`; `:30` both props
- Server picker — `components/staff/pos-terminal.tsx:30` / `:39` / `:160-166` (`value={server || undefined}`, `disabled={servers.length === 0}`, placeholder)
- Table picker — `components/staff/pos-terminal.tsx:145-151` (`value={table || undefined}`, `disabled={tables.length === 0}`, placeholder)
- Fire path left cart-only — `components/staff/pos-terminal.tsx:74` / `:252-255`

### 5. Cosmetic / layout `[public-api]`

- SC-4a helper — `lib/site-chrome.ts:26` `shouldUseLightNavText`
- Homepage wiring — `app/[locale]/page.tsx:37` `overDarkBackground={hasHero}`
- Five nav surfaces — `components/site/site-header.tsx:61` / `:77` / `:92` / `:100` / `:121`
- HP-1 two-column — `app/[locale]/page.tsx:58` `grid … md:grid-cols-2`; `:110` `id="reserve"`

### 6. Spec-only correction (no code)

- BC-2 named writes — `docs/specs/branding-cms.md` (`uploadRestaurantHeroImage`, `removeRestaurantHeroImage`); pre-existing `tests/unit/branding/actions.test.ts`

## Traceability (final)

Run: 2026-09-02 · plan: ux_staffchrome_pos_batch_9c4a1b · issue: REAZED-334, REAZED-333, REAZED-332, REAZED-331, REAZED-329, REAZED-330

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C334-1 | site-chrome.md SC-4a | tests/unit/site-chrome.test.ts::shouldUseLightNavText (four-cell truth table) | lib/site-chrome.ts | P1 | shipped |
| C334-2 | site-chrome.md SC-4a | tests/unit/site-header.test.ts::unscrolled homepage without a hero image renders dark nav text, not white-on-white | components/site/site-header.tsx, app/[locale]/page.tsx | P1 | shipped |
| C333-1 | homepage.md HP-1 | tests/unit/site/homepage-layout.test.ts::homepage hero and reservation widget use a two-column layout at md and up | app/[locale]/page.tsx | P2 | shipped |
| C332-1 | staff-authorization.md SA-10 | tests/unit/branding/super-admin-chrome.test.ts::logo and hero editors disable mutation controls for staff-only sessions | components/staff/restaurant-logo-editor.tsx, components/staff/restaurant-hero-image-editor.tsx, app/admin/settings/page.tsx | P1 | shipped |
| C332-2 | staff-authorization.md SA-10 | tests/unit/scheduling/super-admin-chrome.test.ts::restaurant contact-info fields disable for staff-only sessions | components/staff/scheduling-manager.tsx, app/admin/scheduling/page.tsx | P1 | shipped |
| C332-3 | staff-authorization.md SA-10 | tests/unit/floor/super-admin-chrome.test.ts::occupancy duration and safety buffer controls disable for staff-only sessions | components/staff/floor-plan.tsx, app/admin/floor/page.tsx | P1 | shipped |
| C332-4 | staff-authorization.md SA-10 | tests/unit/marketing/super-admin-chrome.test.ts::review email settings form disables for staff-only sessions | app/admin/marketing/review-email-settings-form.tsx, app/admin/marketing/page.tsx | P1 | shipped |
| BC-2 (amended) | branding-cms.md BC-2 | tests/unit/branding/actions.test.ts::rejects unauthenticated / staff-only callers (uploadRestaurantHeroImage, removeRestaurantHeroImage) | app/actions/branding.ts (unchanged) | P1 | shipped |
| C329-1 | scheduling.md FP-14 | tests/unit/scheduling/schema.test.ts::servers table exists in baseline with staff/service_role access and is seeded | supabase/migrations/00000000000000_baseline.sql, supabase/seed.sql | P2 | shipped |
| C329-2 | scheduling.md FP-14 | tests/unit/floor/get-servers.test.ts::getServers staff gate and name order | app/actions/operations.ts | P2 | shipped |
| C329-3 | scheduling.md FP-14 | tests/unit/floor/pos-server-picker.test.ts::POS server picker lists live getServers() servers, not the SERVERS seed | components/staff/pos-terminal.tsx, app/pos/page.tsx, lib/data.ts | P2 | shipped |
| C329-4 | scheduling.md FP-14 | tests/unit/floor/pos-server-picker.test.ts::server select disables with a placeholder when no servers are available | components/staff/pos-terminal.tsx | P2 | shipped |
| C330-1 | scheduling.md FP-13 (extended) | tests/unit/floor/pos-table-picker.test.ts::table select disables with a placeholder when no tables are available | components/staff/pos-terminal.tsx | P2 | shipped |

## Run metrics

Run: 2026-09-02 → 2026-09-02 · plan: ux_staffchrome_pos_batch_9c4a1b
Criteria: 12 automatable shipped · 1 spec-only (BC-2) · 0 manual-uat · 13 total
Phases delegated: 36 (tdd-red / tdd-green / tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 1 attached-to-existing · 48 left on ledger (below floor/cap) — cap 3/run

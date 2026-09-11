# TDD verifier report — RES-42 sibling privilege lock (`res-42_sibling_privilege_lock_6f2a8c1d`)

FIX run. Linear: [RES-42](https://linear.app/realized/issue/RES-42/restaurant-system-sibling-authenticated-for-all-on-blocked-dates).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### RES42-C1 — Staff menu catalog access is server-mediated

Suggested review order:
- staff gate then service client `[auth]` `[security]` — `app/actions/menu.ts:161-165` `getAllMenuItems`; `app/actions/menu.ts:182-188` `upsertMenuItem`; `app/actions/menu.ts:218-224` `createMenuItem`; `app/actions/menu.ts:245-249` `deleteMenuItem`; `app/actions/menu.ts:261-268` `toggleMenuItemAvailability`
- guest catalog stays anon `[public-api]` — `app/actions/menu.ts:78-80` `getMenuItems`; `app/actions/menu.ts:98-102` `getHomepageChefsPicks`
- staff settings write `[auth]` — `app/actions/menu.ts:138-144` `setChefsPicksEnabled`
- import boundary `[security]` — `app/actions/menu.ts:1-5` (cookie `createClient` removed; service + anon only)

Reusable pattern: Staff Data API unit tests should mock both `@/lib/supabase/server` (cookie JWT) and `@/lib/supabase/service`, assert the service client is used after a staff result and the cookie client is never constructed, then repeat with a null staff result and assert neither client nor `.from` runs.

### RES42-C2 — Reservation range reads are server-mediated

Suggested review order:
- staff gate then service client `[auth]` `[security]` — `app/actions/reservations.ts:584-587`
- import boundary `[security]` — `app/actions/reservations.ts:1-4` (cookie `createClient` gone; service + `requireStaffUser` only)
- range query contract `[booking]` — `app/actions/reservations.ts:589-596` (`select *`, date/time order, optional `gte`/`lte`)
- fail-open return shape `[public-api]` — `app/actions/reservations.ts:585` and `:600-605` (unauthorized/query error → `[]`)

Reusable pattern: Staff Data API unit tests should mock both `@/lib/supabase/server` (cookie JWT) and `@/lib/supabase/service`, assert the service client is used after a staff result and the cookie client is never constructed, then repeat with a null staff result and assert neither client nor `.from` runs.

### RES42-C3 — Reservations remain guest-insert-only without authenticated full access

Suggested review order:
- Guest insert-only ACL/RLS contract `[security]` `[public-api]`
  - `supabase/migrations/00000000000000_baseline.sql:114` — public INSERT policy kept
  - `supabase/migrations/00000000000000_baseline.sql:122` — public SELECT dropped, not recreated
  - `supabase/migrations/00000000000000_baseline.sql:124` `[security]` — authenticated FOR ALL dropped, not recreated
  - `supabase/migrations/00000000000000_baseline.sql:127` — service_role FOR ALL kept
  - `supabase/migrations/00000000000000_baseline.sql:134` `[security]` — `REVOKE ALL` then `GRANT INSERT` then `GRANT ALL` service_role
- Forward owners (same sequence; no new dated file) `[schema]`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:24`
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:12`
- Regression proof
  - `tests/integration/reservations/public-privileges.integ.test.ts:80` — anon INSERT, anon SELECT denied, service-role read, per-owner `REVOKE`/`GRANT INSERT`/no recreated auth policy

Reusable pattern: After `REVOKE ALL … FROM PUBLIC, anon, authenticated`, re-grant only the public capability then `GRANT ALL TO service_role`; keep `DROP POLICY IF EXISTS` for retired policies and never `CREATE` them; assert that order in every object-owning migration, not only the latest forward file.

### RES42-C4 — Blocked dates remain public-read-only without authenticated full access

Suggested review order:
- Guest SELECT-only ACL/RLS contract `[security]` `[public-api]`
  - `supabase/migrations/00000000000000_baseline.sql:56` — public SELECT policy kept
  - `supabase/migrations/00000000000000_baseline.sql:65` `[security]` — authenticated FOR ALL dropped, not recreated
  - `supabase/migrations/00000000000000_baseline.sql:68` — service_role FOR ALL kept
  - `supabase/migrations/00000000000000_baseline.sql:76` `[security]` — `REVOKE ALL` then `GRANT SELECT` then `GRANT ALL` service_role
- Forward owners (same sequence; no new dated file) `[schema]`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:31`
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:21`
- Staff write path already service-mediated `[auth]`
  - `app/actions/availability.ts:217` `requireStaffUser`; `:230` `createServiceClient`
- Regression proof
  - `tests/integration/reservations/public-privileges.integ.test.ts:164` — anon SELECT, anon INSERT denied, per-owner `REVOKE`/`GRANT SELECT`/no recreated auth policy

Reusable pattern: After `REVOKE ALL … FROM PUBLIC, anon, authenticated`, re-grant only the public capability (`GRANT SELECT` here) then `GRANT ALL TO service_role`; keep `DROP POLICY IF EXISTS` for the retired authenticated FOR ALL policy and never `CREATE` it; assert that order in every object-owning migration, not only the latest forward file.

### RES42-C5 — Menu items remain public-read-only and staff writes stay functional

Suggested review order:
- Public catalog ACL [public-api] [security] — `supabase/migrations/00000000000000_baseline.sql:177`
- Drop authenticated `FOR ALL` (no recreate) [security] — `supabase/migrations/00000000000000_baseline.sql:185`
- `REVOKE ALL` then `GRANT SELECT` / `GRANT ALL` service_role [security] — `supabase/migrations/00000000000000_baseline.sql:195`
- Forward-file idempotence (same menu block) — `supabase/migrations/20260827160000_public_catalog_privileges.sql:25`
- Duplicate early GRANT removed; remaining GRANT ALL in PRIV block — `supabase/migrations/20260825140000_operating_windows_privilege.sql:35`
- Staff writes still service-mediated [auth] — `app/actions/menu.ts:161`
- Regression pin — `tests/integration/reservations/public-privileges.integ.test.ts:236`; `tests/unit/menu/catalog-service-client.test.ts`

Reusable pattern: Put `GRANT ALL … TO service_role` in the same REVOKE/GRANT capability block as the public role lock; do not pre-GRANT ALL earlier in a forward privilege file.

### RES42-C6 — Server inventory is service-role-only in canonical schema

Suggested review order:
- Drop/no-create authenticated `FOR ALL` `[security]` — `supabase/migrations/00000000000000_baseline.sql:503-504`
- `REVOKE ALL` then `GRANT ALL` service_role `[security]` — `supabase/migrations/00000000000000_baseline.sql:513-515`
- Keep RLS + service-role `FOR ALL` — `supabase/migrations/00000000000000_baseline.sql:501-511`
- Seed names stay (Maya/Jon/Priya/Dev) — `supabase/seed.sql` (FP-14 insert)
- Staff read path already `requireStaffUser` + `createServiceClient` `[auth]` — `app/actions/operations.ts:284-288`
- Regression pin — `tests/unit/scheduling/schema.test.ts:124-158`; `tests/unit/floor/get-servers.test.ts`

Reusable pattern: Private sibling tables: `DROP POLICY IF EXISTS` the authenticated `FOR ALL` and never `CREATE` it; `REVOKE ALL ON TABLE <t> FROM PUBLIC, anon, authenticated`; then only `GRANT ALL TO service_role` plus a service-role `FOR ALL` policy. Pin drop-without-recreate with `indexOf(CREATE…, dropIdx) === -1`.

### RES42-C7 — Complete sibling RLS/ACL matrix is least-privilege after reset

Suggested review order:
- [security] Private floor/POS ACL (drop authenticated policy, never recreate; `REVOKE ALL` then `GRANT ALL` to `service_role` only) — `supabase/migrations/00000000000000_baseline.sql:475`
- [security] Servers same recipe — `supabase/migrations/00000000000000_baseline.sql:500`
- Merges / members — `supabase/migrations/00000000000000_baseline.sql:538`
- `status_events` — `supabase/migrations/00000000000000_baseline.sql:586`
- [schema] Orders/items + sequence (`REVOKE ALL` including `service_role`, then `GRANT USAGE, SELECT`) — `supabase/migrations/00000000000000_baseline.sql:633`
- Forward owners must not recreate guest policies — `supabase/migrations/20260818180000_floor_tables.sql:27`, `supabase/migrations/20260818193000_table_expected_minutes_and_merges.sql:41`
- Live matrix after reset — `tests/integration/security/sibling-privileges.integ.test.ts:197`
- Stale unit positives removed (live matrix replaces them) — `tests/unit/floor/schema.test.ts` orders GRANT pin only

Reusable pattern: After a full local reset, assert live `pg_policies` plus `has_table_privilege` / `has_sequence_privilege` for every sibling role; for BIGSERIAL, `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role` then `GRANT USAGE, SELECT` (USAGE is `nextval`; do not leave default sequence UPDATE on `service_role`).

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Authorization contract `[security]`

- `docs/specs/scheduling.md` §19 SIB-PRIV — server-mediated sibling access; `REVOKE ALL` then only the allowed public grant
- `docs/specs/booking-rules.md` AC-5 RES-PRIV — guest INSERT-only; no authenticated `FOR ALL`; staff including `getReservations` uses `createServiceClient`
- `docs/specs/menu-availability.md` AC-2 / AC-5 — menu SELECT-only; orders/order_items/sequence service-role-only

### 2. Server boundary `[auth]` `[security]`

- `app/actions/menu.ts:1-5` — cookie `createClient` removed; service + anon only
- `app/actions/menu.ts:161-268` — staff list/CRUD/toggle after `requireStaffUser`
- `app/actions/reservations.ts:1-4` — cookie `createClient` gone
- `app/actions/reservations.ts:584-587` — `getReservations` service client after staff gate
- `app/actions/operations.ts:284-288` — `getServers` already staff + service
- `app/actions/availability.ts:217` / `:230` — blocked-date staff writes already service-mediated

### 3. Database enforcement — public catalog `[security]` `[public-api]`

- Reservations: `supabase/migrations/00000000000000_baseline.sql:114` public INSERT kept; `:124` authenticated FOR ALL dropped; `:134` `REVOKE ALL` then `GRANT INSERT`
- Blocked dates: `supabase/migrations/00000000000000_baseline.sql:56` public SELECT; `:65` authenticated FOR ALL dropped; `:76` `REVOKE ALL` then `GRANT SELECT`
- Menu items: `supabase/migrations/00000000000000_baseline.sql:177` public SELECT; `:185` authenticated FOR ALL dropped; `:195` `REVOKE ALL` then `GRANT SELECT`
- Forward owners: `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql`

### 4. Database enforcement — private floor/POS `[security]` `[schema]`

- `tables` — `supabase/migrations/00000000000000_baseline.sql:475`
- `servers` — `supabase/migrations/00000000000000_baseline.sql:500`
- `table_merges` / `table_merge_members` — `supabase/migrations/00000000000000_baseline.sql:538`
- `status_events` — `supabase/migrations/00000000000000_baseline.sql:586`
- `orders` / `order_items` + `orders_order_number_seq` — `supabase/migrations/00000000000000_baseline.sql:633`
- Object-owning floor files must not recreate guest policies — `supabase/migrations/20260818180000_floor_tables.sql:27`, `supabase/migrations/20260818193000_table_expected_minutes_and_merges.sql:41`

### 5. Regression proof

- `tests/unit/menu/catalog-service-client.test.ts` — staff menu uses service client
- `tests/unit/reservations/get-range-service-client.test.ts` — `getReservations` uses service client
- `tests/integration/reservations/public-privileges.integ.test.ts` — guest INSERT/SELECT contracts + no recreated auth policy
- `tests/unit/scheduling/schema.test.ts` — `servers are seeded and service-role-only`
- `tests/integration/security/sibling-privileges.integ.test.ts:197` — live `pg_policies` + ACL matrix after reset
- `tests/unit/floor/schema.test.ts` — stale authenticated-policy positives removed

### 6. Linked state `[schema]`

- RES42-M1 — operator-owned `npx supabase db reset --linked --yes` plus role-matrix smoke per `docs/runbooks/deploy.md`. Not automated.

## Traceability (final)

Run: 2026-09-09 · plan: res-42_sibling_privilege_lock_6f2a8c1d · issue: RES-42

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| RES42-C1 | menu-availability.md AC-2 | `tests/unit/menu/catalog-service-client.test.ts::staff menu list and mutations use createServiceClient after requireStaffUser` | `app/actions/menu.ts` | P0 | shipped |
| RES42-C2 | booking-rules.md AC-5 | `tests/unit/reservations/get-range-service-client.test.ts::getReservations uses createServiceClient only after the staff gate` | `app/actions/reservations.ts` | P0 | shipped |
| RES42-C3 | booking-rules.md AC-5 RES-PRIV | `tests/integration/reservations/public-privileges.integ.test.ts::guest roles can INSERT reservations only and no authenticated full-access policy remains` | baseline + privilege/catalog migrations | P0 | shipped |
| RES42-C4 | scheduling.md §19 SIB-PRIV | `tests/integration/reservations/public-privileges.integ.test.ts::guest roles can SELECT blocked_dates only and no authenticated full-access policy remains` | baseline + privilege/catalog migrations | P0 | shipped |
| RES42-C5 | menu-availability.md AC-2 | `tests/integration/reservations/public-privileges.integ.test.ts::guest roles can SELECT menu_items only and no authenticated full-access policy remains` | baseline + privilege/catalog migrations + `app/actions/menu.ts` | P0 | shipped |
| RES42-C6 | scheduling.md FP-14 / §19 | `tests/unit/scheduling/schema.test.ts::servers are seeded and service-role-only` | `supabase/migrations/00000000000000_baseline.sql` | P0 | shipped |
| RES42-C7 | scheduling.md §19 + menu-availability.md AC-5 | `tests/integration/security/sibling-privileges.integ.test.ts::local reset exposes only the approved sibling role capability matrix` | baseline + floor/merge migrations | P0 | shipped |
| RES42-M1 | scheduling.md §19 linked conformance | — | linked Supabase rebuild/query runbook | P0 | manual-uat |

**manual-UAT (deferred):** RES42-M1 — operator-owned `npx supabase db reset --linked --yes` per `docs/runbooks/deploy.md`, then query `pg_policies`, table ACLs, and `orders_order_number_seq` against the C7 matrix; smoke staff menu CRUD, POS floor/server reads, kitchen tickets, and guest reservation insert/public catalog reads.

## Run metrics

Run: 2026-09-09 → 2026-09-10 · plan: res-42_sibling_privilege_lock_6f2a8c1d
Criteria: 7 shipped · 1 manual-uat · 8 total
Phases delegated: 22 tdd-red/green/refactor Task calls
Back-loops: RES42-C3: 1 extra Red (infra re-run after WinNAT)
BLOCKED events: 1 — C3: infra (Hyper-V excluded 54321/54322 until elevated WinNAT restart)
Issues: 0 filed · 2 attached-to-existing · 23 left on ledger (below floor + operator confirmation for net-new) — cap 3/run

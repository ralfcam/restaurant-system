# TDD verifier report — REAZED-308 public catalog privileges (`reazed-308_privileges_be131e14`)

FIX run. Linear: [REAZED-308](https://linear.app/realized/issue/REAZED-308).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — RES-PRIV insert-only

Suggested review order:
- PII wall — drop public SELECT + REVOKE SELECT [security]
  - `supabase/migrations/00000000000000_baseline.sql:105` — RES-PRIV comment; DROP `"Allow public read reservations"` (no CREATE)
  - `supabase/migrations/00000000000000_baseline.sql:126` — `REVOKE SELECT, UPDATE, DELETE … FROM anon, authenticated`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:23` — same DROP on already-applied overlay
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:9` — same DROP on forward file for remotes that already applied `20260825140000`
- Guest booking INSERT [booking]
  - `supabase/migrations/00000000000000_baseline.sql:99` — `"Allow public insert reservations"` stays
  - `supabase/migrations/00000000000000_baseline.sql:125` — `GRANT INSERT ON TABLE reservations TO anon, authenticated`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:24` — same GRANT
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:10` — same GRANT
- Schema / staff path [schema]
  - `supabase/migrations/00000000000000_baseline.sql:109` — authenticated `FOR ALL` stays (REAZED-299)
  - `supabase/migrations/00000000000000_baseline.sql:123` — `GRANT ALL … TO service_role` stays
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:13` — `NOTIFY pgrst, 'reload schema'`

Reusable pattern: Privilege overlays use the OH-PRIV two-line `-- REAZED-###: ACRONYM — drop … (keep DROP IF EXISTS; do not CREATE); GRANT/REVOKE …` block, DROP then GRANT/REVOKE, with live Data API plus SQL-substring assertions; pin STRICT integration to `127.0.0.1` keys from `npx supabase status` when `.env.local` is the linked remote.

### C2 — PUBLIC-READ-PRIV blocked_dates

Suggested review order:
- Catalog public read [security] — `GRANT SELECT` (holiday calendar + guest trigger can see blocked dates)
  - `supabase/migrations/00000000000000_baseline.sql:56` — public SELECT RLS stays (`USING (true)`)
  - `supabase/migrations/00000000000000_baseline.sql:82` — `GRANT SELECT ON TABLE blocked_dates TO anon, authenticated`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:29` — same GRANT on overlay
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:18` — same GRANT on forward file
- Guest DML wall [security] — `REVOKE INSERT, UPDATE, DELETE`
  - `supabase/migrations/00000000000000_baseline.sql:83` — REVOKE DML from anon, authenticated
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:30` — same REVOKE
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:19` — same REVOKE
- Staff / REAZED-299 [schema]
  - `supabase/migrations/00000000000000_baseline.sql:64` — authenticated `FOR ALL` stays
  - `supabase/migrations/00000000000000_baseline.sql:79` — `GRANT ALL … TO service_role` stays; `toggleBlockedDate` still uses service_role

Reusable pattern: Catalog PUBLIC-READ-PRIV keeps the OH-PRIV two-line `-- REAZED-###: ACRONYM — GRANT SELECT / REVOKE DML` comment **inline above GRANT/REVOKE in all three files**; a header-only note on the forward file is not the dialect.

### C3 — menu_items GRANT SELECT / REVOKE DML

Suggested review order:
- Catalog public read [security] — `GRANT SELECT ON TABLE menu_items TO anon, authenticated`
  - `supabase/migrations/00000000000000_baseline.sql:155` — public SELECT RLS stays (`USING (true)`)
  - `supabase/migrations/00000000000000_baseline.sql:179` — GRANT SELECT [security]
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:34` — same GRANT on overlay
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:23` — same GRANT on forward file
- Guest DML wall [security] — `REVOKE INSERT, UPDATE, DELETE ON TABLE menu_items FROM anon, authenticated`
  - `supabase/migrations/00000000000000_baseline.sql:180` — REVOKE DML [security]
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:35` — same REVOKE
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:24` — same REVOKE
- Staff / REAZED-299 [schema]
  - `supabase/migrations/00000000000000_baseline.sql:161` — authenticated `FOR ALL` stays
  - `supabase/migrations/00000000000000_baseline.sql:176` — `GRANT ALL … TO service_role` stays

Reusable pattern: When a second catalog table shares PUBLIC-READ-PRIV, keep the OH-PRIV two-line `-- REAZED-###: PUBLIC-READ-PRIV` comment **and name the table** (`on menu_items`) so sibling GRANT/REVOKE blocks are distinguishable; do not change privilege strings.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Reservations PII wall `[security]` `[booking]`

- `supabase/migrations/00000000000000_baseline.sql:111` — `DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`)
- `supabase/migrations/00000000000000_baseline.sql:130` — `REVOKE SELECT, UPDATE, DELETE ON TABLE reservations FROM anon, authenticated`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:23` — same DROP on overlay
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:25` — same REVOKE
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:12` — same DROP on forward file (remotes that already applied `20260825140000`)
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:14` — same REVOKE
- None of the three files `GRANT SELECT ON TABLE reservations`

### 2. Guest booking INSERT `[booking]` `[security]`

- `supabase/migrations/00000000000000_baseline.sql:99` — `"Allow public insert reservations"` stays
- `supabase/migrations/00000000000000_baseline.sql:129` — `GRANT INSERT ON TABLE reservations TO anon, authenticated`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:24` — same GRANT
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:13` — same GRANT

### 3. Catalog public read — blocked_dates `[security]`

Holiday calendar + booking trigger SELECT as anon.

- `supabase/migrations/00000000000000_baseline.sql:56` — public SELECT RLS stays
- `supabase/migrations/00000000000000_baseline.sql:82` — `GRANT SELECT ON TABLE blocked_dates TO anon, authenticated`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:29` — same GRANT
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:18` — same GRANT
- Matching `REVOKE INSERT, UPDATE, DELETE` at baseline `:83`, overlay `:30`, forward `:19`

### 4. Catalog public read — menu_items `[security]`

- `supabase/migrations/00000000000000_baseline.sql:155` — public SELECT RLS stays
- `supabase/migrations/00000000000000_baseline.sql:179` — `GRANT SELECT ON TABLE menu_items TO anon, authenticated`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:34` — same GRANT
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:23` — same GRANT
- Matching `REVOKE INSERT, UPDATE, DELETE` at baseline `:180`, overlay `:35`, forward `:24`

### 5. Staff / REAZED-299 `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:64` / `:113` / `:161` — authenticated `FOR ALL` stays on blocked_dates / reservations / menu_items
- `supabase/migrations/00000000000000_baseline.sql:79` / `:128` / `:176` — `GRANT ALL … TO service_role` stays
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:26` — `NOTIFY pgrst, 'reload schema'`

### 6. Live Data API contract

- `tests/integration/reservations/public-privileges.integ.test.ts` — C1 insert-only + no PII SELECT; C2 blocked_dates SELECT / INSERT deny; C3 menu_items SELECT / INSERT deny; SQL-substring lock on all three files

## Traceability (final)

Run: 2026-08-27 · plan: reazed-308_privileges_be131e14 · issue: REAZED-308

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 RES-PRIV | booking-rules.md AC-5 | `public-privileges.integ.test.ts::anon can INSERT reservations and cannot SELECT guest PII` | `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`, `20260827160000_public_catalog_privileges.sql` | P0 | shipped |
| C2 PUBLIC-READ-PRIV blocked_dates | scheduling.md §18 | `public-privileges.integ.test.ts::anon can SELECT blocked_dates and cannot INSERT` | same three files | P0 | shipped |
| C3 menu_items GRANT SELECT | menu-availability.md AC-2 | `public-privileges.integ.test.ts::anon can SELECT menu_items and cannot INSERT` | same three files | P1 | shipped |
| M1 linked-remote apply | scheduling.md §18 | — | `20260827160000_public_catalog_privileges.sql` on `tilcqrudqxznnpepxjqq` per deploy.md | P2 | manual-uat |

**manual-UAT (deferred):** apply `20260827160000_public_catalog_privileges.sql` on linked remote `tilcqrudqxznnpepxjqq` per `docs/runbooks/deploy.md` (execute SQL + record `schema_migrations`; do not `db push`).

## Run metrics

Run: 2026-08-27 → 2026-08-27 · plan: reazed-308_privileges_be131e14
Criteria: 3 shipped · 1 manual-uat · 4 total
Phases delegated: 9 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 2 filed · 1 attached-to-existing · 9 left on ledger (below floor) — cap 3/run

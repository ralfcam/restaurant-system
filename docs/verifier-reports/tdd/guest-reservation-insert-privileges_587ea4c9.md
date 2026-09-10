# TDD verifier report — guest-reservation-insert-privileges_587ea4c9

FIX run. Linear: none (free-text bug).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### RES-PRIV-COLS

Suggested review order:
- Guest-column INSERT allowlist (PostgREST column grants) `[security]`
  - `supabase/migrations/00000000000000_baseline.sql:132`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:27`
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:17`
- REVOKE-then-GRANT overlay + public INSERT policy still `WITH CHECK (true)` `[schema]`
  - `supabase/migrations/00000000000000_baseline.sql:109-133`
  - `supabase/migrations/20260825140000_operating_windows_privilege.sql:20-28`
  - `supabase/migrations/20260827160000_public_catalog_privileges.sql:14-18`
- Hostile vs ordinary insert contract
  - `tests/integration/reservations/public-privileges.integ.test.ts:92-174`
- Sibling `has_column_privilege` matrix `[security]`
  - `tests/integration/security/sibling-privileges.integ.test.ts:130-313`

Reusable pattern: Privilege-comment cleanups must not contain C1’s forbidden table-wide GRANT substring; name the allowlist in comments, leave GRANT SQL byte-identical. Pair live hostile Data API insert denial with `has_column_privilege` (not `has_table_privilege` INSERT) after a column-only GRANT — PostgreSQL reports table INSERT false for guest roles when only named columns are granted.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Guest authorization contract `[security]`

- `docs/specs/booking-rules.md` AC-5 — guest INSERT allowlist `(guest_name, party_size, date, time, phone, email, notes, conf_code)`; table-wide `GRANT INSERT ON TABLE reservations` forbidden; server-owned `id` / `status` / `table_label` / `created_at` / `completed_at` stay off the grant
- `docs/specs/booking-rules.md` BW-12 — guest INSERT must not write `table_label`

### 2. Database privilege enforcement `[security]` `[schema]`

- `supabase/migrations/00000000000000_baseline.sql:109-113` — `"Allow public insert reservations"` stays (`WITH CHECK (true)`); column GRANT is the write filter
- `supabase/migrations/00000000000000_baseline.sql:119` — `DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`)
- `supabase/migrations/00000000000000_baseline.sql:131-133` — `REVOKE ALL` then column `GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code)` then `GRANT ALL` to `service_role`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:24-28` — same REVOKE / column GRANT / service_role overlay
- `supabase/migrations/20260827160000_public_catalog_privileges.sql:14-18` — same forward file for remotes that already applied `20260825140000`
- None of the three files contain `GRANT INSERT ON TABLE reservations TO anon, authenticated`

### 3. Live denial and matrix proof `[security]`

- `tests/integration/reservations/public-privileges.integ.test.ts:92-143` — ordinary guest insert still succeeds; service read `status = 'confirmed'`, `table_label` / `completed_at` null; SQL substring lock on all three migrations
- `tests/integration/reservations/public-privileges.integ.test.ts:145-174` — hostile insert with `status: "completed"`, `table_label`, `completed_at` is non-null error and no persisted `conf_code`
- `tests/integration/security/sibling-privileges.integ.test.ts:130-313` — reservations guest **table** caps none; `has_column_privilege` INSERT true only for the eight guest columns for `anon`/`authenticated`; false for server-owned columns and for `PUBLIC` on every column; `service_role` unchanged

### 4. Operational mirrors

- `docs/architecture/Auth-And-RLS.md` — insert-only must name the column allowlist (not table-wide `GRANT INSERT`)
- `docs/runbooks/deploy.md` — linked-remote checks must not require `has_table_privilege('anon', 'reservations', 'INSERT') = true`; verify `has_column_privilege` on the eight guest columns and denial of `status` / `table_label` / `completed_at` / `id` / `created_at`
- `docs/testing/Design-And-Patterns.md` — Three-file catalog privilege lock row still says table-wide reservations `GRANT INSERT`

## Traceability (final)

Run: 2026-09-10 · plan: guest-reservation-insert-privileges_587ea4c9 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| RES-PRIV-COLS | booking-rules.md AC-5 / BW-12 | `public-privileges.integ.test.ts::guest INSERT rejects server-owned reservation fields and non-guest status`; `sibling-privileges.integ.test.ts::local reset exposes only the approved sibling role capability matrix` | `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`, `20260827160000_public_catalog_privileges.sql` | P0 | shipped |
| RES-PRIV-REMOTE | booking-rules.md AC-5 + deploy.md | — | same three privilege blocks on linked project `tilcqrudqxznnpepxjqq` | P0 | manual-uat |

**manual-UAT (deferred):** project `tilcqrudqxznnpepxjqq` already records `20260827160000`. Do not mutate it in this run. A separately authorized operator pass applies the idempotent `REVOKE ALL` + column-level `GRANT INSERT` + service-role grant block (or resets this no-user pre-production project), reloads PostgREST, and verifies `anon`/`authenticated` can insert only the eight allowed columns while `status`, `table_label`, `completed_at`, `id`, and `created_at` remain denied.

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: guest-reservation-insert-privileges_587ea4c9
Criteria: 1 shipped · 1 manual-uat · 2 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (Linear filing gated on operator confirmation; security `conf_code` UNIQUE is above floor) — cap 3/run

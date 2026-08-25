# TDD verifier report — REAZED-290 hours privilege (`reazed-290_hours_privilege`)

FIX run. Linear: [REAZED-290](https://linear.app/realized/issue/REAZED-290/restaurant-system-operating-windows-privilege-surface-rpc-execute).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — OH-PRIV authenticated Data API cannot mutate hours

Suggested review order:
- RLS lock-down (no authenticated write policy): `supabase/migrations/00000000000000_baseline.sql:23` ENABLE RLS · `…:25-29` public SELECT kept · `[security] supabase/migrations/00000000000000_baseline.sql:31-33` DROP authenticated FOR ALL, no CREATE · `…:35-40` service_role FOR ALL kept
- Live Data API denial: `tests/integration/scheduling/replace-operating-windows.integ.test.ts:12-36` docker GRANT/REVOKE to reproduce remote ACLs · `…:79-92` permission-error matcher · `[security] [public-api] …:189-284` createUser/signIn + insert must error, update/delete must not persist, anon SELECT still returns rows
- Isolation: `…:103-154` snapshot/restore + REAZED-297 service_role GRANT workaround · `lib/scheduling/hours-mutation-target.ts:28-33` local-host pin

Reusable pattern: Local-isolated Data API DML denial — docker `GRANT SELECT, INSERT, UPDATE, DELETE` onto postgres Dxtm defaults to reproduce the linked-remote privilege surface, then pin authenticated insert error plus update/delete non-persist; keep `DROP POLICY IF EXISTS` without `CREATE` so `db reset` still strips a restored FOR ALL.

### C2 — OH-PRIV SELECT-only grants + forward file

Suggested review order:
- Table privilege lock-down: `[security] supabase/migrations/00000000000000_baseline.sql:31-33` DROP authenticated FOR ALL, no CREATE · `…:35-40` service_role FOR ALL kept · `[security] …:42-43` GRANT SELECT / REVOKE INSERT, UPDATE, DELETE for `anon, authenticated` only
- Remote forward apply: `supabase/migrations/20260825140000_operating_windows_privilege.sql:1-6` sibling header · `[security] …:8` DROP POLICY IF EXISTS (name kept) · `[security] …:10-11` same GRANT/REVOKE · `[public-api] …:13` `NOTIFY pgrst, 'reload schema'`
- SQL-text contract: `tests/unit/scheduling/schema.test.ts:62-81` exact GRANT/REVOKE strings in both files + `existsSync` + DROP POLICY substring

Reusable pattern: Dual-file privilege lock — identical `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` strings in baseline and a forward file, `DROP POLICY IF EXISTS` (keep the name; never `CREATE`), `NOTIFY pgrst` on the forward file only, one `-- REAZED-###` tag; do not `GRANT` `service_role` in the same change.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Table privilege + RLS lock-down `[security]`

- `supabase/migrations/00000000000000_baseline.sql:23` — ENABLE RLS on `operating_windows`
- `supabase/migrations/00000000000000_baseline.sql:25-29` — public SELECT policy kept (guest widget)
- `supabase/migrations/00000000000000_baseline.sql:31-33` — `DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows"`; **no** `CREATE`
- `supabase/migrations/00000000000000_baseline.sql:35-40` — service_role FOR ALL kept
- `supabase/migrations/00000000000000_baseline.sql:42-43` — `GRANT SELECT ON TABLE operating_windows TO anon, authenticated` and `REVOKE INSERT, UPDATE, DELETE … FROM anon, authenticated` (no `service_role` GRANT — REAZED-297)

### 2. Remote forward apply `[security]` `[public-api]`

- `supabase/migrations/20260825140000_operating_windows_privilege.sql:1-6` — sibling header (forked remote; not a `db push`)
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:8` — `DROP POLICY IF EXISTS` (name kept)
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:10-11` — same GRANT/REVOKE strings as baseline
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:13` — `NOTIFY pgrst, 'reload schema'`

### 3. Live authenticated Data API denial `[security]` `[public-api]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:12-36` — docker GRANT/REVOKE overlay to reproduce linked-remote ACLs (local postgres Dxtm defaults)
- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:79-92` — permission-error matcher (INSERT WITH CHECK / 42501; UPDATE/DELETE may be silent 0-row)
- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:189-284` — short-lived user + `signInWithPassword`; INSERT must error; UPDATE/DELETE must not persist; anon SELECT still returns the seeded week

### 4. Isolation + snapshot `[security]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:103-154` — snapshot/restore via `createServiceClient`; test-only `service_role` GRANT (REAZED-297 not landed)
- `lib/scheduling/hours-mutation-target.ts:28-33` — local-host pin (mutating coverage never hits `tilcqrudqxznnpepxjqq`)

### 5. SQL-text contract

- `tests/unit/scheduling/schema.test.ts:62-81` — GRANT/REVOKE in baseline **and** forward file; `existsSync`; DROP POLICY substring (do not assert the policy name is absent globally)

## Traceability (final)

| ID | Spec | Test | Source | P | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | `scheduling.md` §16 OH-PRIV DML denial | `replace-operating-windows.integ.test.ts` :: `authenticated Data API cannot insert, update, or delete operating_windows` | `00000000000000_baseline.sql` (drop authenticated FOR ALL CREATE POLICY) | P0 | shipped |
| C2 | `scheduling.md` §16 OH-PRIV grants | `schema.test.ts` :: `operating_windows grants are select-only for anon and authenticated` | baseline GRANT/REVOKE + `20260825140000_operating_windows_privilege.sql` | P0 | shipped |
| OH-PRIV-remote-apply | `scheduling.md` §16 | — | `20260825140000_operating_windows_privilege.sql` on `tilcqrudqxznnpepxjqq` | P0 | manual-uat |

**manual-UAT (deferred):** apply `20260825140000_operating_windows_privilege.sql` on linked remote `tilcqrudqxznnpepxjqq` per `docs/runbooks/deploy.md` (single-file apply + record `schema_migrations`; do not `db push`). Confirm `has_table_privilege('authenticated','operating_windows','INSERT')` is false and the authenticated FOR ALL policy is gone. EXECUTE was already denied on that remote (verified 2026-08-25).

## Run metrics

Run: 2026-08-25 → 2026-08-25 · plan: reazed-290_hours_privilege
Criteria: 2 shipped · 1 manual-uat · 3 total
Phases delegated: 12 tdd-red/green/refactor Task calls
Back-loops: C1: 2 extra Red + 4 extra Green (REAZED-297 skip after db reset; RLS silent UPDATE/DELETE) · C2: none
BLOCKED events: 2 — C1 Green: parent beforeAll 42501 after db reset (REAZED-297; operator chose test-only docker GRANT, not folding 297) · C1 Green: `expect(updateError).not.toBeNull()` under RLS default-deny silent 0-row (Red retargeted UPDATE/DELETE to non-persist)
Issues: 2 filed · 1 attached-to-existing · 11 left on ledger (below floor) — cap 3/run

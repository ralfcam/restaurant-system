# TDD verifier report — res_46_search_path_cc45bd3e

FIX run. Linear: [RES-46](https://linear.app/realized/issue/RES-46/replace-operating-windows-has-a-mutable-search-path).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — OH-SAVE-PATH

Suggested review order:
- Immutable RPC namespace `[security]` `[schema]`
  - `supabase/migrations/00000000000000_baseline.sql:417`
  - `supabase/migrations/00000000000000_baseline.sql:421`
  - `supabase/migrations/00000000000000_baseline.sql:423`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:235`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:239`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:241`
- Invoker / EXECUTE surface `[security]`
  - `supabase/migrations/00000000000000_baseline.sql:414`
  - `supabase/migrations/00000000000000_baseline.sql:438`–`440`
  - `supabase/migrations/20260818162000_operating_hour_segments.sql:256`–`258`
- Regression proof
  - `tests/integration/scheduling/replace-operating-windows.integ.test.ts:272`
  - `tests/unit/scheduling/schema.test.ts:43`–`44`

Reusable pattern: pair an all-definition migration scan of every `CREATE OR REPLACE FUNCTION replace_operating_windows` with a post-reset `pg_proc.proconfig` assertion that the loaded catalog actually has `search_path=""`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Security / runtime namespace `[security]` `[schema]`

- `docs/specs/scheduling.md` §15 OH-SAVE-PATH — `public.replace_operating_windows(jsonb)` stays `SECURITY INVOKER` with exact `SET search_path = ''` and schema-qualified writes
- `supabase/migrations/00000000000000_baseline.sql:417` — `SET search_path = ''`
- `supabase/migrations/00000000000000_baseline.sql:421` — `DELETE FROM public.operating_windows`
- `supabase/migrations/00000000000000_baseline.sql:423` — `INSERT INTO public.operating_windows`
- `supabase/migrations/20260818162000_operating_hour_segments.sql:235` — same pin on the owner forward
- `supabase/migrations/20260818162000_operating_hour_segments.sql:239` — same DELETE
- `supabase/migrations/20260818162000_operating_hour_segments.sql:241` — same INSERT

### 2. Invoker / EXECUTE surface `[security]`

- `supabase/migrations/00000000000000_baseline.sql:414` — `CREATE` without `SECURITY DEFINER`
- `supabase/migrations/00000000000000_baseline.sql:438`–`440` — `REVOKE` PUBLIC then anon/authenticated; `GRANT EXECUTE` to `service_role`
- `supabase/migrations/20260818162000_operating_hour_segments.sql:256`–`258` — same ACL trio

### 3. Regression proof

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:272` — `replace_operating_windows pins an empty search_path and qualified table writes` (all-definition scan + live `proconfig` / `prosecdef` / ACLs)
- same file — unchanged PostgREST atomic multi-segment persistence
- `tests/unit/scheduling/schema.test.ts:43`–`44` — guest_note INSERT scan accepts `public.operating_windows`

### 4. Contract / operations

- `docs/specs/scheduling.md` §15 OH-SAVE-PATH-LINKED — C2 manual-UAT (replay current idempotent `20260818162000` after merge even though the history row exists; do not repair, `db push`, or reset linked history)
- `docs/runbooks/deploy.md` — Apply `20260818162000_operating_hour_segments.sql` on an already-baselined remote (catalog `search_path=""`, Advisor lint 0011 absent, staff Save)

## Traceability (final)

Run: 2026-09-10 · plan: res_46_search_path_cc45bd3e · issue: RES-46

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 OH-SAVE-PATH | scheduling.md §15 OH-SAVE-PATH | `replace-operating-windows.integ.test.ts::replace_operating_windows pins an empty search_path and qualified table writes` | `00000000000000_baseline.sql`, `20260818162000_operating_hour_segments.sql` | P2 | shipped |
| C2 OH-SAVE-PATH-LINKED | scheduling.md §15 OH-SAVE-PATH-LINKED | — | linked project `tilcqrudqxznnpepxjqq` via current idempotent `20260818162000_operating_hour_segments.sql` | P2 | manual-uat |

**manual-UAT (deferred):** after merge and separate operator authorization, confirm `validate_reservation_availability()` body parity between `20260818162000` and the latest writer, then execute the complete current `20260818162000` file once. Do not repair the history row, `db push`, or reset linked history. Confirm `search_path=""`, invoker/service-only EXECUTE, Advisor lint 0011 absent, and staff Save still persists multiple segments.

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: res_46_search_path_cc45bd3e
Criteria: 1 shipped · 1 manual-uat · 2 total
Phases delegated: 5 tdd-red/green/refactor Task calls
Back-loops: C1: 1 extra Red + 1 extra Refactor (schema.test.ts INSERT regex vs `public.operating_windows`)
BLOCKED events: 1 — C1 refactor: unit schema INSERT scan still expected unqualified `INSERT INTO operating_windows` after Green qualified the RPC writes
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (low tech-debt below floor) — cap 3/run

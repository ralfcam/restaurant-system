# TDD verifier report — scheduling Save RPC (`scheduling_save_rpc_0b84bd3f`)

FIX run. Free-text defect — no Linear source ID. `/commit` must omit `Fixes`.
Finding issues filed this run ([REAZED-290](https://linear.app/realized/issue/REAZED-290), [REAZED-291](https://linear.app/realized/issue/REAZED-291), [REAZED-292](https://linear.app/realized/issue/REAZED-292)) are out-of-scope leftovers, not this commit’s closing trailer.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — OH-SAVE deployed RPC persists segmented hours

Suggested review order: `[schema]` `[public-api]` RPC body + unique drop → `[security]` EXECUTE grant → `[public-api]` PostgREST pin → `[booking]` snapshot/restore

Reusable pattern: Snapshot `operating_windows` in `beforeAll`; restore with TABLE `insert` then `delete` leftover ids (never the destructive RPC); assert `PGRST202` / schema-cache *before* RPC success. Red target is the linked remote, not local `db reset`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Atomic segmented replace `[schema]` `[public-api]`

- `supabase/migrations/20260818162000_operating_hour_segments.sql` — drop `operating_windows_day_of_week_key`; add `label` / `sort_order` / `guest_note`; `CREATE OR REPLACE FUNCTION replace_operating_windows(p_windows jsonb)` (`DELETE … WHERE TRUE` then INSERT from `jsonb_array_elements`)
- `supabase/migrations/00000000000000_baseline.sql` — same RPC body (local reset equivalent)
- Applied on linked remote `tilcqrudqxznnpepxjqq` as version `20260818162000` / `operating_hour_segments` (not a full `db push`)

### 2. Execute grant `[security]`

- Same files: `REVOKE` from `PUBLIC`, `anon`, `authenticated`; `GRANT EXECUTE` to `service_role`; `NOTIFY pgrst, 'reload schema'`
- Live grants on `tilcqrudqxznnpepxjqq` after `/review`: `postgres` + `service_role` only
- Pin: `tests/integration/scheduling/replace-operating-windows.integ.test.ts`

### 3. PostgREST contract `[public-api]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts` — service-role `rpc("replace_operating_windows", { p_windows })`; not `PGRST202` / `/schema cache/i`; then `error` null; two open Monday rows with payload `label` / `sort_order` / `opens_at` / `closes_at`
- Caller (unchanged): `app/actions/availability.ts` `upsertOperatingWindows`

### 4. Snapshot/restore `[booking]`

- Same test: `beforeAll` snapshot; `afterAll` TABLE insert of snapshot then delete leftover ids (never RPC)
- Catalog: `docs/testing/Design-And-Patterns.md` integration recipe

## Traceability (final)

| ID  | Spec                         | Test                                                                                                                          | Source                                                                                                                                     | P   | Status  |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------- |
| C1  | OH-SAVE (`scheduling.md` §15) | `replace-operating-windows.integ.test.ts` :: `replace_operating_windows is PostgREST-callable and atomically persists multiple segments per weekday` | `20260818162000_operating_hour_segments.sql` applied on `tilcqrudqxznnpepxjqq`; `00000000000000_baseline.sql`; `app/actions/availability.ts` `upsertOperatingWindows` | P0  | shipped |

**manual-UAT (deferred):** click Save Changes on `/admin/scheduling` against the linked project (not automated)

## Run metrics

- 1 criterion, **integration**, executed against `https://tilcqrudqxznnpepxjqq.supabase.co` with `RESTAURANT_INTEGRATION_STRICT=true` (not skipped).
- Red: 1 failed (PGRST202). Green/Refactor/`/review` restore: 1 passed.
- `pnpm typecheck` clean. `pnpm lint` exit 0 with 1 pre-existing warning (`.cursor/checks/harness-lint.mjs` unused `dirname`).
- Docs-updater synced deploy/platform/testing docs; findings ledger pruned filed rows to `archive.md`.

## Residual findings

Filed: REAZED-290 (RPC EXECUTE + table `FOR ALL` umbrella; EXECUTE half applied on this remote at `/review`), REAZED-291 (unbounded `guest_note`), REAZED-292 (trigger SECURITY DEFINER regression). Below-floor leftovers stay on `docs/findings/{tech-debt,test-debt,product-gaps}.md` (migration-history fork after `20260818162000` recorded; mixed `restaurant_settings` clients at cap).

## Reusable patterns (4E)

1. **Hosted hours RPC vs PostgREST cache** — snapshot/restore via TABLE insert-then-delete leftover ids; assert schema-cache miss before RPC success; Red against the linked remote, not local `db reset`.

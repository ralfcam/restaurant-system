# TDD verifier report — PR 35 CodeRabbit OH-SAVE pins (`pr35_coderabbit_oh_save`)

FIX run. CodeRabbit comments on PR 35 — no Linear source ID. `/commit` must omit `Fixes`.
Do not attach this loop to REAZED-290 / REAZED-291 / REAZED-292 (privilege leftovers from the prior OH-SAVE run).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — OH-SAVE-ISO helper

Suggested review order: Isolation pin (highest) → `lib/scheduling/hours-mutation-target.ts:1` module boundary (not on `createServiceClient`); [security] `lib/scheduling/hours-mutation-target.ts:6` host allowlist; [security] `lib/scheduling/hours-mutation-target.ts:13` URL hostname parse + env fallback; `lib/scheduling/hours-mutation-target.ts:23` predicate; `lib/scheduling/hours-mutation-target.ts:28` fail-closed assert

Reusable pattern: WHATWG `URL.hostname` + small `ReadonlySet` allowlist, fail closed on missing/unparseable URL, optional arg `?? NEXT_PUBLIC_SUPABASE_URL`, keep the pin off `createServiceClient`

### C2 — OH-SAVE-ISO suite wiring

Suggested review order: Isolation wiring (highest) → [security] `tests/integration/scheduling/replace-operating-windows.integ.test.ts:58` `beforeAll` assert (blocks snapshot/RPC) → [security] `tests/integration/scheduling/replace-operating-windows.integ.test.ts:69` `afterAll` assert (restore is also a mutating table write; Vitest still runs `afterAll` after a failed `beforeAll`) → `tests/integration/scheduling/replace-operating-windows.integ.test.ts:4` import → `lib/scheduling/hours-mutation-target.ts:28` no-arg env fallback → complementary harness `tests/integration/setup.ts:3` + `tests/integration/helpers/env.ts:2` (STRICT / `skipIf`, unchanged)

Reusable pattern: Call `assertIsolatedHoursMutationTarget()` at the start of both `beforeAll` (snapshot) and `afterAll` (table restore) — restore is itself a mutating write, and Vitest still runs `afterAll` if `beforeAll` throws.

### C3 — OH-SAVE complete replace pin

Suggested review order: Replace-pin exactness (highest) → `tests/integration/scheduling/replace-operating-windows.integ.test.ts:111-117` unfiltered `select` + `toHaveLength(p_windows.length)` `[booking]` → `tests/integration/scheduling/replace-operating-windows.integ.test.ts:119-133` consuming `findIndex`/`splice` match loop + `expect(remaining).toHaveLength(0)` `[booking]` → test isolation guard (`lib/scheduling/hours-mutation-target.ts:6-11` allowlist, `:28-34` throw `[security]`; guard called at `:58,69`) → restore safety (`:82-100` insert-then-delete ordering)

Reusable pattern: Consuming-match assertion (`findIndex` + `splice` per expected row, then assert `remaining` empty) is a reusable recipe for pinning "replace produced exactly this multiset, no dupes/no extras" RPC behavior — worth promoting to `docs/testing/Design-And-Patterns.md`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Isolation pin (helper) `[security]`

- `lib/scheduling/hours-mutation-target.ts:1` — module boundary comment: call from tests/runners only, never gate `createServiceClient` (staff Save against the linked project stays valid production)
- `lib/scheduling/hours-mutation-target.ts:6` — `LOCAL_SUPABASE_HOSTS` allowlist (`127.0.0.1`, `localhost`, `[::1]`, `::1`)
- `lib/scheduling/hours-mutation-target.ts:13` — `hoursMutationTargetHostname`: WHATWG `URL.hostname` parse + `url ?? NEXT_PUBLIC_SUPABASE_URL` fallback
- `lib/scheduling/hours-mutation-target.ts:23` — `isIsolatedHoursMutationTarget` predicate
- `lib/scheduling/hours-mutation-target.ts:28` — `assertIsolatedHoursMutationTarget` fail-closed throw

### 2. Isolation wiring into the mutating suite `[security]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:4` — import of the C1 helper
- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:58` — `beforeAll` assert (blocks snapshot read + RPC on a non-local target)
- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:69` — `afterAll` assert (restore is itself a mutating write; Vitest still runs `afterAll` after a failed `beforeAll`)
- Complementary harness (unchanged): `tests/integration/setup.ts:3` (`RESTAURANT_INTEGRATION_STRICT` fail-closed) + `tests/integration/helpers/env.ts:2` (`authEnvReady` skipIf)

### 3. Complete replace-pin exactness `[booking]` `[public-api]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:111-117` — unfiltered `select` over all `operating_windows` rows + `expect(persisted).toHaveLength(p_windows.length)` (no leftover/duplicate rows survive the RPC)
- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:119-133` — consuming `findIndex` + `splice` match per `p_windows` entry (day_of_week, is_closed, label, sort_order, `normalizeTime`'d times) then `expect(remaining).toHaveLength(0)`

### 4. Restore safety `[booking]`

- `tests/integration/scheduling/replace-operating-windows.integ.test.ts:82-100` — insert-snapshot-first, delete-leftover-by-id-exclusion ordering (delete-then-insert is not transactional on REST)

### 5. Spec edit `[schema]`

- `docs/specs/scheduling.md` §15 — OH-SAVE isolation + complete-replace rules; MD029 structure (bold lead-in, out of the ordered list); deployed PGRST202 stays manual-UAT

## Traceability (final)

| ID  | Spec                           | Test                                                                                                                                     | Source                                              | P   | Status  |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | --- | ------- |
| C1  | OH-SAVE-ISO (`scheduling.md` §15) | `hours-mutation-target.test.ts` :: "rejects the shared linked hours project and non-local hosts; accepts local Supabase URL" | `lib/scheduling/hours-mutation-target.ts` | P0  | shipped |
| C2  | OH-SAVE-ISO suite wiring (`scheduling.md` §15) | `replace-operating-windows.integ.test.ts` `beforeAll`/`afterAll` `assertIsolatedHoursMutationTarget()` guard | `lib/scheduling/hours-mutation-target.ts` (no new source; test-only wiring) | P0  | shipped |
| C3  | OH-SAVE complete replace (`scheduling.md` §15) | `replace-operating-windows.integ.test.ts` :: "replace_operating_windows is PostgREST-callable and atomically persists multiple segments per weekday" (strengthened pin) | `replace_operating_windows(p_windows jsonb)` — `supabase/migrations/20260818162000_operating_hour_segments.sql` / `00000000000000_baseline.sql` (already correct; no Green needed) | P0  | shipped |
| OH-SAVE deployed PGRST202 | `scheduling.md` §15 | — | — | P0  | manual-uat |

**manual-UAT (deferred):** click Save Changes on `/admin/scheduling` against the linked project `tilcqrudqxznnpepxjqq` — must not surface PGRST202 / "schema cache" (not automated; isolation now forbids automating this against the shared project).

## Run metrics

- 3 criteria this run: C1 unit, C2 integration (test-only wiring), C3 integration (strengthening pin).
- C1: Red — 1 failed (missing module). Green — 1 passed. Refactor — 1 passed (executed, not skipped); typecheck clean; lint clean on touched files; prettier N/A (not a repo dependency).
- C2: Red executed and passed against local Supabase (`http://127.0.0.1:54321`, not skipped; Green N/A — helper already shipped, test-only wiring). Refactor — re-verified 1 passed (executed); typecheck clean; lint clean on touched files; prettier N/A.
- C3: Red executed and passed against today's RPC (already-correct full replace; Green N/A per plan — do not weaken assertion or RPC to force Red). Refactor — re-verified 1 passed (executed, confirmed twice with a clean shell env); C1 unit suite re-confirmed green; typecheck clean; lint clean; prettier N/A.
- All integration runs executed against **local** Supabase only (`RESTAURANT_INTEGRATION_STRICT=true`); never against `https://tilcqrudqxznnpepxjqq.supabase.co`.
- `pnpm typecheck` clean throughout. `pnpm lint` clean on all touched files (pre-existing full-repo lint noise on `supabase/.temp/**` gitignored CLI artifacts is unrelated — filed as a finding, not a regression).
- Prettier is not a repo dependency (`pnpm exec prettier` not found); spec/doc edits could not be auto-formatted by it — filed nowhere new (pre-existing repo condition, seen on a prior run too).
- `node .cursor/checks/harness-lint.mjs pr35_coderabbit_oh_save` — n/a until this close-out step (see below).

## Residual findings

Merged to `docs/findings/{product-gaps,test-debt,tech-debt,security}.md` at close-out (Step 4C). One above-floor finding filed: [REAZED-297](https://linear.app/realized/issue/REAZED-297) (`operating_windows` missing explicit `service_role` table `GRANT`; `relatedTo` REAZED-290), pruned to `docs/findings/archive.md`. Also archived in-run: the pre-existing "No local-vs-remote URL guard on integration tests" tech-debt item, resolved by this run's C1+C2. Seven below-floor items remain on the active ledger for `/triage`. Run file deleted.

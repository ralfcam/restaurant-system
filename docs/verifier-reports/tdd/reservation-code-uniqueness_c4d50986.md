# TDD verifier report — reservation-code-uniqueness_c4d50986

FIX run. Linear: none (free-text bug).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Phase log

### spec-contract

- Status: complete
- Spec clause: `docs/specs/booking-rules.md` AC-4 **CONF-CODE-UNIQUE**
- Priority / rationale: P0 data-integrity — confirmation identity must be unique at the database, not only in application copy
- Test file / name: `tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts` → "rejects a second guest insert of the same conf_code with SQLSTATE 23505"
- Expected Red failure: second insert of the same `TVL-####` succeeds; baseline lacks `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx`
- Actual Red failure: `expected null not to be null` at `expect(secondError).not.toBeNull()` — second guest INSERT of `TVL-9917` succeeded (1 failed / 0 skipped)
- Implementation: `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)` in `supabase/migrations/00000000000000_baseline.sql` immediately after `CREATE TABLE IF NOT EXISTS reservations`
- Green evidence: after `npx supabase db reset --local`, fail-closed integration run: Tests 1 passed (1) · 0 skipped; `pnpm typecheck` pass
- Refactor checks: none needed; unique index already matches sibling `CREATE UNIQUE INDEX IF NOT EXISTS` pattern
- Findings revision: seeded in-scope security finding; out-of-scope test-debt for uncovered `23505` retry kept
- Acceptance review: AC-4 CONF-CODE-UNIQUE encoded as 23505 + single remaining row + named baseline index pin
- Production-code review: one-line unique index after table create; `createReservation` untouched
- Test-quality review: isolated fixture dates/times; RES-ISO pin; cleanup scoped to fixture code/date/time
- Combined testing / verification: final gate after close-out — `npx supabase db reset --local` applied `00000000000000_baseline.sql`; uniqueness integ included in full suite; `npx supabase db lint --local --fail-on error` no schema errors; `pnpm test:unit` 307 passed (307); fail-closed `pnpm test:integration` 22 passed (22) · 0 skipped; `pnpm lint` 0 warnings; `pnpm typecheck` pass; this run's formattable files prettier-clean. Workspace `pnpm format:check` still fails on 5 unrelated files (not edited).

### red

- Status: complete (RED for the right reason)
- Test: `confirmation-code-uniqueness.integ.test.ts` → "rejects a second guest insert of the same conf_code with SQLSTATE 23505"
- Command: `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts`
- Result: Tests 1 failed (1) · 0 skipped
- Failure: `tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts:77` `expect(secondError).not.toBeNull()`

### green

- Status: complete (GREEN)
- Source: `supabase/migrations/00000000000000_baseline.sql` — `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)` after `CREATE TABLE IF NOT EXISTS reservations`
- Commands: `npx supabase db reset --local`; `$env:RESTAURANT_INTEGRATION_STRICT = 'true'` + local URL/anon/service keys; `pnpm test:integration tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts`; `pnpm typecheck`
- Result: Tests 1 passed (1) · 0 skipped; typecheck pass
- Residual: keep existing `createReservation` 23505 retry test-debt (now live against a real unique index)

### refactor

- Status: complete
- Cleanups: none needed
- Re-verify (orchestrator): uniqueness 1 passed (1) · 0 skipped; isolation unit 2 passed (2); `pnpm test:unit` 307 passed (307); `pnpm test:integration` 22 passed (22) · 0 skipped; `npx supabase db lint --local --fail-on error` no schema errors; `pnpm lint` 0 warnings; `pnpm typecheck` pass

WRITE STATUS: success

## Criterion close-outs (incremental)

### CONF-CODE-UNIQUE

Suggested review order:
- [schema] `supabase/migrations/00000000000000_baseline.sql:81-98` — `reservations` table; `conf_code TEXT NOT NULL`
- [schema] `supabase/migrations/00000000000000_baseline.sql:100` — unique index immediately after table create
- [security] guest INSERT allowlist still includes `conf_code`; uniqueness is now DB-enforced identity, not app-only
- `tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts:67-99` — 23505 + single remaining row + baseline pin

Reusable pattern: Pin identity uniqueness with `CREATE UNIQUE INDEX IF NOT EXISTS …_uidx` immediately after `CREATE TABLE IF NOT EXISTS` (Postgres-safe idempotency; do not use `ADD CONSTRAINT IF NOT EXISTS`).

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Database identity invariant `[schema]` `[security]`

- `docs/specs/booking-rules.md` AC-4 **CONF-CODE-UNIQUE** — `public.reservations.conf_code` must have an idempotent unique index; second insert of the same `TVL-####` fails with `23505`; exactly one row remains
- `supabase/migrations/00000000000000_baseline.sql:81-98` — `reservations` table; `conf_code TEXT NOT NULL`
- `supabase/migrations/00000000000000_baseline.sql:100` — `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)`
- Guest INSERT allowlist still includes `conf_code` (AC-5); uniqueness is now database-enforced, not application copy

### 2. Regression proof

- `tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts:67-99` → "rejects a second guest insert of the same conf_code with SQLSTATE 23505"
- First guest INSERT of `TVL-9917` on 2027-11-17 19:00 succeeds; second insert on 2027-11-24 20:00 is `23505`; one persisted row; baseline pin of the named unique-index statement immediately after table create
- RES-ISO: zero-arg `assertIsolatedHoursMutationTarget()` first in `beforeAll` / `afterEach`; cleanup scoped to fixture code/date/time

### 3. Out of this change

- `app/actions/reservations.ts` 23505 retry loop — unchanged; no unit coverage (ledger test-debt)
- Hostile-test lookup-by-`conf_code` in `public-privileges.integ.test.ts` — database uniqueness does not resolve a random-code collision with a pre-existing row

## Traceability (final)

Run: 2026-09-11 · plan: reservation-code-uniqueness_c4d50986 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| CONF-CODE-UNIQUE | booking-rules.md AC-4 CONF-CODE-UNIQUE | `confirmation-code-uniqueness.integ.test.ts::rejects a second guest insert of the same conf_code with SQLSTATE 23505` | `00000000000000_baseline.sql` (`reservations_conf_code_uidx`) | P0 | shipped |

## Run metrics

Run: 2026-09-11 → 2026-09-11 · plan: reservation-code-uniqueness_c4d50986
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (`createReservation` 23505 retry coverage, med, below test-debt high-only floor) — cap 3/run

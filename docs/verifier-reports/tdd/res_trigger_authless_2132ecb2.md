# TDD verifier report — res_trigger_authless_2132ecb2

FIX run. Linear: none (free-text bug).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — RES-TRIGGER-EXEC-AUTHLESS

Suggested review order:
- [security] dedicated ungated describe + local pin — `tests/integration/security/sibling-privileges.integ.test.ts:437-440`
- [security] trigger-only EXECUTE catalog `it()` (moved, assertions unchanged) — `tests/integration/security/sibling-privileges.integ.test.ts:442-528`
- AUTHLESS AST pin (outside `skipIf(!authEnvReady)`, plain owner, first-statement helper) — `tests/unit/reservations/reservation-integ-isolation.test.ts:267-290`
- Spec contract (do not edit) — `docs/specs/booking-rules.md` §23 / table row RES-TRIGGER-EXEC

Reusable pattern: targeted authless integration invocation (local URL, keys/STRICT unset) whose Docker/psql dependency fails closed while unrelated `describe.skipIf(!authEnvReady)` tests may skip

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Placement invariant `[security]`

- `docs/specs/booking-rules.md` §23 RES-TRIGGER-EXEC-AUTHLESS — named catalog coverage MUST execute independently of `authEnvReady`; fail rather than skip when local Docker/Postgres is unavailable; other sibling tests keep their gating
- `tests/integration/security/sibling-privileges.integ.test.ts:437-440` — dedicated plain `describe("RES-TRIGGER-EXEC local catalog coverage")` with first-statement zero-arg `assertIsolatedHoursMutationTarget()`
- `tests/integration/security/sibling-privileges.integ.test.ts:442-528` — `"local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE"` (title/body unchanged; no longer under `describe.skipIf(!authEnvReady)`)
- `tests/integration/security/sibling-privileges.integ.test.ts:341-435` — sibling RLS/ACL matrix remains `describe.skipIf(!authEnvReady)` (out of scope to move)

### 2. Structural regression

- `tests/unit/reservations/reservation-integ-isolation.test.ts:267-290` → `RES-TRIGGER-EXEC local catalog coverage is outside the auth environment skip and retains its local guard`
- Exact-name uniqueness, fail if descendant of `describe.skipIf(!authEnvReady)`, dedicated plain `describe` whose `beforeAll` starts with `assertIsolatedHoursMutationTarget()`

### 3. Authless runtime proof

- Child-process invocation: local URL set, anon/service-role/STRICT unset; named `it()` must appear in passed/failed, never only skipped
- Docker/`psql` catalog assertion remains fail-closed when local Postgres is unavailable
- Preserve-behavior: with keys + `RESTAURANT_INTEGRATION_STRICT=true`, both tests in the sibling file execute and pass

## Traceability (final)

Run: 2026-09-11 · plan: res_trigger_authless_2132ecb2 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 RES-TRIGGER-EXEC-AUTHLESS | booking-rules.md §23 RES-TRIGGER-EXEC-AUTHLESS | `reservation-integ-isolation.test.ts::RES-TRIGGER-EXEC local catalog coverage is outside the auth environment skip and retains its local guard`; `sibling-privileges.integ.test.ts::local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE` | none (test-harness wiring only) | P0 | shipped |

## Run metrics

Run: 2026-09-11 → 2026-09-11 · plan: res_trigger_authless_2132ecb2
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 4 tdd-red/green/refactor Task calls (C1 red, C1 red-wire, C1 green, C1 refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 5 left on ledger (1 test-debt med below high-only floor; 3 lows below floor; 1 tech-debt low de-duped onto existing hours-branded helper line) — cap 3/run

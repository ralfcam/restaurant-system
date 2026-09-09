# TDD log — res_iso_followup_pins_b8e4c2a1

### C1

Suggested review order:
- [security] Zero-arg pin predicate — `tests/unit/reservations/reservation-integ-isolation.test.ts:42`, `:50`
- [security] Synthetic explicit-URL rejection — `:119`, `:127`
- Existing glob + named-import + first-statement contract — `:10`, `:27`, `:104`
- Helper left with scheduling §15 “explicit URL wins” — `lib/scheduling/hours-mutation-target.ts:28`

Reusable pattern: AST isolation scan must reject `arguments.length !== 0` so `assertIsolatedHoursMutationTarget("http://127.0.0.1:54321")` cannot pass while `createServiceClient()` still follows `NEXT_PUBLIC_SUPABASE_URL`

### C2

Suggested review order:
- [security] pin-before-write on every marketing write hook — `tests/integration/marketing/review-email-schema.integ.test.ts:4`, `:31`/`:43`, `:110`/`:115`, `:175`/`:180`
- [security] zero-arg first-statement scan, including `beforeEach` — `tests/unit/marketing/review-email-schema-isolation.test.ts:10`, `:47`/`:55`, `:109`

Reusable pattern: Isolation `WRITE_HOOKS` must list every hook the spec treats as a write — PV-ISO needs `beforeEach` (snapshot/upsert), not only RES-ISO’s `beforeAll`/`afterEach`/`afterAll`; leave per-glob AST copies until an extract is a proven shrink with no new public API

### C3

Suggested review order:
- [security] pin-before-`it()` write — `tests/integration/pos/orders-persistence.integ.test.ts:3`, `:14`–`:16`, `:18`–`:19`
- [security] missing-`beforeAll` is a failure + zero-arg first-statement scan — `tests/unit/pos/orders-persistence-isolation.test.ts:10`, `:42`–`:51`, `:106`–`:114`
- Helper left with scheduling §15 “explicit URL wins” — `lib/scheduling/hours-mutation-target.ts:28`

Reusable pattern: When the only mutating write lives in `it()`, add a pin-only `beforeAll` that calls `assertIsolatedHoursMutationTarget()` with zero args — `afterEach` alone is too late; leave per-glob AST copies until an extract is a proven shrink

## Suggested Review Order (collated)

Highest-risk first.

- [security] Zero-arg pin predicate + synthetic explicit-URL rejection — `tests/unit/reservations/reservation-integ-isolation.test.ts:42`, `:50`, `:119`, `:127`
- [security] marketing pin-before-write (all three describes, including `beforeEach`) — `tests/integration/marketing/review-email-schema.integ.test.ts:4`, `:31`/`:43`, `:110`/`:115`, `:175`/`:180`
- [security] POS pin-only `beforeAll` before `it()` insert — `tests/integration/pos/orders-persistence.integ.test.ts:3`, `:14`–`:16`, `:18`–`:19`
- [security] marketing / POS glob-scans — `tests/unit/marketing/review-email-schema-isolation.test.ts:10`, `:47`/`:55`; `tests/unit/pos/orders-persistence-isolation.test.ts:10`, `:42`–`:51`, `:106`–`:114`
- Helper left with scheduling §15 “explicit URL wins” — `lib/scheduling/hours-mutation-target.ts:28`

## Traceability (final)

Run: 2026-09-09 · plan: res_iso_followup_pins_b8e4c2a1 · issue: none

| Criterion | Spec ref     | Test file::name                                                                                                      | Source file(s) | Risk | Status  |
| --------- | ------------ | -------------------------------------------------------------------------------------------------------------------- | -------------- | ---- | ------- |
| C1        | RES-ISO      | reservation-integ-isolation.test.ts::reservation integ suites call assertIsolatedHoursMutationTarget before mutating writes | none (zero-arg scan tighten) | P0   | shipped |
| C2        | PV-ISO       | review-email-schema-isolation.test.ts::marketing integ suites call assertIsolatedHoursMutationTarget before mutating writes | none (wired existing marketing integ) | P0   | shipped |
| C3        | ORD-ISO      | orders-persistence-isolation.test.ts::POS integ suites call assertIsolatedHoursMutationTarget before mutating writes | none (wired existing POS integ) | P0   | shipped |

## Run metrics

Run: 2026-09-09 → 2026-09-09 · plan: res_iso_followup_pins_b8e4c2a1
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 12
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · leftovers left on ledger (Cloud no-create) — cap 3/run

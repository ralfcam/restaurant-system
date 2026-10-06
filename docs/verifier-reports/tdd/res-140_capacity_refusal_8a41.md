# TDD verifier report — RES-140 capacity refusal shape (`res-140_capacity_refusal_8a41`)

FIX run. Linear: RES-140.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### CC-6 — capacity refusals return `{ error: key }`

Suggested review order:
- Returned catalog key, not a raw database message [security] — `app/actions/operations.ts:402` `coverCapacityRefusal`, allowlist `app/actions/operations.ts:395`, seat update `app/actions/operations.ts:507`, insert `app/actions/operations.ts:1033`, ceiling upsert `app/actions/operations.ts:1242`
- Staff gate still throws before any refusal return [auth] — `app/actions/operations.ts:994` `createTable`, `app/actions/operations.ts:447` `updateTableState`, `app/actions/operations.ts:1216` `setMaxCoverCapacity`
- Success value stays readable without narrowing [public-api] — `app/actions/operations.ts:411` `CoverCapacityResult`, reached return `app/actions/operations.ts:495` and `app/actions/operations.ts:1008`
- Floor toasts `t` of the returned error and does not treat it as success — `components/staff/floor-plan.tsx:593` `addTable`, `components/staff/floor-plan.tsx:522` `adjustSeats`, `components/staff/floor-plan.tsx:1012` ceiling `onBlur`

Reusable pattern: Allowlist an exact Postgres `RAISE` text into `{ error: key }`, and type the action as `Success | ({ error: string } & Partial<Success>)` so success fields typecheck without narrowing.

## Suggested Review Order (collated)

- Database capacity text is returned only when it is an exact allowlisted catalog key [security] → `app/actions/operations.ts:395`, `:402`, `:507`, `:1033`, `:1242`
- Staff gate still throws `errors.operations.unauthorized` before a refusal return [auth] → `app/actions/operations.ts:994`, `:447`, `:1216`
- Reached, unset, invalid, and below-sum pre-checks return `{ error: key }` and do not write → `app/actions/operations.ts:495`, `:1008`, and the matching returns in `setMaxCoverCapacity`
- `createTable` success stays a table value [public-api] → `app/actions/operations.ts:411`, `:992`
- Floor shows `t(result.error)` and skips the success path → `components/staff/floor-plan.tsx:596`, `:528`, `:1019`
- Spec amendment → `docs/specs/cover-capacity.md` CC-3, CC-4, CC-5, CC-6, CC-16

## Traceability (final)

Run: 2026-10-06 · plan: res-140_capacity_refusal_8a41 · issue: RES-140

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| CC-6 | cover-capacity.md CC-6 | tests/unit/floor/cover-capacity.test.ts::CC-6 returns the reached key and the floor shows it | app/actions/operations.ts, components/staff/floor-plan.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-140_capacity_refusal_8a41
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: n/a — ledger empty, STEP 4C skipped

# /sdd-to-tdd RES-143 — cover read robustness

Managed Cloud one-shot. `agent/runtime` = `managed`. Branch
`cursor/res-143-b7c4` from `origin/staging`. Ready brief Queue 1
(dispatch 2026-10-06) pre-authorizes the paths in Permissions Requested.

## Mode Check

- Plan Mode: NO — managed Cloud one-shot
- Work type: implementation (FIX)
- Issue: RES-143
- Project: restaurant-system V-0.5 · M4 — Code Complete (Feature Freeze)
- Milestone route: FIX implementation → M4. Current milestone is already M4.
- Mixed design + implementation: no
- Clarification: resolved by the Ready brief decisions

## Issue & Root Cause

- Issue: RES-143 — a failed `getMaxCoverCapacity` read rejects `/admin/floor`'s
  `Promise.all`; the read has no staff gate; `setMaxCoverCapacity` reports a
  seat-read failure as `maxCoverCapacityBelowSum`; migration
  `20261005170000_hosted_baseline_columns.sql` assigns a bare 38, which the
  cover trigger rejects when the seat sum is higher.
- Missing constraint: CC-1 gates only set and clear; CC-13 makes the page read
  throw inside `Promise.all`; CC-11 does not cover the ceiling-save seat read;
  CC-12 covers `seed.sql`, not the hosted UPDATE.
- Spec update proposed: `docs/specs/cover-capacity.md` criteria CC-14 through
  CC-17. First execution action after START.

## Spec

- Source: extend `docs/specs/cover-capacity.md`
- Summary: staff-gate the capacity read, keep the floor page up when that read
  throws, use the save-failed key when the ceiling save cannot read seats, and
  set the hosted null ceiling to `GREATEST(38, SUM(seats))`.
- Clarifications needed: none. The brief decides the page stays up while write
  paths still fail closed, and a seat-read failure is not a below-sum refusal.
  The ceiling save uses `errors.floor.maxCoverCapacitySaveFailed` (the existing
  save key), not `addTableFailed` / `updateTableFailed`, because this path is
  not a table insert or seat change.

## Acceptance Criteria → Tests

| #   | Criterion                        | Risk | Layer | Test file                               | New or existing | Test name                                                   | Assertion                                                                                                                                                              | Command                                                  | Depends on |
| --- | -------------------------------- | ---- | ----- | --------------------------------------- | --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| 1   | CC-14 staff gate                 | P0   | unit  | tests/unit/floor/cover-capacity.test.ts | add test        | CC-14 gates getMaxCoverCapacity                             | unauthenticated throws `errors.operations.unauthorized` and does not call `createServiceClient`; staff call reads settings                                             | `pnpm test:unit tests/unit/floor/cover-capacity.test.ts` | none       |
| 2   | CC-15 page survives read failure | P1   | unit  | tests/unit/floor/cover-capacity.test.ts | add test        | CC-15 keeps the floor page up when the capacity read throws | `getMaxCoverCapacity` is outside the page `Promise.all` and `errors.floor.addTableFailed` is caught so `FloorPlan` still renders with `initialMaxCoverCapacity={null}` | same                                                     | CC-14      |
| 3   | CC-16 seat-read key              | P1   | unit  | tests/unit/floor/cover-capacity.test.ts | add test        | CC-16 does not call a seat-read failure a below-sum refusal | seat SELECT error throws `errors.floor.maxCoverCapacitySaveFailed`, does not upsert, and does not throw `maxCoverCapacityBelowSum`                                     | same                                                     | none       |
| 4   | CC-17 hosted ceiling             | P1   | unit  | tests/unit/floor/cover-capacity.test.ts | add test        | CC-17 derives the hosted ceiling from the seat sum          | migration assigns `GREATEST(38,` and `SUM(seats)` cast to integer, only where the ceiling is null, and does not assign bare `= 38`                                     | same                                                     | none       |

Infra: none (all unit/mocked).

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                     | Source file(s)                                                 | Risk | Status  |
| --------- | ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- | ------- |
| CC-14     | cover-capacity.md CC-14 | cover-capacity.test.ts::CC-14 gates getMaxCoverCapacity                             | app/actions/operations.ts                                      | P0   | planned |
| CC-15     | cover-capacity.md CC-15 | cover-capacity.test.ts::CC-15 keeps the floor page up when the capacity read throws | app/admin/floor/page.tsx                                       | P1   | planned |
| CC-16     | cover-capacity.md CC-16 | cover-capacity.test.ts::CC-16 does not call a seat-read failure a below-sum refusal | app/actions/operations.ts                                      | P1   | planned |
| CC-17     | cover-capacity.md CC-17 | cover-capacity.test.ts::CC-17 derives the hosted ceiling from the seat sum          | supabase/migrations/20261005170000_hosted_baseline_columns.sql | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested

- Spec create/edit: `docs/specs/cover-capacity.md` — add CC-14 through CC-17.
- Existing-test edit: `tests/unit/dev-toolchain/baseline-forward-migration.test.ts`
  — the hosted-ceiling assertion still requires `SET max_cover_capacity = 38`,
  which CC-17 forbids. Update only that assertion to the GREATEST form.
  Do not modify other existing tests.
- Allowed implementation files from the Ready brief: `app/actions/operations.ts`,
  `app/admin/floor/page.tsx`, `supabase/migrations/20261005170000_hosted_baseline_columns.sql`.
  Do not edit `supabase/seed.sql` (CC-12 already pins it). Do not edit
  `components/staff/floor-plan.tsx`.

## TDD Execution Loop

### Criterion 1 — CC-14 staff gate (layer: unit)

- **Red** → Use the tdd-red subagent to add one failing test `CC-14 gates getMaxCoverCapacity` in `tests/unit/floor/cover-capacity.test.ts`. Unauthenticated `getMaxCoverCapacity()` rejects with `errors.operations.unauthorized` and does not call `createServiceClient`. Do not modify existing tests. Run `pnpm test:unit tests/unit/floor/cover-capacity.test.ts` and stop when that new test fails on the assertion.
- **Green** → Use the tdd-green subagent to make that test pass by gating `getMaxCoverCapacity` with `requireStaffUser` before `createServiceClient`. Do not edit tests or the spec.
- **Refactor** → Use the tdd-refactor subagent to clean the CC-14 gate without changing behavior, then re-run the unit test, lint, and typecheck on the touched source.

### Criterion 2 — CC-15 page survives read failure (layer: unit)

- **Red** → Use the tdd-red subagent to add one failing test `CC-15 keeps the floor page up when the capacity read throws` that reads `app/admin/floor/page.tsx` and asserts `getMaxCoverCapacity` is not an entry of the `Promise.all` and that `errors.floor.addTableFailed` is caught so the page still returns `FloorPlan` with `initialMaxCoverCapacity={null}`.
- **Green** → Use the tdd-green subagent to catch only that failure outside `Promise.all` and pass null into `FloorPlan`. Re-throw any other error, including unauthorized.
- **Refactor** → Use the tdd-refactor subagent to clean that page catch without changing behavior and re-verify.

### Criterion 3 — CC-16 seat-read key (layer: unit)

- **Red** → Use the tdd-red subagent to add one failing test `CC-16 does not call a seat-read failure a below-sum refusal`. When the `tables` seats select returns an error, `setMaxCoverCapacity(10)` rejects with `errors.floor.maxCoverCapacitySaveFailed` and does not upsert.
- **Green** → Use the tdd-green subagent to throw `errors.floor.maxCoverCapacitySaveFailed` on that read error. Keep the below-sum throw for a successful read.
- **Refactor** → Use the tdd-refactor subagent to clean that branch without changing behavior and re-verify.

### Criterion 4 — CC-17 hosted ceiling (layer: unit)

- **Red** → Use the tdd-red subagent to add one failing test `CC-17 derives the hosted ceiling from the seat sum` that reads `supabase/migrations/20261005170000_hosted_baseline_columns.sql` and expects `GREATEST(38`, `SUM(seats)`, an integer cast, and `max_cover_capacity IS NULL`, and expects no bare `SET max_cover_capacity = 38`.
- **Green** → Use the tdd-green subagent to change that UPDATE in place. Do not add a new migration file. Do not change `seed.sql`.
- **Refactor** → Use the tdd-refactor subagent to clean the SQL comment if needed without changing behavior and re-verify.

## Manual-UAT

None. The hosted UPDATE is pinned by the unit source assertion. Applying it on
the shared database is an operator migration, not this loop.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-143_cover_read_b7c4`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-143_cover_read_b7c4.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/cover-capacity.md`
Criteria: 4 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/cover-capacity.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-143_cover_read_b7c4.plan.md`

Problem: A failed settings read inside `/admin/floor`'s Promise.all takes the page down, `getMaxCoverCapacity` has no staff gate, a failed seat read on the ceiling save is reported as below-sum, and the hosted migration writes a bare 38 that the cover trigger rejects when seats already exceed 38. The spec gates only set and clear, and it treats that throw as success for the page read.
Approach: Gate the read with requireStaffUser. Keep the throw for a failed settings read, and catch only that key outside Promise.all so the floor still renders with a null ceiling. On a failed seat read, throw the save-failed key and do not upsert. Set a null hosted ceiling to GREATEST(38, the current seat sum). Write paths still fail closed.
Out-of-scope findings: none

| #   | Criterion                                       | Risk | Layer | Test file                               |
| --- | ----------------------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | Staff-gate getMaxCoverCapacity                  | P0   | unit  | tests/unit/floor/cover-capacity.test.ts |
| 2   | Floor page survives a capacity read failure     | P1   | unit  | tests/unit/floor/cover-capacity.test.ts |
| 3   | Seat-read failure is save-failed, not below-sum | P1   | unit  | tests/unit/floor/cover-capacity.test.ts |
| 4   | Hosted null ceiling is GREATEST(38, seat sum)   | P1   | unit  | tests/unit/floor/cover-capacity.test.ts |
```

## Docs Sync

start-linear first, background, do not wait. Then the spec edit, then CC-14 Red.

## Out-of-Scope Findings

| Finding | Where | Why it matters | Severity | Relation |
| ------- | ----- | -------------- | -------- | -------- |
| none    |       |                |          |          |

CC-6 toast mapping is RES-140. Missing catalog keys are RES-142. Floor overflow is RES-136.

## Execution Protocol

Orchestrator writes only the spec, the findings run file, and the verifier
report. Tests come from tdd-red. Source comes from tdd-green. Cleanup comes
from tdd-refactor. START is background and is not awaited.

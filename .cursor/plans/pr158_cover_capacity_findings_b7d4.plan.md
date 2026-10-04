# PR 158 cover-capacity findings

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/cover-capacity.md`, (2) the findings revision pass on
  `docs/findings/runs/pr158_cover_capacity_findings_b7d4.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/pr158_cover_capacity_findings_b7d4.md` after each
  `tdd-refactor` phase, and (4) at close-out, **`## Suggested Review Order (collated)`**,
  **`## Traceability (final)`**, and **`## Run metrics`** in the same tdd log.
  After a spec write, `pnpm exec prettier --write` **that file** (never `.`).
  Snapshot trees are prettierignored.
- **Every test change** comes from a `tdd-red` Task. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. One
  phase at a time. Do not mark a phase done on subagent assertion alone. The
  target test's pass/fail must be visible in the returned report.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- This is an in-loop CodeRabbit fix on PR #158. Skip START and CLOSE-OUT.
  Stay on `cursor/res-69-b7d4`.
- Arm `node .cursor/hooks/tdd-guard.mjs on` before the first phase Task. Set
  `phase red|green|refactor` before each phase Task and `phase clear` after
  each Refactor. Disarm `off` as the last action before `/commit`.
- Managed Cloud: after close-out, execute `.cursor/commands/commit.md`; on
  PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never
  `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr158_cover_capacity_findings_b7d4.plan.md`
- Workflow mode: FIX
- linear_issue: none (in-loop CodeRabbit refs `rmr158a` and `rmr158b` on PR #158; RES-69 already has Work started)

## Project & Milestone Route

- Team: key `RES`
- Project: untracked hint — restaurant-system V-0.5. This invocation is not a Linear ID, so no project write.
- Work type: implementation
- Milestone: M4 — Code Complete. Do not `save_issue` the milestone.
- Mixed design + implementation: no
- Clarification: none. The dated forward file matches `docs/runbooks/deploy.md` (hosted `tilcqrudqxznnpepxjqq` already recorded the baseline; editing it does not re-run).

## Issue & Root Cause

- Observed: `createTable` and a seat increase ignore a failed seat read and treat the total as 0. The check and the write are separate requests, so two growths or a growth racing a lower ceiling can commit a sum the stored maximum does not allow.
- Observed: `max_cover_capacity` exists only inside `00000000000000_baseline.sql`. A remote that already applied that version never runs the new `ALTER`.
- Expected: a failed seat read writes nothing. The authoritative check and the write share one transaction and `pg_advisory_xact_lock(69, 1)`. The same nullable column and check exist in a dated forward migration.
- Owning spec: `docs/specs/cover-capacity.md`
- Hypothesis: CC-2 and CC-5/CC-6 describe the column and the refusal, and they do not require a forward file or a lock held through the write. Pre-mortem: two staff add the last table together, or one lowers the ceiling while the other inserts, and both TypeScript checks pass.

## Permissions Requested

- `docs/specs/cover-capacity.md` — add CC-10 and CC-11. Do not edit any existing test.

## Spec

- Source: existing `docs/specs/cover-capacity.md`
- Add to Scope, after the guest-cannot-write sentence: an already-baselined remote gains the column from `supabase/migrations/20261004161500_max_cover_capacity.sql`. The authoritative ceiling check runs in the same database transaction as the write and takes `pg_advisory_xact_lock(69, 1)` before reading the seat total.
- Add criteria CC-10 and CC-11 as written in Acceptance Criteria → Tests.
- Set **Last updated:** 2026-10-04.

## Acceptance Criteria → Tests

| #   | Criterion                               | Risk | Layer | Test file                               | New or existing           | Test name                                                    | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Command                                                  | Depends on |
| --- | --------------------------------------- | ---- | ----- | --------------------------------------- | ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| 1   | CC-11 locked write and failed seat read | P0   | unit  | tests/unit/floor/cover-capacity.test.ts | new test in existing file | CC-11 failed seat read writes nothing and the lock is shared | `createTable` whose `tables` select returns `{ data: null, error: { message: "seats unavailable" } }` rejects `errors.floor.addTableFailed` and does not insert. A seat increase whose ordered `seats` select returns that error rejects `errors.floor.updateTableFailed` and does not update. Baseline and `supabase/migrations/20261004161500_max_cover_capacity.sql` both contain `pg_advisory_xact_lock(69, 1)`, `FUNCTION public.enforce_cover_capacity`, a `BEFORE INSERT OR UPDATE OF seats` trigger on `tables`, and a `BEFORE INSERT OR UPDATE OF max_cover_capacity` trigger on `restaurant_settings`, both executing `enforce_cover_capacity`. Both files `REVOKE` `EXECUTE` on that function from `PUBLIC`, `anon`, and `authenticated`. | `pnpm test:unit tests/unit/floor/cover-capacity.test.ts` | none       |
| 2   | CC-10 forward column                    | P0   | unit  | tests/unit/floor/cover-capacity.test.ts | new test in existing file | CC-10 forward migration adds the nullable ceiling            | `supabase/migrations/20261004161500_max_cover_capacity.sql` contains `ADD COLUMN IF NOT EXISTS max_cover_capacity INT` without `NOT NULL`, and a `CHECK` that allows null or `>= 1`. Baseline still has the same column and check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `pnpm test:unit tests/unit/floor/cover-capacity.test.ts` | CC-11      |

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                                       | Source file(s)                                                                                                                        | Risk | Status  |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| CC-11     | cover-capacity.md CC-11 | tests/unit/floor/cover-capacity.test.ts::CC-11 failed seat read writes nothing and the lock is shared | app/actions/operations.ts, supabase/migrations/00000000000000_baseline.sql, supabase/migrations/20261004161500_max_cover_capacity.sql | P0   | planned |
| CC-10     | cover-capacity.md CC-10 | tests/unit/floor/cover-capacity.test.ts::CC-10 forward migration adds the nullable ceiling            | supabase/migrations/20261004161500_max_cover_capacity.sql, supabase/migrations/00000000000000_baseline.sql                            | P0   | planned |

## Verification

- `pnpm test:unit tests/unit/floor/cover-capacity.test.ts`
- Sibling suites must stay green without edits: `pnpm test:unit tests/unit/floor/operations-shape.test.ts tests/unit/floor/message-keys.test.ts`

## Out of Scope

- Floor input seeding, empty-blur clear, and specific toasts.
- A live two-session integration race. The unit contract is the shared lock and the failed-read refusal.
- Applying the forward file on the hosted project from this run.

## Implementation shape (for Green; do not invent a second design)

- New file `supabase/migrations/20261004161500_max_cover_capacity.sql` only. Idempotent column, idempotent check (`DO $$ … EXCEPTION WHEN duplicate_object`), and the same function and triggers as the baseline.
- `public.enforce_cover_capacity()` is `SECURITY DEFINER`, `SET search_path = ''`, schema-qualified `public` names. It calls `pg_advisory_xact_lock(69, 1)` before any seat sum.
- On `restaurant_settings`, a null `max_cover_capacity` returns `NEW`. A number below `COALESCE(SUM(seats), 0)` raises `errors.floor.maxCoverCapacityBelowSum` (`ERRCODE` `P0001`).
- On `tables` UPDATE, unchanged seats or a decrease returns `NEW`. An insert, or an increase, with a null ceiling raises `errors.floor.maxCoverCapacityUnset`. A next sum above the ceiling raises `errors.floor.maxCoverCapacityReached`.
- `DELETE` has no capacity trigger.
- `REVOKE ALL` / `REVOKE EXECUTE` on the function from `PUBLIC`, `anon`, and `authenticated`.
- In `createTable`, a tables select `error` throws `errors.floor.addTableFailed` before `insert`. In `updateTableState`, a seat-sum select `error` throws `errors.floor.updateTableFailed` before the seats `update`. Do not change the happy-path query shape those sibling tests script.

## Execution todos

1. Invoke the `tdd-red` subagent to write the failing test for CC-11.
2. Invoke the `tdd-green` subagent to make CC-11 pass.
3. Invoke the `tdd-refactor` subagent to clean up CC-11 and re-verify.
4. Invoke the `tdd-red` subagent to write the failing test for CC-10.
5. Invoke the `tdd-green` subagent to make CC-10 pass.
6. Invoke the `tdd-refactor` subagent to clean up CC-10 and re-verify.

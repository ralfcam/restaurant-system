# /sdd-to-tdd RES-140 — capacity refusals return an error key

Managed Cloud one-shot. `agent/runtime` = `managed`. Branch
`cursor/res-140-8a41` from `origin/staging`. Ready brief Queue 2
(dispatch 2026-10-06) pre-authorizes the paths in Permissions Requested.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/cover-capacity.md`, (2) the findings revision pass on
  `docs/findings/runs/res-140_capacity_refusal_8a41.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-140_capacity_refusal_8a41.md` after
  `tdd-refactor`, and (4) at close-out, `## Suggested Review Order (collated)`,
  `## Traceability (final)`, and `## Run metrics` in that tdd log.
- **Every test change** comes from a `tdd-red` Task. **Every source change**
  from `tdd-green`. **Every cleanup** from `tdd-refactor`. One phase at a time.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- Do not edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`, or
  `supabase/**` yourself.
- START is the first execution Task, `run_in_background: true`. Do not wait
  before the spec edit or CC-6 Red.
- Arm `node .cursor/hooks/tdd-guard.mjs on` before the first phase Task. Set
  `phase red|green|refactor` before each phase Task and `phase clear` after
  Refactor. Disarm with `off` as the last action after commit/push.
- Close-out: 4D → 4E → docs-updater → 4C (skip register when the run file has
  no open lines) → 4B close-out comment → prettier on this run's dirty paths →
  STEP 4G coderabbit-gate → commit.md → push.md on PASS.
- Verification command for every phase:
  `pnpm test:unit tests/unit/floor/cover-capacity.test.ts`.
- A skipped test is not Red or Green. Do not `gh pr ready` or `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-140_capacity_refusal_8a41.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`), status Backlog (nonterminal).
  Only nonterminal RES version project. Issue already on this project.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Current milestone is already M4.
- Mixed design + implementation: no
- Clarification: resolved by the Ready brief decision (return `{ error: key }`,
  floor shows that message). No open `Clarification required` comment.

## Issue & Root Cause

- Issue: RES-140 — `createTable`, a seat increase in `updateTableState`, and
  `setMaxCoverCapacity` refuse by `throw new Error("errors.floor.…")`.
  Production turns that into a 500, and the floor `catch` blocks toast a
  generic failure, so staff never see the capacity message. Vercel logs show
  `errors.floor.maxCoverCapacityReached` and
  `errors.floor.maxCoverCapacityBelowSum`.
- Missing constraint: CC-6 says the refusal tells staff the maximum was
  reached, but it does not require a returned `{ error: key }`. CC-16 still
  says the below-sum refusal throws. `mergeTables` already returns
  `{ error: key }`. The floor catches throws and ignores a resolved error.
- Spec update proposed: `docs/specs/cover-capacity.md` CC-3, CC-4, CC-5, CC-6,
  and the below-sum sentence of CC-16. First execution action after START.

## Spec

- Source: extend `docs/specs/cover-capacity.md`
- Summary: a capacity business refusal returns `{ error: "<catalog key>" }`
  and does not throw. The floor toasts `t` of that key. A database error whose
  message is one of those keys is mapped to the same return. Read failures and
  unauthorized callers still throw. The ceiling input stays unbound.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion             | Risk | Layer | Test file                               | New or existing                      | Test name                                           | Assertion                                                                                                                                                                                                                                                                                                                                                | Command                                                  | Depends on |
| --- | --------------------- | ---- | ----- | --------------------------------------- | ------------------------------------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| 1   | CC-6 returned refusal | P1   | unit  | tests/unit/floor/cover-capacity.test.ts | existing-test edit plus one new test | CC-6 returns the reached key and the floor shows it | reached create and seat increase resolve `{ error: "errors.floor.maxCoverCapacityReached" }` and do not insert or update; unset, invalid, and below-sum resolve their keys; a DB error message equal to a capacity key is returned, not thrown as a generic failure; `addTable`, `adjustSeats`, and the ceiling blur handler toast `t` of `result.error` | `pnpm test:unit tests/unit/floor/cover-capacity.test.ts` | none       |

Infra: none (all unit/mocked).

## Traceability Matrix

| Criterion | Spec ref                                                 | Test file::name                                                             | Source file(s)                                             | Risk | Status  |
| --------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- | ---- | ------- |
| CC-6      | cover-capacity.md CC-6 (CC-3, CC-4, CC-5, CC-16 aligned) | cover-capacity.test.ts::CC-6 returns the reached key and the floor shows it | app/actions/operations.ts, components/staff/floor-plan.tsx | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested

- Spec create/edit: `docs/specs/cover-capacity.md` — capacity refusals return
  `{ error: key }` and the floor shows that key. Align CC-3, CC-4, CC-5, CC-6,
  and the below-sum sentence of CC-16. Read-failure throws in CC-11, CC-13,
  and CC-16 stay throws.
- Existing-test edit: `tests/unit/floor/cover-capacity.test.ts` — the current
  CC-3, CC-4, CC-5, and CC-6 cases expect those refusals to throw. Change only
  those refusal assertions to a resolved `{ error: key }`. Do not weaken
  read-failure, unauthorized, or generic failure throws.
- Allowed implementation files: `app/actions/operations.ts`,
  `components/staff/floor-plan.tsx`.
- Do not edit message catalogs (RES-142). Do not bind or roll back the ceiling
  input (RES-141). Do not add a migration.

## TDD Execution Loop

### Criterion 1 — CC-6 returned refusal (layer: unit)

- **Red** → Use the tdd-red subagent to write the failing regression for CC-6
  in `tests/unit/floor/cover-capacity.test.ts`. The plan authorizes editing
  the existing CC-3 unset, CC-4 invalid, CC-5 below-sum, and CC-6 reached
  assertions so each resolves `{ error: "<key>" }` instead of rejecting.
  Add one new test `CC-6 returns the reached key and the floor shows it` that
  (1) expects `createTable` and a seat increase over the ceiling to resolve
  `{ error: "errors.floor.maxCoverCapacityReached" }` with no write, (2)
  expects an insert/update/upsert error whose message is one of the four
  capacity keys to resolve `{ error: that key }` instead of
  `addTableFailed` / `updateTableFailed` / `maxCoverCapacitySaveFailed`, and
  (3) reads `components/staff/floor-plan.tsx` and expects `addTable`,
  `adjustSeats`, and the ceiling `onBlur` path to toast `t` of a returned
  `error` rather than only the generic failure toast. Run
  `pnpm test:unit tests/unit/floor/cover-capacity.test.ts`. Stop when the new
  or edited assertions fail because the actions still throw or the floor
  source still ignores a resolved error. Do not edit source.
- **Green** → Use the tdd-green subagent to make that test pass. Return
  `{ error: key }` for `maxCoverCapacityUnset`, `maxCoverCapacityInvalid`,
  `maxCoverCapacityBelowSum`, and `maxCoverCapacityReached`. Map a database
  error message that is one of those keys to the same return. Keep throws for
  unauthorized, read failures, and any other error. In the floor component,
  when `createTable`, the seat `updateTableState`, or `setMaxCoverCapacity`
  resolves `{ error }`, toast `t(error)` and do not treat it as success. Do
  not bind the ceiling input and do not add catalog strings. Do not edit tests
  or the spec.
- **Refactor** → Use the tdd-refactor subagent to clean the return mapping and
  the three floor branches without changing behavior. Re-run the unit test,
  `pnpm lint`, `pnpm typecheck`, and `pnpm exec prettier --check` on the
  touched source.

## Manual-UAT (deferred, not automated)

- None. The 500 digest is the production symptom of the throw this unit test
  pins. No live UAT in this loop.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-140_capacity_refusal_8a41`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-140_capacity_refusal_8a41.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/cover-capacity.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/cover-capacity.md` | existing-test edit `tests/unit/floor/cover-capacity.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-140_capacity_refusal_8a41.plan.md`

Problem: Capacity refusals throw `errors.floor` keys. Production turns the throw into a 500, and the floor catch blocks toast a generic failure, so staff never see the capacity message. The spec says the refusal tells staff the maximum was reached, but it still allows a throw, and the below-sum sentence still requires one.
Approach: Return `{ error: key }` for unset, invalid, below-sum, and reached, matching mergeTables. Map a database error whose message is one of those keys to the same return. Toast `t` of the returned key from add-table, seat increase, and the ceiling field. Leave read failures and unauthorized callers throwing. Do not bind the ceiling input and do not add catalog strings.
Out-of-scope findings: RES-141 empty ceiling field (already tracked) · RES-142 missing catalog keys (already tracked)

| #   | Criterion                                                      | Risk | Layer | Test file                               |
| --- | -------------------------------------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | Capacity refusals return { error: key } and the floor shows it | P1   | unit  | tests/unit/floor/cover-capacity.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to
start work on RES-140 (plan: `res-140_capacity_refusal_8a41`), posting this
plan's `## Linear Plan Digest`. Task `run_in_background: true`. Do not wait
before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then coderabbit-gate,
then commit.md, then push.md.

## Out-of-Scope Findings

| Finding                                                   | Where                                         | Why it matters                           | Severity | Relation                |
| --------------------------------------------------------- | --------------------------------------------- | ---------------------------------------- | -------- | ----------------------- |
| Ceiling field stays empty and does not roll back          | components/staff/floor-plan.tsx ceiling input | RES-141 already tracks the unbound input | P2       | already tracked RES-141 |
| Unset, invalid, and below-sum catalog strings are missing | messages/en.json, messages/fr.json            | RES-142 already tracks the missing keys  | P2       | already tracked RES-142 |

## Linear Close-out & Findings Registration

- START: background `linear-resolver` on RES-140 with the digest above.
- Close-out: resolution comment only. No workflow-state write.
- Findings registration: these two rows are already tracked. Do not file new
  issues for them. Skip REGISTER when the run file has no new open lines.

## Suggested Review Order

- Returned capacity keys → `app/actions/operations.ts` refusal returns
- Floor toast of `result.error` → `components/staff/floor-plan.tsx` addTable, adjustSeats, ceiling onBlur

## Retrospective

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized: pending close-out
- Run metrics: pending close-out

## First Execution Action

Launch START in the background, then edit `docs/specs/cover-capacity.md`, then
delegate CC-6 Red to `tdd-red`.

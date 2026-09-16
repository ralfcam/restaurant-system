# pr118_cr_gcr3_plan_th_a422e8f1

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/<plan-slug>.plan.md` (repository work-order, not a
  silently accepted native Cursor Plan). After a spec or living-findings
  (`docs/findings/<category>.md`) write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees (`docs/eval`,
  `docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. Run them
  sequentially, one **phase** at a time (not one criterion at a time), honoring
  each phase's exit condition before the next Task call.
- **Do not mark a phase done on subagent assertion alone**
  ([.cursor/rules/verification-before-completion.mdc](.cursor/rules/verification-before-completion.mdc)).
  A phase's "GREEN ✓" / "RED ✓" report is that subagent's claim; before
  advancing to the next Task call, the phase's own exit condition (the target
  test's actual pass/fail status) must be visible in the returned report — not
  assumed from a prior phase or from memory.
- **One Task call per phase.** Each todo is a single phase delegation; do not
  satisfy a bundled "drive criterion X" todo by doing Red+Green+Refactor in one
  turn, and do not treat a "same as the previous criterion" note as license to
  self-implement. If a phase lacks its own explicit entry, STOP and ask rather
  than improvising it inline.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`. Agent frontmatter owns the model; do not
  copy the parent chat's model into Task. Omitting `model` lets the pin apply;
  passing it overrides the pin and is forbidden unless the operator explicitly
  requested that model for this run.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself. If you are about to, STOP and issue the
  matching `Use the <agent> subagent to …` Task call instead.
  **Exception (mechanical only):** after close-out (docs-updater + 4C) and before
  STEP 4F, you MAY run `pnpm exec prettier --write` via Shell on
  paths already dirty from this run (`git status --porcelain`). Never
  `prettier --write .`. This is not a substitute for `tdd-*` implementation
  writes.
- Docs sync = `docs-updater` (background). **Wait for its report in-thread**
  before 4C. After 4C/4B, run the format pass, then STEP 4G, then STEP 4F.
- **START before the loop (launch, do not wait).** Skip — no tracked Linear ID.
- **Close-out sequence (mandatory):** 4D → 4E → Docs sync packet → Step 4
  (docs-updater) → 4C → skip 4B → format pass → STEP 4G → STEP 4F
  (managed Cloud: commit.md, on PASS push.md). Never `gh pr ready`. Never
  `gh pr merge`.
- If the delegation-guard hook is installed, arm it as your FIRST execution
  action (`node .cursor/hooks/tdd-guard.mjs on`) and disarm it as your LAST
  (`node .cursor/hooks/tdd-guard.mjs off`). Before each phase's Task call, set
  the active phase (`node .cursor/hooks/tdd-guard.mjs phase red|green|refactor`).
  Clear it (`phase clear`) once the criterion's Refactor exits green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr118_cr_gcr3_plan_th_a422e8f1.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (untracked hint)
- Project: untracked hint
- Work type: test/audit (toolchain release gate)
- Milestone: M5 (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text `bug: CodeRabbit finding on PR #118 rmr118-a422` — thread
  `cr-comment:v1:f8b640b33ef1f3d27e16ef67` on
  `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md:141`. Independent evidence
  (GraphQL + REST this turn): `isResolved: false`, `isOutdated: false`,
  `commit_id` is current HEAD `828aa96`. G-TD1 already ships spawn-level
  liveness (`828aa96`). Agents MUST NOT `@coderabbitai resolve`. Observed:
  `evaluateReadyPr` counts every unresolved US thread, including completed
  work-orders, so `/ready-merge-release` re-routes the same plan-file Major
  after the toolchain AC is already green. Expected: `.cursor/plans/**`
  threads are process-meta (work-orders are not `docs/specs/**`); they MUST
  NOT fail G-CR3 as `unresolved_threads` and MUST NOT be routed findings. An
  unresolved US thread on any other path MUST still fail closed.
- Missing constraint: G-CR3 already excludes issue/inline comments from
  finding-routing; it does not exclude work-order paths.
- Spec update proposed: qualify G-CR3 in `docs/specs/dev-toolchain.md`. Do
  not edit the completed plan file (untrusted review text). Do not weaken
  product-path `unresolved_threads`.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md` G-CR3
- Summary: Unresolved US review threads whose path is under `.cursor/plans/`
  are work-order process-meta, not finding-routing sources. They MUST NOT
  fail the gate as `unresolved_threads` and MUST NOT appear in routed
  findings. Product-path unresolved US threads remain fail-closed.
- Clarifications needed: none. Pre-mortem: ignoring every thread (or treating
  CodeRabbit status SUCCESS as APPROVED) would hide a live product Major.
  Inversion: a test that only source-scans the command file can pass while
  `evaluateReadyPr` still fail-closes on a plan-path thread.

## Acceptance Criteria → Tests

| #   | Criterion                                                              | Risk | Layer | Test file                                                    | New or existing | Test name                                                | Assertion                                                                                                                                                                                                                                                                                                                                          | Command                                                                     | Depends on |
| --- | ---------------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------------ | --------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| C1  | G-CR3 does not treat `.cursor/plans/**` threads as unresolved findings | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | existing file   | unresolved work-order plan thread is not a G-CR3 finding | `evaluateReadyPr` on a US APPROVED HEAD snapshot whose only unresolved US thread path is `.cursor/plans/*.plan.md` is not `unresolved_threads` (clean). The same snapshot with that thread path changed to `lib/billing/foo.ts` is `unresolved_threads`. Must call `evaluateReadyPr`; source-scan of a plan or command file MUST NOT be the proof. | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref               | Test file::name                                                                             | Source file(s)                                                   | Risk | Status  |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---- | ------- |
| C1        | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::unresolved work-order plan thread is not a G-CR3 finding | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` (`evaluateReadyPr`) | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — qualify G-CR3 so
  `.cursor/plans/**` unresolved US threads are not finding-routing sources.
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`
  — add one `it` (do not modify, rename, or delete existing tests).

## TDD Execution Loop

### Criterion C1 — work-order plan threads are not G-CR3 findings (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in
  `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` named
  "unresolved work-order plan thread is not a G-CR3 finding". Call
  `evaluateReadyPr` with a US APPROVED HEAD snapshot. Plan-path unresolved
  thread MUST NOT be `unresolved_threads`. Product-path unresolved thread
  MUST still be `unresolved_threads`. Do not source-scan a plan. Command:
  `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was actually RED. Minimal source
  change in `evaluateReadyPr` / `collectActiveCodeRabbitFindings`. Do not
  edit tests or the spec. Do not treat CodeRabbit status SUCCESS as APPROVED.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit:
  target green (executed) + lint + typecheck + prettier --check on touched
  source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4-format`.

`4d-review-trail` — INPUT: `docs/verifier-reports/tdd/pr118_cr_gcr3_plan_th_a422e8f1.md`. OUTPUT: `## Suggested Review Order (collated)`.

`4e-traceability` — INPUT: same log. OUTPUT: `## Traceability (final)` and `## Run metrics`.

`4c-findings` — INPUT: `docs/findings/runs/pr118_cr_gcr3_plan_th_a422e8f1.md`.

`4-format` — INPUT: dirty paths from `git status --porcelain`. Then STEP 4G, then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: pr118_cr_gcr3_plan_th_a422e8f1
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [G-CR3]
- source_paths: [.cursor/hooks/lib/coderabbit-pr-policy.mjs]
- test_paths: [tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr118_cr_gcr3_plan_th_a422e8f1.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where | Why it matters | Severity | Relation |
| ------- | ----- | -------------- | -------- | -------- |
| none    |       |                |          |          |

Do not edit `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md`.

## Linear Close-out & Findings Registration

- **START:** omit — no tracked Linear ID.
- **Close-out (4B):** omit.
- **Findings:** merge/register if the run file has open lines; skip if empty.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- plan-path exclusion → `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
- product-path still fail-closed → same
- executed G-CR3 test → `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`

## Retrospective (close-out, Step 4E)

- Patterns: none (seed)
- Traceability / metrics: yes (at close-out)
- harness-lint: pending close-out

## First Execution Action

- **Managed Cloud one-shot:** after this work-order exists, arm `tdd-guard`,
  apply the `docs/specs/dev-toolchain.md` G-CR3 edit, Prettier that spec,
  then Criterion 1 Red. After close-out: commit.md; on PASS push.md. Never
  `gh pr ready`. Never `gh pr merge`.

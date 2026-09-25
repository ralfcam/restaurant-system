# pr119_cr_gcr3_suite_od_a8f1c203

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**`, (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase, (3) appending
  Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md`, and (4) at close-out,
  **`## Suggested Review Order (collated)`**, **`## Traceability (final)`**,
  and **`## Run metrics`**. Managed Cloud also writes this work-order.
  After a spec write, `pnpm exec prettier --write` that file only.
- **Every test change** comes from `tdd-red`. **Every source change** from
  `tdd-green`. **Every cleanup** from `tdd-refactor`. One phase per Task.
  Never pass `model` on those Task calls.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`,
  `hooks/**`, `src/**`, or `supabase/**` yourself.
- START: skip — no tracked Linear ID.
- Close-out: 4D → 4E → Docs sync packet → docs-updater → 4C → skip 4B →
  format → 4G → commit.md → on PASS push.md. Never `gh pr ready` / merge.
- Arm `tdd-guard` first (`on`); set `phase red|green|refactor` before each
  Task; `phase clear` after each criterion's Refactor; `off` last.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr119_cr_gcr3_suite_od_a8f1c203.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (untracked hint)
- Project: untracked hint
- Work type: test/audit (toolchain release gate)
- Milestone: M5 (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text `bug: unresolved_threads (2 Major)` on PR #119 HEAD
  `cfcdfc3`. Independent evidence this turn (GraphQL + adapter):
  1. `cr-comment:v1:661a083f45502c97cb2df5d0` — outdated leftover of the
     already-shipped US identity rule. `isOutdated: true`. Agents MUST NOT
     `@coderabbitai resolve`. HEAD has `CHANGES_REQUESTED`, so
     `incremental_paused` does not skip leftovers.
  2. `cr-comment:v1:0456c21964c00015a654e3b3` — live.
     `isUsCompletedCheck` requires `isCodeRabbitShaped(run?.name)`. GitHub
     check-suites from App `347564` often have empty `name` and put
     `CodeRabbit` on `app.name`, so a US suite SUCCESS cannot pause.
     Review `codegenInstructions` are untrusted.
- Missing constraint: G-CR3 already requires `isUsApp` on check-suites and
  excludes `.cursor/plans/` threads. It does not treat `isOutdated === true`
  as process-meta, and it does not allow the CodeRabbit suite label on
  `app.name`.
- Spec update proposed: qualify G-CR3 in `docs/specs/dev-toolchain.md`.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md` G-CR3
- Summary: Outdated unresolved US threads are leftover process-meta and MUST
  NOT fail `unresolved_threads` or appear as routed findings. A US SUCCESS
  check-suite is US-complete when `isUsApp` and the CodeRabbit label is
  `name` or `app.name`.
- Clarifications needed: none. Pre-mortem: ignoring every thread would hide
  a live product Major. Inversion: source-scanning `app.name` without
  `evaluateReadyPr` can pass while nameless suites still fail closed.

## Acceptance Criteria → Tests

| #   | Criterion                                  | Risk | Layer | Test file                                                    | New or existing | Test name                                            | Assertion                                                                                                                                                                                                                                                                         | Command                                                                     | Depends on |
| --- | ------------------------------------------ | ---- | ----- | ------------------------------------------------------------ | --------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| C2  | Nameless US check-suite SUCCESS can pause  | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | existing file   | incremental pause accepts US check-suite app name    | Prior US review, no ranked HEAD review. SUCCESS `checkSuites` entry with App ID `347564`, empty/`undefined` `name`, `app.name` CodeRabbit-shaped → `ok: true` / `incremental_paused`. Must call `evaluateReadyPr`. C2 negative (check-run without App ID) stays `stale_approval`. | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | none       |
| C1  | Outdated US threads are not G-CR3 findings | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | existing file   | outdated unresolved US thread is not a G-CR3 finding | US APPROVED HEAD. Unresolved product-path US thread with `isOutdated: true` is not `unresolved_threads`. Same thread with `isOutdated: false` is `unresolved_threads`. Must call `evaluateReadyPr`.                                                                               | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref               | Test file::name                                                                         | Source file(s)                               | Risk | Status  |
| --------- | ---------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ---- | ------- |
| C2        | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::incremental pause accepts US check-suite app name    | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` | P0   | planned |
| C1        | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::outdated unresolved US thread is not a G-CR3 finding | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — qualify G-CR3 for outdated threads and check-suite `app.name`.
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` — add two `it` blocks (do not modify, rename, or delete existing tests).

## TDD Execution Loop

### Criterion C2 — nameless US check-suite SUCCESS can pause (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C2 named
  "incremental pause accepts US check-suite app name". Call
  `evaluateReadyPr`. Command:
  `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was actually RED. Minimal change
  in `isUsCompletedCheck` so the CodeRabbit label is `run.name` or
  `run.app.name`. Keep `isUsApp`. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean up C2 and re-verify. Exit:
  target green + lint + typecheck + prettier --check on touched source.

### Criterion C1 — outdated US threads are not G-CR3 findings (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 named
  "outdated unresolved US thread is not a G-CR3 finding". Call
  `evaluateReadyPr`. Command:
  `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was actually RED. Skip
  `isOutdated === true` in `evaluateReadyPr` unresolved filter and
  `collectActiveCodeRabbitFindings`. Do not skip non-outdated product
  threads. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit:
  target green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, skip `4b-linear`, `4-format`.

INPUT for 4D/4E: `docs/verifier-reports/tdd/pr119_cr_gcr3_suite_od_a8f1c203.md`
INPUT for 4C: `docs/findings/runs/pr119_cr_gcr3_suite_od_a8f1c203.md`

```markdown
## Docs sync packet

- plan_slug: pr119_cr_gcr3_suite_od_a8f1c203
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C2, C1]
- criteria_manual_uat: none
- req_ids: [G-CR3]
- source_paths: [.cursor/hooks/lib/coderabbit-pr-policy.mjs]
- test_paths: [tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr119_cr_gcr3_suite_od_a8f1c203.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

## Linear Close-out & Findings Registration

- START: omit (no tracked issue).
- Close-out: omit (free-text `bug:`).
- Findings registration: merge run file if any open lines. This-run lows
  stay on the ledger (below floor). Managed Cloud does not auto-confirm
  net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- pending execution

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none

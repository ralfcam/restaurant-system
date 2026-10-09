# /sdd-to-tdd bug: CodeRabbit findings on PR #200 head 2694a18

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-09).
Stays on `cursor/coderabbit-cli-on-push-567e`. Jose authorized the listed
fixes. No tracked Linear issue — skip START and CLOSE-OUT. In-loop
CodeRabbit `CHANGES_REQUESTED` on PR #200 head `2694a18`.

Verification: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs .cursor/checks/coderabbit-review-policy.test.mjs && pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.

Owning tests live under `.cursor/checks/` (harness). Those edits are
pre-authorized here; `tdd-red` cannot write outside `tests/**`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/dev-toolchain.md`, (2) the findings revision pass on
  `docs/findings/runs/pr200_cr_deadline_rounds_567e.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/pr200_cr_deadline_rounds_567e.md` after
  `tdd-refactor`, and (4) at close-out, **`## Suggested Review Order
(collated)`**, **`## Traceability (final)`**, and **`## Run metrics`** in
  that tdd log. After a spec or living-findings write, `pnpm exec prettier
--write` **that file** (never `prettier --write .`). Snapshot trees
  (`docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Harness tests under `.cursor/checks/` are pre-authorized because the
  owning layer is node:test, not `tests/**`.
- **Do not mark a phase done on subagent assertion alone.**
- Docs sync = `docs-updater`. Linear START and close-out are skipped.
- Never `gh pr ready`. Never `gh pr merge`.
- A skipped test is not Red or Green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr200_cr_deadline_rounds_567e.plan.md`
- Workflow mode: FIX

## Issue & Root Cause (FIX mode only)

- Issue: CodeRabbit `CHANGES_REQUESTED` on PR #200 head `2694a18`.
- Missing constraints: G-CR2 printed `fixRound` must be the started
  round; a completed push must clear the saved cycle; `runCr` must have
  an absolute deadline; G-CR3 must check in-progress before
  `incremental_paused`.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-CR2 + G-CR3.

## Spec

- Source: extend `docs/specs/dev-toolchain.md`
- Summary: `/push` prints the started `fixRound` on `route`. A completed
  `push` clears the saved cycle. `runCr` times out on inactivity or an
  absolute deadline and records `unavailable` / `timeout`. Ready-merge
  checks in-progress-on-head before `incremental_paused`.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                | Test file                                          | Test name                                                                |
| --- | -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| C1  | Route prints started `fixRound`; isolated second uses it | `.cursor/checks/coderabbit-gate.test.mjs`          | route prints started fixRound and isolated second run uses that output   |
| C2  | In-progress before `incremental_paused`                  | `.cursor/checks/coderabbit-pr-policy.test.mjs`     | incremental pause plus in-progress on head is review_in_progress         |
| C3  | Completed push clears saved fix round                    | `.cursor/checks/coderabbit-gate.test.mjs`          | completed push clears the saved fix round for a later independent review |
| C4  | Absolute deadline on `runCr`                             | `.cursor/checks/coderabbit-review-policy.test.mjs` | isCrRunExpired fires on absolute deadline even when stdout is recent     |
| C5  | Continuous stdout still times out                        | `.cursor/checks/coderabbit-gate.test.mjs`          | runCr times out on continuous stdout at the absolute deadline            |

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md`
- Existing-test edit: `.cursor/checks/coderabbit-gate.test.mjs`
- Existing-test edit: `.cursor/checks/coderabbit-pr-policy.test.mjs`
- Existing-test edit: `.cursor/checks/coderabbit-review-policy.test.mjs`
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts`
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`

## Linear Plan Digest

Skipped — no tracked issue.

## Out-of-Scope Findings

- none yet

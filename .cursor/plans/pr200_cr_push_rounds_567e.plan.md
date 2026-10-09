# /sdd-to-tdd bug: CodeRabbit findings on PR #200

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-09).
Stays on `cursor/coderabbit-cli-on-push-567e`. Jose authorized the listed
fixes. No tracked Linear issue — skip START and CLOSE-OUT. In-loop CodeRabbit
finding on PR #200.

Verification: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs .cursor/checks/coderabbit-review-policy.test.mjs && pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts tests/unit/dev-toolchain/push-gate-evidence.test.ts tests/unit/dev-toolchain/coderabbit-cloud-install.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/dev-toolchain.md`, (2) the findings revision pass on
  `docs/findings/runs/pr200_cr_push_rounds_567e.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/pr200_cr_push_rounds_567e.md` after
  `tdd-refactor`, and (4) at close-out, **`## Suggested Review Order
(collated)`**, **`## Traceability (final)`**, and **`## Run metrics`** in
  that tdd log. After a spec or living-findings write, `pnpm exec prettier
--write` **that file** (never `prettier --write .`). Snapshot trees
  (`docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source
  change** from `tdd-green`. **Every cleanup / re-verify** from
  `tdd-refactor`. Run them sequentially, one **phase** at a time.
- **Do not mark a phase done on subagent assertion alone.** Before advancing,
  the phase's exit condition must be visible from a fresh command in this
  turn, and the diff must match the report.
- **One Task call per phase.** Never pass `model` on Task for `tdd-red` /
  `tdd-green` / `tdd-refactor` / `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`,
  `hooks/**`, `src/**`, or `supabase/**` yourself.
- Docs sync = `docs-updater`. **Wait for its report** before 4C. Linear START
  and close-out are skipped (no tracked issue).
- Arm `node .cursor/hooks/tdd-guard.mjs on` as the first execution shell
  action. Set `phase red|green|refactor` before each phase Task and
  `phase clear` after Refactor. Disarm with `off` as the last action after
  commit/push (or on a stop).
- **Close-out sequence:** 4D → 4E → Docs sync packet → Step 4 (docs-updater)
  → 4C → format pass → STEP 4G (do not run the CLI) → STEP 4F (`/commit`,
  then `/push` on PASS). Never `gh pr ready`. Never `gh pr merge`.
- The owning tests are node:test files under `.cursor/checks/` plus the
  named Vitest files. Permissions Requested pre-authorizes those existing-test
  edits. A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr200_cr_push_rounds_567e.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (hint only — untracked)
- Project: untracked hint — restaurant-system V-0.5
- Work type: implementation (toolchain gate)
- Milestone: M4 — Code Complete (Feature Freeze)
- Mixed design + implementation: no
- Clarification: none — Jose named the seven contracts

## Issue & Root Cause (FIX mode only)

- Issue: free-text CodeRabbit / Jose findings on PR #200 (`2357885`).
- Missing constraint: G-CR2 one-fix-round, G-CR3 in-progress-before-stale,
  capture-and-push, post-merge gate rerun, expired-wait adapter flag,
  advisory secret_path on `/push`, and work-order-only `cli_paused`.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-CR2 + G-CR3.

## Spec

- Source: extend `docs/specs/dev-toolchain.md`
- Summary: `/push` counts one remediation cycle (survives the fix commit and
  a new VM via `--fix-round` or the PR-body leftover record). Ready-merge
  checks in-progress-on-head before `stale_approval` and maps an expired wait
  with `--review-wait-expired`. Minor/Trivial capture-and-push. Firewall
  merge reruns the unit gate. `secret_path` / non-zero gate never stop
  `/push`. `cli_paused` is work-order-only. `.env.example` is not a secret.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                           | Risk | Layer | Test file                                                               | New or existing | Test name                                                                      | Assertion                                             | Command                                                                                | Depends on |
| --- | --------------------------------------------------- | ---- | ----- | ----------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------- |
| C1  | Fix-round survives its fix commit and `--fix-round` | P1   | unit  | `.cursor/checks/coderabbit-gate.test.mjs`                               | existing        | route then new head is leftover after one fix round                            | action `push`, record `leftover_after_fix_round`      | `node --test .cursor/checks/coderabbit-gate.test.mjs`                                  | none       |
| C2  | In-progress-on-head before stale_approval           | P1   | unit  | `.cursor/checks/coderabbit-pr-policy.test.mjs`                          | existing        | older-head CHANGES_REQUESTED plus in-progress on head is review_in_progress    | reason `review_in_progress`                           | `node --test .cursor/checks/coderabbit-pr-policy.test.mjs`                             | none       |
| C3  | Minor/Trivial capture-and-push                      | P2   | unit  | `.cursor/checks/coderabbit-pr-policy.test.mjs`                          | existing        | push CLI action routes one fix round then leftover-pushes                      | Minor action `push`, record `capture_and_push`        | `node --test .cursor/checks/coderabbit-pr-policy.test.mjs`                             | none       |
| C4  | Rerun unit gate after firewall merge                | P2   | unit  | `tests/unit/dev-toolchain/push-gate-evidence.test.ts`                   | existing        | reruns lint typecheck and unit after a firewall merge                          | push.md contains the rerun                            | `pnpm test:unit tests/unit/dev-toolchain/push-gate-evidence.test.ts`                   | none       |
| C5  | `--review-wait-expired` maps in-progress            | P2   | unit  | `.cursor/checks/coderabbit-pr-policy.test.mjs`                          | existing        | review-wait-expired maps review_in_progress to ready_no_coderabbit_review      | reason `ready_no_coderabbit_review`                   | `node --test .cursor/checks/coderabbit-pr-policy.test.mjs`                             | C2         |
| C6  | `.env.example` is not secret; `/push` continues     | P2   | unit  | `.cursor/checks/coderabbit-review-policy.test.mjs`                      | existing        | unrelatedDirtyPaths and secret paths fail the work-order                       | `isSecretPath(".env.example")` is false               | `node --test .cursor/checks/coderabbit-review-policy.test.mjs`                         | none       |
| C7  | `cli_paused` is work-order-only                     | P2   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts` | existing        | G-CR2 makes local review outcomes advisory but keeps deterministic safety hard | G-CR2 body scopes `cli_paused` to the work-order path | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                    | Test file::name                                                                                            | Source file(s)                                                           | Risk | Status  |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- | ------- |
| C1        | G-CR2 one fix round         | coderabbit-gate.test.mjs::route then new head is leftover after one fix round                              | coderabbit-review-policy.mjs, coderabbit-gate.mjs                        | P1   | planned |
| C2        | G-CR3 in-progress first     | coderabbit-pr-policy.test.mjs::older-head CHANGES_REQUESTED plus in-progress on head is review_in_progress | coderabbit-pr-policy.mjs                                                 | P1   | planned |
| C3        | G-CR2 severity-only push    | coderabbit-pr-policy.test.mjs::push CLI action routes one fix round then leftover-pushes                   | coderabbit-pr-policy.mjs, push.md                                        | P2   | planned |
| C4        | G-CR2 post-merge gate       | push-gate-evidence.test.ts::reruns lint typecheck and unit after a firewall merge                          | push.md                                                                  | P2   | planned |
| C5        | G-CR3 expired wait          | coderabbit-pr-policy.test.mjs::review-wait-expired maps review_in_progress to ready_no_coderabbit_review   | coderabbit-pr-policy.mjs, coderabbit-pr-gate.mjs, ready-merge-release.md | P2   | planned |
| C6        | G-CR2 secret_path           | coderabbit-review-policy.test.mjs::unrelatedDirtyPaths and secret paths fail the work-order                | coderabbit-review-policy.mjs, coderabbit-gate.mjs, push.md               | P2   | planned |
| C7        | G-CR2 work-order cli_paused | coderabbit-gcr2-empty-reviewed-files.test.ts::G-CR2 makes local review outcomes advisory                   | docs/specs/dev-toolchain.md                                              | P2   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — encode C1–C7 in G-CR2/G-CR3.
- Existing-test edit: `.cursor/checks/coderabbit-gate.test.mjs` — C1/C6 branch-diff cases.
- Existing-test edit: `.cursor/checks/coderabbit-pr-policy.test.mjs` — C2/C3/C5.
- Existing-test edit: `.cursor/checks/coderabbit-review-policy.test.mjs` — C1/C6.
- Existing-test edit: `tests/unit/dev-toolchain/push-gate-evidence.test.ts` — C4.
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts` — C7.

## TDD Execution Loop

### Criterion 1 — Fix-round survives its fix commit (layer: unit)

- **Red** → Invoke `tdd-red` to add `route then new head is leftover after one fix round` in `.cursor/checks/coderabbit-gate.test.mjs` and the `--fix-round` / leftover-record cases in `.cursor/checks/coderabbit-review-policy.test.mjs`. Exit = those tests fail.
- **Green** → Invoke `tdd-green` to keep `resolvePushPriorRound` across HEAD/finding-ID change on the same branch and honour `--fix-round` / leftover record. Exit = those tests pass.
- **Refactor** → Invoke `tdd-refactor` to tidy the cycle helpers. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion 2 — In-progress-on-head before stale_approval (layer: unit)

- **Red** → Invoke `tdd-red` to add fixture `remote-review-stale-plus-in-progress.json` and test `older-head CHANGES_REQUESTED plus in-progress on head is review_in_progress`. Exit = fail with `stale_approval`.
- **Green** → Invoke `tdd-green` to check `hasCodeRabbitReviewInProgress` before `formalElsewhere`. Exit = `review_in_progress`.
- **Refactor** → Invoke `tdd-refactor` to tighten in-progress to US app / US creator and exclude the paused Actions job if cheap. Exit = green + lint + typecheck + prettier --check.

### Criterion 3 — Minor/Trivial capture-and-push (layer: unit)

- **Red** → Invoke `tdd-red` to change the Minor/Trivial cases in `push CLI action routes one fix round then leftover-pushes` to expect `action: push` and `record: capture_and_push`. Exit = fail.
- **Green** → Invoke `tdd-green` to return `route` only when `sddToTdd.length > 0`. Exit = pass.
- **Refactor** → Invoke `tdd-refactor` to update `push.md` 1b. Exit = green + lint + typecheck + prettier --check.

### Criterion 4 — Rerun unit gate after firewall merge (layer: unit)

- **Red** → Invoke `tdd-red` to add `reruns lint typecheck and unit after a firewall merge` in `push-gate-evidence.test.ts`. Exit = fail.
- **Green** → Invoke `tdd-green` to add the rerun to `push.md` Step 1a. Exit = pass.
- **Refactor** → Invoke `tdd-refactor` to keep the sentence next to the merge. Exit = green + lint + typecheck + prettier --check.

### Criterion 5 — `--review-wait-expired` (layer: unit)

- **Red** → Invoke `tdd-red` to add `review-wait-expired maps review_in_progress to ready_no_coderabbit_review`. Exit = fail.
- **Green** → Invoke `tdd-green` to add the adapter flag and have Step 4 pass it. Exit = pass.
- **Refactor** → Invoke `tdd-refactor` to keep formal reviews after the mapping. Exit = green + lint + typecheck + prettier --check.

### Criterion 6 — `.env.example` and advisory secret_path (layer: unit)

- **Red** → Invoke `tdd-red` to assert `isSecretPath(".env.example") === false` and branch-diff `.env` is `unavailable` / `secret_path` exit 0. Exit = fail.
- **Green** → Invoke `tdd-green` to exclude `.env.example` and treat `--branch-diff` secrets as advisory. Update `push.md` 1b. Exit = pass.
- **Refactor** → Invoke `tdd-refactor` to keep work-order `.env` hard-fail. Exit = green + lint + typecheck + prettier --check.

### Criterion 7 — `cli_paused` is work-order-only (layer: unit)

- **Red** → Invoke `tdd-red` to pin the G-CR2 body so `cli_paused` / MUST NOT spawn is work-order-only. Exit = fail until the spec edit lands.
- **Green** → Invoke `tdd-green` — spec already lists the path; no extra source. Exit = pass.
- **Refactor** → Invoke `tdd-refactor` to mirror the Implementation trace. Exit = green + lint + typecheck + prettier --check.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Skipped — no tracked issue.

## Out-of-Scope Findings

- none yet

## Risks & Edge Cases

- Same-branch leftover after an independent later review: `--fix-round` and the PR-body leftover record are the cross-VM signal; same-VM state still keeps the cycle across the fix commit.
- Expired wait plus older-head `CHANGES_REQUESTED` still returns `stale_approval` (formal reviews still apply).

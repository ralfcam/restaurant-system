# /sdd-to-tdd RES-145 — loop capture-only findings

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-09).
Branch `cursor/res-145-1771` from `origin/staging`. Ready brief Queue 1
(dispatch 2026-10-09) pre-authorizes the paths in Permissions Requested.
Verification: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs && pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts tests/unit/dev-toolchain/conduct-command.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/dev-toolchain.md`, (2) the findings revision pass on
  `docs/findings/runs/res-145_loop_capture_only_1771.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-145_loop_capture_only_1771.md` after
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
- Docs sync = `docs-updater`. **Wait for its report** before 4C. Linear START,
  close-out, and finding registration = `linear-resolver`. START is the first
  execution Task, `run_in_background: true`. Do **not** wait for START before
  the spec edit or C1 Red.
- Arm `node .cursor/hooks/tdd-guard.mjs on` as the first execution shell
  action. Set `phase red|green|refactor` before each phase Task and
  `phase clear` after Refactor. Disarm with `off` as the last action after
  commit/push (or on a stop).
- **Close-out sequence:** 4D → 4E → Docs sync packet → Step 4 (docs-updater)
  → 4C → 4B → format pass (`pnpm exec prettier --write` on this run's dirty
  paths; never `.`) → STEP 4G (`node .cursor/checks/coderabbit-gate.mjs`) →
  STEP 4F (`.cursor/commands/commit.md`, then `.cursor/commands/push.md` on
  PASS). Never `gh pr ready`. Never `gh pr merge`.
- The owning tests are node:test files under `.cursor/checks/`, which is the
  established suite for this gate. Permissions Requested pre-authorizes Red
  to add tests and fixtures there. Do not modify existing tests.
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-145_loop_capture_only_1771.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. Only nonterminal RES version
  project. Team key confirmed `RES`.
- Work type: implementation (toolchain gate).
- Milestone: M4 — Code Complete (Feature Freeze). The issue is already on
  that milestone. No move.
- Mixed design + implementation: no. Decisions in the Ready brief name the
  reason strings and the routing.
- Clarification: resolved by Ready brief Decisions (2026-10-09). No
  unanswered `Clarification required` comment.

## Issue & Root Cause (FIX mode only)

- Issue: RES-145. Under `--loop`, `evaluateReadyPr` returns
  `changes_requested` when the latest US review is `CHANGES_REQUESTED`, the
  only inline thread is on `.cursor/plans/**` (dropped as process-meta), and
  the product finding exists only in the review body. Further rounds cannot
  change the head, so the conductor lane dead-ends.
- Evidence: PR 193 review `5456311108` on head `f5c7e1d69addc046d9f89f6d890c5137041eb887`
  is `CHANGES_REQUESTED`. Its inline thread is an unresolved Major on
  `.cursor/plans/res-124_guest_pii_b839.plan.md` (`cr-comment:v1:38d764802c7598c99a1a6827`,
  severity `**🟠 Major**`). Its body groups a Minor on
  `app/actions/guest-profiles.ts` line `66-66`
  (`cr-comment:v1:ffc449232d7947fca6bb62c8`) inside
  `<summary>🟡 Other comments (1)</summary>`, and repeats instructions under
  `<summary>🤖 Prompt to fix review comments</summary>` with no second
  product id. `isQuietModeWalkthroughBody` is false because
  `Actionable comments posted: 1`.
- Sibling: `collectCommentedReviewBodyFindings` parses only `COMMENTED`
  reviews and only the `| _Minor_ |` first-line form.
  `captured_threads_resolved` requires a resolved product thread.
  `changes_requested_meta_only` requires a quiet walkthrough. None of those
  match this snapshot, so the function falls through to `changes_requested`.
- Missing constraint: G-CR4 says a `CHANGES_REQUESTED` review with no
  resolved product thread stays `changes_requested`. It does not require
  collecting exempt-plan threads and review-body `cr-comment:v1` blocks
  under `--loop`.
- Hypothesis (one): the dead-end is that drop, not a missing GitHub write.
  The spec must require the `--loop` verdicts below. Confirmed against the
  current `evaluateReadyPrCore` fall-through and the PR 193 payload.

## Spec

- File: `docs/specs/dev-toolchain.md` criterion G-CR4 (amend the numbered
  item and the implementation-trace row).
- Under `--loop` only, after unresolved product threads and
  `captured_threads_resolved` are decided, when the latest current-head US
  review is `CHANGES_REQUESTED`:
  1. Collect exempt findings: unresolved, non-outdated US threads whose
     path starts with `.cursor/plans/`. Each finding has id, path, line
     when a backtick line range exists, severity, title, `process: true`,
     and command `/capture`. Outdated threads are not findings.
  2. Collect review-body findings from that latest US review, one per
     `<!-- cr-comment:v1:<id> -->` outside the Prompt-to-fix details block
     and outside walkthrough sections. Path is the enclosing
     `<summary>path (n)</summary>` file. Line is the start of the first
     `` `N-N` `` or `` `N` `` in the block. Severity is read from
     `**…Critical|Major|Minor|Trivial…**` (emoji allowed), not only from
     `| _Minor_ |`. A body finding whose path starts with `.cursor/plans/`
     is `process: true` and `/capture`. Any other body finding uses
     `classifyFindingRouting(..., { loop: true })`. Dedupe by finding id
     against inline threads and against other body blocks.
  3. If any collected finding's command is `/sdd-to-tdd`, return
     `ok: false`, reason `changes_requested_body_findings`, with those
     findings.
  4. Otherwise, if at least one finding was collected, return `ok: true`,
     reason `capture_only_findings`, with those findings, plus
     `readyMetadata`, `roundsUsed`, and `roundCap`.
  5. If nothing was collected and the body is a quiet-mode walkthrough,
     keep `changes_requested_meta_only`.
  6. If nothing was collected, keep `changes_requested` (the existing
     `noThread` case).
- Without `--loop`, every existing verdict stays, including
  `changes_requested` for the PR 193 shape.
- `capture_only_findings` takes precedence over
  `changes_requested_meta_only` when an exempt or body finding was
  collected. A walkthrough with nothing collected stays
  `changes_requested_meta_only`.
- The adapter stays read-only: no comment, no thread resolve, no ready.
- `/ready-merge-release` treats `capture_only_findings` like
  `incremental_paused`: one paste-ready `/capture` fence per finding, then
  Step 2 is clean and the draft is readied.
- `/conduct` treats `capture_only_findings` as a clean loop preflight. It
  runs `/capture` for each finding whose path is not already an open
  `docs/findings/` line, does not start another `/sdd-to-tdd` round for
  those findings, and does not report the reason as an operational FAIL.
- `changes_requested_body_findings` routes to `/sdd-to-tdd` like other
  Critical or unknown blockers.

## Acceptance Criteria → Tests

### C1 — loop exempt-plan plus body findings (layer: unit, risk P0)

- Behavior: the PR 193-shaped snapshot under `--loop` returns
  `ok: true`, reason `capture_only_findings`, with exactly two `/capture`
  findings: the plan thread (`process: true`, path
  `.cursor/plans/res-124_guest_pii_b839.plan.md`, id
  `cr-comment:v1:38d764802c7598c99a1a6827`, severity `major`) and the body
  Minor (path `app/actions/guest-profiles.ts`, line `66`, id
  `cr-comment:v1:ffc449232d7947fca6bb62c8`, severity `minor`, not
  `process: true`). A `cr-comment` id that appears only inside the
  Prompt-to-fix block is absent. The same snapshot without `--loop`
  returns `ok: false`, reason `changes_requested`.
- An exempt-plan-only snapshot (empty body) under `--loop` returns
  `capture_only_findings` with one process finding. A walkthrough-only
  body with no threads still returns `changes_requested_meta_only` without
  `--loop` and with `--loop`. An exempt thread plus a walkthrough body
  under `--loop` returns `capture_only_findings` (precedence). An outdated
  plan thread plus a body Minor under `--loop` returns
  `capture_only_findings` whose findings do not include the outdated
  thread. A product-path Critical body finding under `--loop` returns
  `ok: false`, reason `changes_requested_body_findings`, command
  `/sdd-to-tdd`. An unresolved product-path thread still returns
  `unresolved_threads`. The existing `noThread` test is not edited.
- Test: one new `describe` in
  `.cursor/checks/coderabbit-pr-policy.test.mjs` and one new `test` in
  `.cursor/checks/coderabbit-gate.test.mjs`. Fixtures:
  `.cursor/checks/fixtures/coderabbit/remote-loop-exempt-plan-body-minor.json`,
  `remote-loop-exempt-plan-only.json`,
  `remote-loop-body-critical.json`.
- Gate test: `node .cursor/checks/coderabbit-pr-gate.mjs --snapshot
<exempt-plan-body-minor> --allow-draft --loop` exits 0 with
  `capture_only_findings`; the same command without `--loop` exits
  non-zero with `changes_requested`.
- Doc asserts in that describe: `ready-merge-release.md`, `conduct.md`,
  `coderabbit-integration.mdc`, and `docs/runbooks/coderabbit.md` contain
  `capture_only_findings` and `changes_requested_body_findings`. The gate
  header comment names `capture_only_findings` and still says the adapter
  does not comment, ready, or merge.
- Command: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs`.
- Dependencies: spec edit first. No existing-test edit.

## Traceability Matrix

| Criterion | Spec                                      | Test                                                                                | Layer |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| C1        | G-CR4 loop capture-only and body findings | `coderabbit-pr-policy.test.mjs` describe + `coderabbit-gate.test.mjs` snapshot test | unit  |

## Execution Preconditions

- Infra: none. Node test and Vitest unit only. No Supabase, no Playwright.

## Permissions Requested (before execution)

- Spec edit: `docs/specs/dev-toolchain.md` (G-CR4 numbered item and table row).
- New tests (not edits of existing tests): `.cursor/checks/coderabbit-pr-policy.test.mjs`, `.cursor/checks/coderabbit-gate.test.mjs`.
- New fixtures: `.cursor/checks/fixtures/coderabbit/remote-loop-exempt-plan-body-minor.json`, `remote-loop-exempt-plan-only.json`, `remote-loop-body-critical.json`.
- Source: `.cursor/hooks/lib/coderabbit-pr-policy.mjs`.
- Header comment only: `.cursor/checks/coderabbit-pr-gate.mjs`.
- Docs the new test reads: `.cursor/commands/ready-merge-release.md`, `.cursor/commands/conduct.md`, `.cursor/rules/coderabbit-integration.mdc`, `docs/runbooks/coderabbit.md`.
- `tests/unit/dev-toolchain/` only if an existing doc-string guard must learn the new reason. Do not edit those tests unless a guard fails.

## TDD Execution Loop

### C1 — loop exempt-plan plus body findings (layer: unit)

1. Red — failing describe and gate test, plus the three fixtures. Exit: the new tests fail on today's `changes_requested` (or missing doc strings), not on a missing import.
2. Green — minimal policy, header comment, and the four doc files so those new tests pass. Do not edit tests or the spec.
3. Refactor — cleanup only, then re-run the verification command, `pnpm lint`, and `pnpm typecheck`.

## Manual-UAT (deferred, not automated)

none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Work started: `/sdd-to-tdd` execution · plan `res-145_loop_capture_only_1771`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-145_loop_capture_only_1771.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec edit `docs/specs/dev-toolchain.md` | new tests under `.cursor/checks/` | none existing-test edit
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-145_loop_capture_only_1771.plan.md`

Problem: Under `--loop`, a current-head US `CHANGES_REQUESTED` review whose only inline thread sits on `.cursor/plans/**` and whose product finding is only in the review body returns `changes_requested`. The head never changes, so the conductor lane stops. G-CR4 does not require collecting those exempt threads and `cr-comment:v1` body blocks.
Approach: Under `--loop` only, after product-thread checks, collect exempt plan threads as `/capture` process findings and parse review-body `cr-comment:v1` blocks. All-capture results return `capture_only_findings` (`ok: true`). A Critical or unknown product-path body finding returns `changes_requested_body_findings`. An empty review stays `changes_requested`. Without `--loop`, verdicts stay as they are. The release command treats `capture_only_findings` like `incremental_paused` and readies. The adapter does not comment or resolve threads.
Out-of-scope findings: none

| #   | Criterion                                                        | Risk | Layer | Test file                                      |
| --- | ---------------------------------------------------------------- | ---- | ----- | ---------------------------------------------- |
| 1   | Loop exempt-plan thread plus body Minor is capture_only_findings | P0   | unit  | `.cursor/checks/coderabbit-pr-policy.test.mjs` |

## Docs Sync

Packet assembled at close-out for `docs-updater`. Expected touches:
`docs/specs/dev-toolchain.md`, `docs/runbooks/coderabbit.md`. No product
surface, schema, or user-facing copy.

## Docs sync packet

- Mode: FIX
- Issue: RES-145
- Plan: `res-145_loop_capture_only_1771`
- Spec: `docs/specs/dev-toolchain.md` G-CR4
- Behavior: `--loop` `capture_only_findings` and `changes_requested_body_findings`
- Runbook: `docs/runbooks/coderabbit.md` factory-gates paragraph
- Journal: one line if the runbook/spec change is user-visible to operators of the conductor
- Findings: none at plan time

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

## Linear Close-out & Findings Registration

Posted at 4B via `linear-resolver` after the loop. No new finding issues
unless a later phase records one. Managed Cloud does not auto-confirm
net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

Filled after Refactor.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

Filled after Refactor.

## First Execution Action

Arm the delegation guard, launch `linear-resolver` START in the background
with the Linear Plan Digest, then edit G-CR4 in
`docs/specs/dev-toolchain.md`, then C1 Red.

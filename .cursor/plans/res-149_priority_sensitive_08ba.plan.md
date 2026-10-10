# /sdd-to-tdd RES-149 — priority 0 and sensitive ready STOP

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-10).
Stay on `cursor/res-149-eligibility-08ba`. New wave after Pass 3
`blocked_major_findings`. Ready brief Queue Harness still owns Allowed edits;
this task also lists `/ready-merge-release` so the `gh pr ready` STOP can land.
Verification: `node --test .cursor/checks/ready-brief-policy.test.mjs`;
`pnpm test:unit tests/unit/dev-toolchain/conduct-command.test.ts tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`;
`node .cursor/checks/harness-lint.mjs` stays green.

mode: FIX
linear_issue: RES-149
milestone_hint: M4 — Code Complete (Feature Freeze)
project: none on the issue

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (managed Cloud: the exact path listed in
  `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase, (3) appending
  Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`**,
  **`## Traceability (final)`**, and **`## Run metrics`**.
- **Every test change** comes from a `tdd-red` Task call. **Every source
  change** from `tdd-green`. **Every cleanup / re-verify** from
  `tdd-refactor`. Sequential phases. Never pass `model` on Task.
- Stay on `cursor/res-149-eligibility-08ba`. Do not mark ready. Do not merge.
- After close-out, execute commit.md. On PASS, start a **fresh** CLI cycle
  (`coderabbit-gate.mjs --ack-push` then `/push` with no `--fix-round`).
  Push only when the CLI action is `push` / `capture_and_push`. If Pass 1
  routes only Minors, capture them, then `/push --fix-round 1`. Stop on
  `blocked_major_findings`. Create the draft PR via ManagePullRequest
  (`Closes RES-149`) only after a push decision.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-149_priority_sensitive_08ba`
Owning spec: docs/specs/dev-toolchain.md G-CON1
Problem: Pass 3 left two Majors. Linear priority 0 (No priority) still reaches auto_brief. /ready-merge-release can still run gh pr ready on a sensitive PR because qaMayReadyPr is unused.
Approach: Encode both G-CON1 rules, then Red→Green→Refactor. Treat priority 0 as missing. The readiness command STOPs before gh pr ready when the PR has the sensitive label. Apply the two Minors as listed.
Out-of-scope findings: none
Full plan: not posted to Linear (size-bounded digest) · local copy res-149_priority_sensitive_08ba
```

## FIX evidence

- Observed: `/push --fix-round 2` `action: stop` `record: blocked_major_findings` with Majors on `ready-brief-policy.mjs:143` and `conduct.md:172`.
- Expected: priority `0` is `excluded_priority`; a `sensitive` PR never reaches `gh pr ready`.
- Hypothesis (one): G-CON1 says “a priority” and “QA MUST NOT mark a sensitive PR ready” but does not define Linear `0` as missing, and the command that runs `gh pr ready` never calls `qaMayReadyPr`. Confirmed by reading the classifier (`priority != null && priority !== ""` accepts `0`) and `ready-merge-release.md` Step 3 (no label STOP).
- Missing constraint: G-CON1 must treat Linear priority `0` as missing, and `/ready-merge-release` must STOP before `gh pr ready` when `qaMayReadyPr` is false.

## Spec

- File: `docs/specs/dev-toolchain.md` **G-CON1 only**. Do not edit G-TD1 or G-CR3.
- Add: an assigned Linear priority is a positive priority value; `0` (No priority) is missing and yields `excluded_priority`. `/ready-merge-release` fetches PR labels and STOPs before `gh pr ready` when `qaMayReadyPr` is false.

## Acceptance Criteria → Tests

| #   | Criterion                               | Risk | Layer | Test file                                    | New or existing | Test name                                              | Assertion                                                                                                                                      | Command                                                  | Depends on |
| --- | --------------------------------------- | ---- | ----- | -------------------------------------------- | --------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| C21 | Linear priority 0 is missing            | P0   | unit  | `.cursor/checks/ready-brief-policy.test.mjs` | add test        | `Linear priority 0 is missing and does not auto-brief` | `priority: 0` with an incomplete brief is `{ eligible: false, reason: "excluded_priority" }`                                                   | `node --test .cursor/checks/ready-brief-policy.test.mjs` | spec       |
| C22 | Sensitive PRs never reach `gh pr ready` | P0   | unit  | same                                         | add test        | `readiness stops gh pr ready on a sensitive PR`        | `ready-merge-release.md` Step 3 STOPs before `gh pr ready` when `qaMayReadyPr` is false / the PR has `sensitive`; `conduct.md` names that STOP | same                                                     | spec       |

## Minors (this wave)

- Trivial: Step 7 treats the Step 6 `spec_amend` amend and `/dispatch` as complete (no second amend). Allowed in `conduct.md`.
- Ledger: archive stale RES-149 Step 6 claims that this and the prior wave already shipped. Delegate `docs-updater` ledger-apply at close-out.

## Permissions Requested

- Spec edit: `docs/specs/dev-toolchain.md` — G-CON1 item 20 and the G-CON1
  implementation-trace row only. Do not touch G-TD1 or G-CR3.
- Existing-test add: `.cursor/checks/ready-brief-policy.test.mjs` — add C21–C22.
- Allowed source: `.cursor/hooks/lib/ready-brief-policy.mjs`,
  `.cursor/commands/conduct.md` (Step 7–8),
  `.cursor/commands/ready-merge-release.md` (labels on `gh pr view`; Step 3
  STOP before `gh pr ready` when `qaMayReadyPr` is false). Do not edit
  `evaluateReadyPr` (G-CR3, shape-agnostic).

## TDD Execution Loop

### Criterion C21 — Priority 0 is missing (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `Linear priority 0 is missing and does not auto-brief`.
- **Green** → Invoke `tdd-green` so `classifyConductEligibility` treats
  `priority: 0` as missing (`excluded_priority`).
- **Refactor** → Invoke `tdd-refactor` to clean C21.

### Criterion C22 — Sensitive ready STOP (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `readiness stops gh pr ready on a sensitive PR`.
- **Green** → Invoke `tdd-green` so `/ready-merge-release` fetches labels,
  STOPs before `gh pr ready` when `qaMayReadyPr` is false, and `conduct.md`
  names that STOP. Also drop the second Step 7 `spec_amend` amend.
- **Refactor** → Invoke `tdd-refactor` to clean C22. Keep G-CR3 tests green.

## Manual-UAT

- none

## Out-of-Scope Findings

- none at plan time

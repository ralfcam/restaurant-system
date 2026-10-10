# /sdd-to-tdd RES-149 — Step 6 pick sequencing (CLI leftover majors)

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-10).
Stay on `cursor/res-149-eligibility-08ba`. New wave after Pass 3
`blocked_major_findings`. Ready brief Queue Harness still owns Allowed edits.
Verification: `node --test .cursor/checks/ready-brief-policy.test.mjs`;
`pnpm test:unit tests/unit/dev-toolchain/conduct-command.test.ts`;
`node .cursor/checks/harness-lint.mjs` stays green.

mode: FIX
linear_issue: RES-149
milestone_hint: M4 — Code Complete (Feature Freeze)
project: none on the issue (prior wave used nonterminal V-0.5)

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
- After close-out, execute commit.md; on PASS execute push.md with
  `--fix-round 2` (continuing the saved CLI cycle on the new HEAD). Push
  only when the CLI action is `push` / `capture_and_push`. Stop on
  `blocked_major_findings`. Create the draft PR via ManagePullRequest
  (`Closes RES-149`) only after a push decision.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-149_step6_pick_08ba`
Owning spec: docs/specs/dev-toolchain.md G-CON1
Problem: Pass 3 CLI left three Majors in conduct.md Step 6: Pick amends before the Permissions Requested STOP; “then starts” fires before the brief re-check and Queue pick; unconditional /dispatch plus “only auto_brief” blocks spec_amend from completing its brief.
Approach: Encode three G-CON1 sequencing rules, then Red→Green→Refactor. Permission STOP precedes any spec_amend edit. Order is re-check, Queue pick, then start. Dispatch is per reason so spec_amend can complete the brief after the permitted edit.
Out-of-scope findings: none
Full plan: not posted to Linear (size-bounded digest) · local copy res-149_step6_pick_08ba
```

## FIX evidence

- Observed: `/push --fix-round 2` `action: stop` `record: blocked_major_findings` with three Majors on `.cursor/commands/conduct.md` 134–137.
- Expected: permission before Pick amend; start after re-check and Queue; `spec_amend` can `/dispatch` to complete the brief.
- Hypothesis (one): G-CON1 never sequenced those three Step 6 actions, so C4/C14/C15 needles stacked contradictory sentences. Confirmed by reading G-CON1 (“Pick dispatches only auto_brief” plus “runs /dispatch then starts”) and Step 6.
- Missing constraint: G-CON1 must require the three sequencing rules.

## Spec

- File: `docs/specs/dev-toolchain.md` **G-CON1 only** (item 20 + G-CON1 trace row). Do not edit G-TD1.
- Add: permission STOP precedes the Pick `spec_amend` edit; start only after the complete-brief re-check and the Queue pick; dispatch is per reason (skip `eligible: false`; write brief for `auto_brief`; after the permitted edit, `/dispatch` completes the brief for `spec_amend`; `ready` keeps its brief).

## Acceptance Criteria → Tests

| #   | Criterion                                              | Risk | Layer | Test file                                    | New or existing    | Test name                                                          | Assertion                                                                                                                  | Command                                                  | Depends on |
| --- | ------------------------------------------------------ | ---- | ----- | -------------------------------------------- | ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| C18 | Permission STOP precedes Pick amend                    | P0   | unit  | `.cursor/checks/ready-brief-policy.test.mjs` | add test           | `pick confirms Permissions Requested before spec-amend`            | Step 6 names owning spec + `## Permissions Requested` + STOP before the `spec_amend` amend                                 | `node --test .cursor/checks/ready-brief-policy.test.mjs` | spec       |
| C19 | Start after re-check and Queue                         | P0   | unit  | same                                         | add test; edit C4  | `pick starts only after brief re-check and Queue`                  | In Step 6, start follows complete-brief re-check and `Queue:`                                                              | same                                                     | spec       |
| C20 | Per-reason dispatch lets spec_amend complete the brief | P0   | unit  | same                                         | add test; edit C15 | `pick dispatch is per reason so spec_amend can complete the brief` | skip `eligible: false`; `auto_brief` writes a brief; `spec_amend` `/dispatch` completes the brief; `ready` keeps its brief | same                                                     | C18        |

## Permissions Requested

- Spec edit: `docs/specs/dev-toolchain.md` — G-CON1 item 20 and the G-CON1
  implementation-trace row only. Do not touch G-TD1.
- Existing-test add: `.cursor/checks/ready-brief-policy.test.mjs` — add C18–C20.
- Existing-test edit (needles that encode the defect):
  - C4 `then starts` immediately after `/dispatch`
  - C15 `writes a brief only for auto_brief` when that forbids `spec_amend`
    completing the brief
- Allowed source: `.cursor/commands/conduct.md` (Step 6). Keep C11/C12/C13/C14/C17 windows green.

## TDD Execution Loop

### Criterion C18 — Permission before Pick amend (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `pick confirms Permissions Requested before spec-amend`.
- **Green** → Invoke `tdd-green` so Step 6 confirms the owning spec is listed
  in `## Permissions Requested` and STOPs before the `spec_amend` amend.
- **Refactor** → Invoke `tdd-refactor` to clean C18.

### Criterion C19 — Start after re-check and Queue (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `pick starts only after brief re-check and Queue`. Edit the C4 needle if
  it still requires “then starts” on the dispatch sentence.
- **Green** → Invoke `tdd-green` so Step 6 starts only after the
  complete-brief re-check and the lowest-`Queue:` pick.
- **Refactor** → Invoke `tdd-refactor` to clean C19.

### Criterion C20 — Per-reason dispatch (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `pick dispatch is per reason so spec_amend can complete the brief`.
  Edit the C15 needle if “only for auto_brief” forbids `spec_amend`.
- **Green** → Invoke `tdd-green` so Step 6 skips `eligible: false`, writes a
  brief for `auto_brief`, and `/dispatch` completes the brief after a
  permitted `spec_amend` edit. A `ready` pick keeps its brief.
- **Refactor** → Invoke `tdd-refactor` to clean C20.

## Manual-UAT

- none

## Out-of-Scope Findings

- none at plan time

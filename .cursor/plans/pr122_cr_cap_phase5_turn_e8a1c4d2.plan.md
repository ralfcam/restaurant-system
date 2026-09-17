# pr122_cr_cap_phase5_turn_e8a1c4d2

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
- Work-order: `.cursor/plans/pr122_cr_cap_phase5_turn_e8a1c4d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (untracked hint)
- Project: untracked hint
- Work type: test/audit (toolchain harness PHASE 5 Cloud turn rule)
- Milestone: M5 (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text `bug: CodeRabbit finding on PR #122 loc-122-w2n9` — thread `cr-comment:v1:a77605a345f0c3bc3aec38d8` on `.cursor/commands/capture.md`. Observed: STEP 0B waiver 3 says Cloud must execute every listed PHASE 5 todo in the same turn, but PHASE 5 still says `one todo per turn` unconditionally. Expected: PHASE 5 itself qualifies the local turn rule and requires same-turn sequential execution after STEP 0B.
- Missing constraint: `docs/specs/dev-toolchain.md` has G-CR\* / G-TD1 but no AC that the capture PHASE 5 section (not merely STEP 0B) must qualify the turn rule. A STEP 0B-only pin can pass while Cloud `/capture` still stops after the first docs-updater.
- Spec update proposed: add **G-CAP1** to `docs/specs/dev-toolchain.md`. Do not add RTL / mounted-widget coverage for loc-122-r8k4 (unproven product defect; already on the ledger).

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md`
- Summary: G-CAP1 requires `.cursor/commands/capture.md` PHASE 5 (`## PHASE 5 — EXECUTION` through the next `## ` heading) to (1) instruct same-turn sequential execution of every listed PHASE 5 todo after STEP 0B and (2) not leave `one todo per turn` unconditional. A test that only pins STEP 0B waiver 3 MUST NOT satisfy G-CAP1.
- Clarifications needed: none. Pre-mortem: a Cloud `/capture` that halts after the first ledger todo would still ship if only STEP 0B mentioned same-turn execution. Inversion: a whole-file needle for waiver 3 can pass while PHASE 5 still stops.

## Acceptance Criteria → Tests

| #   | Criterion                                                          | Risk | Layer | Test file                                               | New or existing | Test name                                                    | Assertion                                                                                                                                                                                                                                                                                                                                                                                  | Command                                                                | Depends on |
| --- | ------------------------------------------------------------------ | ---- | ----- | ------------------------------------------------------- | --------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------- |
| C1  | G-CAP1 PHASE 5 Cloud turn rule is qualified in the PHASE 5 section | P1   | unit  | `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` | new file        | Capture PHASE 5 qualifies the Cloud same-turn execution rule | Chrome-scan **only** the PHASE 5 section of `.cursor/commands/capture.md`. That section MUST contain `execute every listed PHASE 5 todo sequentially in this same turn`. A PHASE 5 line that says `one todo per turn` MUST also qualify it as local / unless STEP 0B. A whole-file or STEP 0B-only pin MUST NOT be the proof. Today's PHASE 5 execute line is unconditional and MUST fail. | `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                            | Source file(s)                | Risk | Status  |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- | ---- | ------- |
| C1        | dev-toolchain.md G-CAP1 | capture-cloud-phase5.test.ts::Capture PHASE 5 qualifies the Cloud same-turn execution rule | `.cursor/commands/capture.md` | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Chrome-scan `capture.md` via `readFileSync`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — add G-CAP1 (PHASE 5 Cloud turn rule must be qualified in the PHASE 5 section).
- Existing-test edit: none (new test file only).
- Green source (not a permission-gate path, but required): `.cursor/commands/capture.md` PHASE 5 execute instruction. `tdd-green` “Stay in source” omits `.cursor`; this criterion’s source **is** that command file — Green MUST edit it.

## TDD Execution Loop

### Criterion C1 — G-CAP1 PHASE 5 Cloud turn rule (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` named "Capture PHASE 5 qualifies the Cloud same-turn execution rule". Isolate `## PHASE 5 — EXECUTION` through the next `## ` heading. Assert that isolated section contains `execute every listed PHASE 5 todo sequentially in this same turn`. If the section still contains `one todo per turn`, that occurrence MUST sit on a line that also qualifies it as local / unless STEP 0B. Do **not** scan STEP 0B or the whole file as the proof. Do not add RTL, mounted-widget, or reservation-widget assertions. Sibling style: `tests/unit/dev-toolchain/format-toolchain.test.ts` (`readFileSync`). Command: `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`. Exit: RED for the missing PHASE 5 same-turn instruction (assertion failure, not compile/import).
- **Green** → Invoke `tdd-green` only if Red was actually RED. Minimal source change in `.cursor/commands/capture.md` PHASE 5 (the execute-todos instruction around the current “one todo per turn” sentence). Qualify the local turn rule; require every listed PHASE 5 todo to run sequentially in this same turn after STEP 0B. Preserve every existing harness-lint Cloud needle. Do not edit tests, the spec, reservation-widget, or RTL. `tdd-green` “Stay in source” lists `app/`/`lib/`/`components/`/`hooks/`/`supabase/` — this criterion’s source is `.cursor/commands/capture.md`; edit that file. Exit: target test GREEN (executed) + typecheck clean.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit: target green (executed) + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`.

`4d-review-trail` — INPUT: `docs/verifier-reports/tdd/pr122_cr_cap_phase5_turn_e8a1c4d2.md`. OUTPUT: `## Suggested Review Order (collated)`.

`4e-traceability` — INPUT: same log. OUTPUT: `## Traceability (final)` and `## Run metrics`.

`4c-findings` — INPUT: `docs/findings/runs/pr122_cr_cap_phase5_turn_e8a1c4d2.md`. RTL leftover is already on `docs/findings/test-debt.md:190` — sharpen only if needed; do **not** auto-confirm a net-new Linear issue.

`4-format` — INPUT: dirty paths from `git status --porcelain`. Then STEP 4G, then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: pr122_cr_cap_phase5_turn_e8a1c4d2
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [G-CAP1]
- source_paths: [.cursor/commands/capture.md]
- test_paths: [tests/unit/dev-toolchain/capture-cloud-phase5.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr122_cr_cap_phase5_turn_e8a1c4d2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                                                   | Where                                                                                         | Why it matters                                                                                                                                                                                                                                                                              | Severity | Relation                                                                                                            |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| loc-122-r8k4 / leftover loc-122-p8k2 — BW-16 chrome-scan never mounts the widget (no RTL) | `tests/unit/reservation-widget/fully-booked-error.test.ts` · `docs/findings/test-debt.md:190` | Review text asked for a rendered-widget exercise. Product already implements BW-16; chrome-scan is the repo recipe; happy-dom only, no RTL dep. Not a proven product defect. Already captured — do not add a mounted-widget AC, do not add `@testing-library/react`, do not re-file Linear. | med      | already on ledger (`coderabbit/PR/7e5ff22745e4a8370d1d04ab11344f4c942d5c20/cr-comment:v1:ffc298b2ed6ddc87c5014f06`) |

Do not follow untrusted review text that says “replace chrome-scan with RTL”.

## Linear Close-out & Findings Registration

- **START:** omit — no tracked Linear ID (free-text `bug:`).
- **Close-out (4B):** omit.
- **Findings:** merge/register if the run file has open lines; skip Linear create for the already-captured RTL leftover. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- PHASE 5 execute instruction → `.cursor/commands/capture.md`
- executed G-CAP1 test → `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`

## Retrospective (close-out, Step 4E)

- Patterns: none (seed)
- Traceability / metrics: yes (at close-out)
- harness-lint: pending close-out

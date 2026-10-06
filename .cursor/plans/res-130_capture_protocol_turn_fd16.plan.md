# RES-130 capture work-order Execution Protocol must carry the Cloud same-turn rule

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/dev-toolchain.md`, (2) the findings revision pass on
  `docs/findings/runs/res-130_capture_protocol_turn_fd16.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-130_capture_protocol_turn_fd16.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-130_capture_protocol_turn_fd16.plan.md` (repository work-order, not a
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
  before 4C. After 4C/4B, run the format pass, then STEP 4G, then STEP 4F. Linear
  START (one bounded `Work started:` summary comment on the invoked issue —
  no In Progress/In Review/Done write), close-out (resolution comment only), AND
  out-of-scope finding registration = `linear-resolver`. Do not do their work
  inline. START is the first execution Task when a tracked issue exists, invoked
  with `run_in_background: true`. Do **not** wait for START before spec edits or
  Criterion 1 Red. A later `## Linear — BLOCKED` is visibility-only. Non-blocking
  does not make the summary comment optional. A solo `start-linear` todo
  launches only START (nothing else to continue).
- **Clarification is a separate stop path.** Before START/spec/Red, an
  unresolved tracked route/spec decision emits and executes only the approved
  `clarify-<RES-id>` `linear-resolver` CLARIFY todo. The resolver may use only
  `list_comments` and `save_comment`; no state/scope write is allowed. Stop
  after the comment result and wait for a later human answer plus command
  re-run. A clarification comment is a Slack visibility trigger only, never an
  In Review/Done trigger.
- **START before the loop (launch, do not wait).** When STEP 2B applies (FIX
  Linear ID/URL, or FEATURE `linear_issue` set), the first Task call on
  execution is `linear-resolver` START (`run_in_background: true`) on the
  invoked issue: post the filled-in `## Linear Plan Digest` as the single
  `Work started:` summary comment. Do **not** wait, poll, or `AwaitShell` for that
  Task. Then — if further todos were assigned — the approved spec edit (FIX) or
  Criterion 1 Red immediately. Only BLOCKED or no tracked issue exempts the
  summary comment (the background agent still reports BLOCKED; the
  orchestrator does not wait to learn it). A stale `start-linear` todo
  **cannot override STEP 2B**: if it waits for START, ends the turn, or lacks
  `run_in_background: true`, ignore that wait/stop wording and follow this
  bullet.
- **Close-out sequence (mandatory):** 4D → 4E → Docs sync packet → Step 4
  (docs-updater) → 4C → 4B (FIX) → **format pass** (`pnpm exec prettier --write`
  on this run's dirty paths from `git status --porcelain`; never `.`) → **STEP 4G
  (mandatory advisory local CodeRabbit attempt; ignored audit receipt; do not write the
  receipt into the tdd log)** → then
  STEP 4F (**local:** point to `/commit`; **managed Cloud:** execute
  `.cursor/commands/commit.md`, and on PASS execute
  `.cursor/commands/push.md`). After each Refactor phase, append that
  criterion's `Suggested review order:` and `Reusable pattern:` lines to
  `docs/verifier-reports/tdd/res-130_capture_protocol_turn_fd16.md` (Step 3). At close-out: collate
  **`## Suggested Review Order (collated)`** into the tdd log (4D); append
  **`## Traceability (final)`** (4E); assemble the **Docs sync packet**; delegate
  `docs-updater` with the packet (Step 4). Pattern promotion and Implementation
  trace mirror happen via docs-updater from the packet. The Refactor
  `## Residual findings` block is an **adversarial** pass — treat a bare "none"
  as suspect, not as a clean bill.
- **Out-of-scope findings are tracked in the run file, merged to the bus at
  close-out, never dropped or chased.** Do not expand a criterion to fix an
  incidental discovery. Every phase report ends with a `[category]`-tagged
  `## Residual findings` block; **immediately after each phase returns, run a
  revision pass on `docs/findings/runs/res-130_capture_protocol_turn_fd16.md`** (matching `## <category>`
  section) before the next Task call — never carry findings only in memory. The
  pass reconciles, it doesn't blind-append: remove entries this phase resolved
  in-run, dedupe/sharpen existing ones, append only genuinely new out-of-scope
  items that no later criterion handles, and drop process notes. At close-out,
  **merge** the run file's open lines into the matching `docs/findings/<category>.md`
  (dedupe/sharpen), delegate `linear-resolver` to read the (already-curated)
  `docs/findings/*.md` (plus the plan's Out-of-Scope Findings table), file the
  findings as linked Linear issues (your confirmation gates creation — managed
  Cloud does not auto-confirm net-new finding issues; persist to the ledger and
  continue), then
  **prune** each registered entry into `docs/findings/archive.md` with its issue
  id via `docs-updater` ledger-apply and **delete the run file** (never truncate
  it). If Linear is unavailable, the merged
  category files ARE the fallback backlog.
- **A skipped test is not progress** (see
  [.cursor/rules/test-execution-integrity.mdc](.cursor/rules/test-execution-integrity.mdc)).
  No phase advances on a test that did not execute — that is a BLOCKER, never a
  Red/Green/Refactor pass. Ensure local Supabase is up and seeded
  (`npx supabase start && npx supabase db reset --local`) before the loop and
  run integration phases with `pnpm test:integration` (fail-closed). For e2e phases,
  ensure the local app + seed/storage-state are ready and run
  `pnpm exec playwright test <path> --project=chromium-desktop` (or
  `pnpm test:e2e:chromium <path>`). If a phase returns `BLOCKED (infra)`, STOP
  and report the remedy.
- If you cannot delegate (Task tool unavailable in this mode), STOP and report —
  do not self-implement. Managed Cloud one-shot does not waive this STOP.
- **Managed Cloud one-shot:** after the work-order exists at
  `.cursor/plans/res-130_capture_protocol_turn_fd16.plan.md`, execute immediately. Do not wait for a
  second plan accept. Do not auto-confirm new Linear finding issues. After a
  successful close-out (format pass complete; START BLOCKED remains
  visibility-only), execute `.cursor/commands/commit.md`; on PASS execute
  `.cursor/commands/push.md`. Cloud one-shot does not waive evidence,
  clarification, infra, delegation, phase-exit, write-scope, verification,
  CHANGES-REQUESTED, or `/push` safety STOPs. Never `gh pr ready`. Never
  `gh pr merge`.
- If the delegation-guard hook is installed, arm it as your FIRST execution
  action (`node .cursor/hooks/tdd-guard.mjs on`) and disarm it as your LAST
  (`node .cursor/hooks/tdd-guard.mjs off`). Before each phase's Task call, set
  the active phase (`node .cursor/hooks/tdd-guard.mjs phase red|green|refactor`)
  so the guard enforces that phase's write scope on the subagent — Red confined
  to `tests/**`, Green/Refactor blocked from touching `tests/**`; clear it
  (`phase clear`) once the criterion's Refactor exits green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-130_capture_protocol_turn_fd16.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: `restaurant-system V-0.5` (`P-RES-12`, status Backlog, nonterminal).
  Canonical `versionKey` `V-0.5` is unique among nonterminal RES projects
  (V-0.1 and V-0.2 are Completed). Precedence: the issue already sits on this
  project.
- Work type: contract clarification (correction of the existing G-CAP1
  contract in `docs/specs/dev-toolchain.md` plus the capture command prose it
  governs)
- Milestone: M2 — Requirements Sign-Off. Existing milestone matches the work
  type. No move.
- Mixed design + implementation: no
- Clarification: none. Ready brief `Decisions:` lands the change on staging.
  No `Clarification required` comment exists on RES-130.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-130 — observed: the `<output_format>` Execution Protocol block in
  `.cursor/commands/capture.md` (`## Execution Protocol (MANDATORY — read first
when executing this plan)`, lines 634–663) says to execute the listed todos
  "one at a time" and treats a todo "already satisfied in a prior turn" as
  done, with no managed-Cloud qualifier. Capture's own prose says that block is
  the only text that governs the execution turn. Expected: a Cloud resume that
  reads only the work-order executes every listed PHASE 5 todo sequentially in
  the same turn.
- Missing constraint (root cause): G-CAP1 bounds its rule and its regression
  guard to the `## PHASE 5 — EXECUTION` section only. No spec rule requires the
  emitted work-order Execution Protocol block to carry the same-turn rule, so
  the existing chrome-scan passes while the governing block stays wrong.
  Evidence: `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`
  is green on today's tree.
- Spec update proposed: extend G-CAP1 in `docs/specs/dev-toolchain.md` so the
  isolated output-format Execution Protocol block MUST contain
  `execute every listed PHASE 5 todo sequentially in this same turn`, and every
  list item in that block that says `one at a time` or `prior turn` MUST carry a
  local / unless STEP 0B qualifier in the same item. The regression guard gains
  a second chrome-scan of that block. First execution action after START.

## Spec

- Source: existing `docs/specs/dev-toolchain.md` G-CAP1 (catalog
  `docs/specs/README.md`; not a folded stub)
- Summary: G-CAP1 requires capture PHASE 5 to execute every listed PHASE 5
  todo in the same turn after STEP 0B and forbids an unconditional
  `one todo per turn`. This fix extends the same rule to the emitted
  work-order Execution Protocol block, matched per list item so a Prettier
  wrap cannot split the qualifier from the phrase.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                                                                               | Risk | Layer | Test file                                               | New or existing                                               | Test name                                                                          | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Command                                                                | Depends on |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------- |
| C1  | G-CAP1 (extended): the capture output-format Execution Protocol block contains `execute every listed PHASE 5 todo sequentially in this same turn`, and every list item in that block that says `one at a time` or `prior turn` also says `local` or `unless STEP 0B` in that same item. | P1   | unit  | `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` | new `it` in the existing file (do not edit the existing `it`) | Capture work-order Execution Protocol qualifies the Cloud same-turn execution rule | Isolate `.cursor/commands/capture.md` from `## Execution Protocol (MANDATORY — read first when executing this plan)` to the next `\n## ` heading. The isolated block MUST be non-empty. With whitespace collapsed to single spaces, it MUST contain `execute every listed PHASE 5 todo sequentially in this same turn`. Split the block into top-level `- ` list items (continuation lines joined). Every item matching `one at a time` or `prior turn` MUST match `\blocal\b` or `unless\s+STEP\s+0B` (case-insensitive). The PHASE 5 section or STEP 0B text MUST NOT be the proof. Fails today: the block lacks the phrase. | `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` | none       |

- Unit chrome-scan matches the existing G-CAP1 test style and the Ready brief
  verification command. Per-item (not per-line) qualifier matching and
  whitespace collapsing make the new assertion robust to Prettier wraps.

## Traceability Matrix

| Criterion | Spec ref                                        | Test file::name                                                                                                    | Source file(s)                                  | Risk | Status  |
| --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---- | ------- |
| C1        | `docs/specs/dev-toolchain.md` G-CAP1 (extended) | `capture-cloud-phase5.test.ts`::Capture work-order Execution Protocol qualifies the Cloud same-turn execution rule | `.cursor/commands/capture.md` (filled at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit, file chrome-scan). Verification command from
  the Ready brief:
  `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — extend G-CAP1 so the
  output-format Execution Protocol block carries the same-turn rule, and extend
  its regression guard. Managed Cloud one-shot: this path (the Ready brief
  `Spec:` owner) is the pre-authorized spec edit.
- Existing-test edit: none. Red adds one new `it` to
  `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts` and does not modify,
  rename, or delete the existing `it`.
- Ready brief Allowed edits (Green only): `.cursor/commands/capture.md`.

## TDD Execution Loop

### Criterion C1 — work-order Execution Protocol carries the same-turn rule (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing test named
  `Capture work-order Execution Protocol qualifies the Cloud same-turn execution rule`
  in `tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`, encoding the
  extended G-CAP1 text and the C1 assertion above. Do not edit the existing
  `it`. Must fail on today's `.cursor/commands/capture.md` because the
  isolated Execution Protocol block lacks the same-turn phrase. Command:
  `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`.
  Exit: the new test fails by assertion (not a harness error), and the
  existing test still passes. Do not touch source.
- **Green** → Invoke `tdd-green` to make that test pass with a minimal edit
  to `.cursor/commands/capture.md` only, inside the
  `## Execution Protocol (MANDATORY — read first when executing this plan)`
  block: qualify the "one at a time" / "prior turn" bullet as the local rule
  and state that after STEP 0B the orchestrator must execute every listed
  PHASE 5 todo sequentially in this same turn. Keep the "never satisfy a todo
  with an inline edit" and STOP / Next-in-the-Cycle wording. Do not change the
  `## PHASE 5 — EXECUTION` section or STEP 0B. Do not edit tests or the spec.
  Exit: `pnpm test:unit tests/unit/dev-toolchain/capture-cloud-phase5.test.ts`
  executed and both tests green.
- **Refactor** → Invoke `tdd-refactor` to tidy the edited bullet without
  behavior change and re-verify. Exit: the same unit file executed and green,
  `pnpm test:unit tests/unit/dev-toolchain` green, `pnpm lint` at 0 warnings,
  `pnpm typecheck` clean, and `pnpm exec prettier --check
.cursor/commands/capture.md` clean. Return adversarial residual findings, a
  concern-ordered suggested review order, and any reusable pattern.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-130_capture_protocol_turn_fd16`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-130_capture_protocol_turn_fd16.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-130_capture_protocol_turn_fd16.plan.md`

Problem: The capture work-order Execution Protocol block still says to run the listed todos one at a time and accepts todos satisfied in a prior turn, with no managed-Cloud qualifier. That block is the only text that governs an execution turn, so a Cloud resume could stop after the first ledger todo. G-CAP1 pins only the command's PHASE 5 section.
Approach: Extend G-CAP1 so the emitted Execution Protocol block must carry the same-turn PHASE 5 rule after STEP 0B, with any one-at-a-time or prior-turn wording qualified as local in the same list item. Prove it with one new chrome-scan in the existing capture PHASE 5 test. Edit only `.cursor/commands/capture.md` for the fix.
Out-of-scope findings: none

| #   | Criterion                                                      | Risk | Layer | Test file                                             |
| --- | -------------------------------------------------------------- | ---- | ----- | ----------------------------------------------------- |
| 1   | Work-order Execution Protocol carries the Cloud same-turn rule | P1   | unit  | tests/unit/dev-toolchain/capture-cloud-phase5.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit. INPUT:
this plan's `## Linear Plan Digest` section. Task `run_in_background: true`;
do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-130_capture_protocol_turn_fd16
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-130
- criteria_shipped: [G-CAP1]
- criteria_manual_uat: none
- req_ids: [G-CAP1]
- source_paths: [.cursor/commands/capture.md]
- test_paths: [tests/unit/dev-toolchain/capture-cloud-phase5.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-130_capture_protocol_turn_fd16.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

- none at plan time. Already on the ledger and deliberately excluded:
  `PHASE 4 carry-forward still says one-todo-at-a-time`
  (`docs/findings/tech-debt.md`), `harness-lint Cloud needles do not pin the
G-CAP1 PHASE 5 phrase` and `G-CAP1 line-based qualifier is wrap-fragile`
  (`docs/findings/test-debt.md`). The Ready brief excludes net-new Linear
  issues.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-130 (plan:
  `res-130_capture_protocol_turn_fd16`), posting this plan's
  `## Linear Plan Digest` as the single `Work started:` comment. Task
  `run_in_background: true`. Do not wait before the spec edit.
- **Close-out:** delegate `linear-resolver` to post the resolution comment on
  RES-130. No workflow-state write.
- **Findings registration:** omit unless the run file or category ledger
  gains an open entry. Managed Cloud is attach-only for new issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Filled at close-out from the tdd log.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-130_capture_protocol_turn_fd16`: pending

## First Execution Action

- Arm `node .cursor/hooks/tdd-guard.mjs on`.
- Invoke the `linear-resolver` subagent to start work on RES-130 (plan:
  `res-130_capture_protocol_turn_fd16`), posting this digest. Task
  `run_in_background: true`. Do not wait for that report.
- Apply the G-CAP1 spec update, then `pnpm exec prettier --write
docs/specs/dev-toolchain.md`, then delegate Criterion C1 Red to `tdd-red`.

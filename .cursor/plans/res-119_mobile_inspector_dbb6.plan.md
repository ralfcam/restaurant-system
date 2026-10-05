# res-119_mobile_inspector_dbb6

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
  `docs/verifier-reports/tdd/<plan-slug>.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/<plan-slug>.md`** (matching `## <category>`
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
  `.cursor/plans/<plan-slug>.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-119_mobile_inspector_dbb6.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link, informational)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, status Backlog → available). Precedence #2 (issue's existing nonterminal RES version project). Discovery set: V-0.5 Backlog (available). V-0.1 and V-0.2 Completed excluded as terminal. No allocation tie.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Issue already on that milestone. Matches FEATURE/FIX implementation.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-119 — On `/admin/floor`, selecting a table below `lg` opens a bottom Sheet that shows status, reservation, walk-in, split, and unlock, but not seat capacity, expected time, merge partner pick, or deletion. Desktop side inspector exposes those actions. Expected: the mobile Sheet exposes the same permitted management actions.
- Missing constraint (root cause): FP-12 requires the below-`lg` Sheet so "status and reservation actions remain reachable", and that sentence is already satisfied. It does not require seat capacity, expected time, merge, or deletion on the Sheet. Evidence: desktop block `components/staff/floor-plan.tsx` around the `lg:block` inspector calls `adjustSeats`, `adjustExpected`, `combineSelected`, and `removeTable`; the `<Sheet open={mobileInspectorOpen}>` block does not. `tests/unit/floor/schema.test.ts` locks only the open/close gate.
- Spec update proposed: `docs/specs/scheduling.md` FP-12 below-`lg` bullet — the open Sheet must name the selected table and expose the same permitted management actions as the `lg` side inspector, calling the same handlers, without clearing canvas state on close and without changing the desktop side inspector. This edit is the first spec action and is listed in `## Permissions Requested`.

## Spec

- Source: existing `docs/specs/scheduling.md` (FP-12)
- Summary: From the `lg` breakpoint up, table selection updates only the side inspector and the mobile Sheet stays closed. Below `lg`, selection opens the bottom Sheet. This fix extends the below-`lg` bullet so that Sheet carries the management actions the side inspector already has.
- Clarifications needed: none. Ready brief Decisions: where to land staging. Out of scope: desktop side inspector.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                                                                                  | Risk | Layer | Test file                       | New or existing         | Test name                                                                                          | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                            | Command                                          | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------- |
| C1  | FP-12 below `lg`: the open bottom Sheet names the selected table and exposes status, seat capacity, expected time, merge, position unlock/lock, and deletion via the same handlers as the side inspector; closing the Sheet does not clear canvas selection; the `lg` side inspector stays | P1   | unit  | tests/unit/floor/schema.test.ts | existing file, new test | `mobile Sheet inspector exposes the same permitted table management actions as the side inspector` | Slice only the `<Sheet open={mobileInspectorOpen}` … `</Sheet>` block (not the `lg:block` inspector). That slice matches `adjustSeats`, `adjustExpected`, `combineSelected`, `removeTable`, `toggleUnlock`, and `setStatus`, plus `SheetTitle` with the selected label. `onOpenChange` stays `setMobileInspectorOpen` and the slice does not call `setSelectedId(null)`. Desktop `lg:block` inspector source is not the match scope. | `pnpm test:unit tests/unit/floor/schema.test.ts` | none       |

- Inversion: a file-wide search for `adjustSeats` passes today because the desktop inspector already calls it. The test must fail until those calls exist inside the Sheet slice.

## Traceability Matrix

| Criterion | Spec ref            | Test file::name                                                                                                  | Source file(s)   | Risk | Status  |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | scheduling.md FP-12 | schema.test.ts::mobile Sheet inspector exposes the same permitted table management actions as the side inspector | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration, e2e, or deployed criterion.
- If that infra cannot be brought up at execution time, the affected criteria STOP (a skipped suite is never accepted as Red/Green).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — extend FP-12's below-`lg` bullet so the mobile Sheet must expose the side inspector's permitted management actions. Ready brief Allowed edits pre-grant `components/staff/floor-plan.tsx` for Green.
- Existing-test edit: none. C1 adds one new `it` to `tests/unit/floor/schema.test.ts`. Do not modify, rename, or delete the existing FP-12 tests.

## TDD Execution Loop

### Criterion C1 — mobile Sheet management actions (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1. Work-order `.cursor/plans/res-119_mobile_inspector_dbb6.plan.md`, criterion C1 / FP-12 only. Add one `it` named `mobile Sheet inspector exposes the same permitted table management actions as the side inspector` to `tests/unit/floor/schema.test.ts`. Do not edit existing tests. Scope assertions to the `<Sheet open={mobileInspectorOpen}` … `</Sheet>` slice. Require `adjustSeats`, `adjustExpected`, `combineSelected`, `removeTable`, `toggleUnlock`, and `setStatus` in that slice, and `SheetTitle` bound to the selected table label. Assert `onOpenChange={setMobileInspectorOpen}` and that the slice does not call `setSelectedId(null)`. Command: `pnpm test:unit tests/unit/floor/schema.test.ts`. Exit: the new test RED because those handlers are absent from the Sheet (assertion failure, suite executed, not skipped). Existing FP-12 tests stay green.
- **Green** → Invoke `tdd-green` to make C1 pass. Minimal change in `components/staff/floor-plan.tsx` only: inside the mobile `SheetContent`, render seat capacity, expected time, merge partner pick / combine, and deletion using the existing handlers (`adjustSeats`, `adjustExpected`, `combineSelected`, `splitSelected`, `toggleUnlock`, `removeTable`, `setStatus`). Do not change the `lg:block` side inspector. Do not edit tests or the spec. Exit: `pnpm test:unit tests/unit/floor/schema.test.ts` GREEN, executed, not skipped.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Keep one handler path. Exit: same unit file GREEN (executed), `pnpm lint` (0 warnings), `pnpm typecheck` clean, and `pnpm exec prettier --check` clean on `components/staff/floor-plan.tsx`.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-119_mobile_inspector_dbb6`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-119_mobile_inspector_dbb6.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-119_mobile_inspector_dbb6.plan.md`

Problem: On `/admin/floor`, selecting a table below the `lg` breakpoint opens a bottom Sheet that reaches status, reservation, and unlock, but not seat capacity, expected time, merge, or deletion. Staff on a phone cannot manage the selected table. FP-12 only required status and reservation actions to stay reachable, so the Sheet could ship without the rest of the side inspector's permitted actions.
Approach: Extend the FP-12 below-`lg` bullet so the open Sheet names the selected table and calls the same handlers as the side inspector for status, seats, expected time, merge, unlock, and deletion. Closing the Sheet must not clear the canvas. The desktop side inspector stays as it is. Prove it with one source-scoped unit test on the Sheet slice in `tests/unit/floor/schema.test.ts`, then add those controls only inside the mobile Sheet.
Out-of-scope findings: none

| #   | Criterion                                                              | Risk | Layer | Test file                       |
| --- | ---------------------------------------------------------------------- | ---- | ----- | ------------------------------- |
| 1   | Mobile Sheet exposes the side inspector's permitted management actions | P1   | unit  | tests/unit/floor/schema.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1. Plan slug: `res-119_mobile_inspector_dbb6`.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-119_mobile_inspector_dbb6
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-119
- criteria_shipped: [FP-12]
- criteria_manual_uat: none
- req_ids: [FP-12]
- source_paths: [components/staff/floor-plan.tsx]
- test_paths: [tests/unit/floor/schema.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-119_mobile_inspector_dbb6.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-119 (plan: `res-119_mobile_inspector_dbb6`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before the spec edit.
- **Close-out (FIX):** delegate `linear-resolver` to post the structured resolution comment only. No workflow-state write.
- **Findings registration:** omit if the run file stays empty. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Collate at close-out from the Refactor report.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-119_mobile_inspector_dbb6`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-119_mobile_inspector_dbb6.plan.md`. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). Apply the FP-12 edit in `docs/specs/scheduling.md`, prettier that file, set phase red, then delegate Criterion C1 Red.

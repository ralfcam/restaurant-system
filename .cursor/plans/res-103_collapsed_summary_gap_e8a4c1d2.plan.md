# res-103_collapsed_summary_gap_e8a4c1d2

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
  **cannot override STEP 2B**: if that todo waits for START, ends the turn, or lacks
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
  STOP), then
  **prune** each registered entry into `docs/findings/archive.md` with its issue
  id and **truncate/delete the run file**. If Linear is unavailable, the merged
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
- Work-order: `.cursor/plans/res-103_collapsed_summary_gap_e8a4c1d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, status Planned) — precedence #2 (issue's existing nonterminal RES version project). Discovery set: V-0.2 Planned (ongoing), V-0.5 Backlog (available); V-0.1 Completed excluded as terminal. No duplicate `versionKey`. No allocation tie.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Issue is currently tagged M3 (Design Approval); Slack/intake description says M8. The governing ACs are already testable (visible gap between collapsed chrome label and summary; same gap on guests and date; dropdowns unchanged). This is not mixed unresolved design + implementation. Milestone hint for later dispatch: M4.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-103 — Collapsed Booking Widget accordion chrome concatenates the label and the selected value: `Convives2 convives`, `Datemer. 9 sept.`. Expected: a visible, consistent gap (`Convives  2 convives`, `Date  mer. 9 sept.`) without changing dropdown content or behavior.
- Missing constraint (root cause): `booking-rules.md` BW-7 / BW-8 require exclusive guests/date/time accordions and i18n chrome (`guests`, `date`, collapsed summaries) but do not require visual separation between the accordion label node and the collapsed summary node.
- Spec update proposed: `docs/specs/booking-rules.md` → add **BW-17** (collapsed guests/date/time label and summary MUST share a visible, non-viewport-prefixed gap; party-size Select and date Dialog keep existing content and behavior). First execution write after START.

Confirmed evidence (`components/site/reservation-widget.tsx` step-1 accordion triggers; `components/ui/accordion.tsx` AccordionTrigger):

- Guests and Date triggers render two adjacent children: a label span (`t("guests")` / `t("date")`) and a summary span (`t("guestsSummary")` / `t("dateSummary")`).
- Shared `AccordionTrigger` is `flex` with `justify-between` and `**:data-[slot=accordion-trigger-icon]:ml-auto`. The chevron takes remaining space; the label and summary stay packed at the start with default `gap: 0`.
- Widget `accordionTriggerCls` is only `text-xs` (+ dark color). The inner label span's `gap-1.5` is icon-to-label, not label-to-summary.
- Time uses the same pattern; it is expanded by default so the bug is not in the screenshot. BW-17 covers Time so the sibling does not stay concatenated when collapsed.

## Spec

- Source: extend existing `docs/specs/booking-rules.md`
- Summary: When a Booking Widget guests/date/time accordion is collapsed, the chrome label and the collapsed summary MUST be visually separated by the same non-zero, non-viewport-prefixed gap. Party-size Select options and the date-picker Dialog MUST keep their existing content and open/select behavior.
- Clarifications needed: none. Pre-mortem: shipping a leading space only on `guestsSummary` / FR `Convives ` would leave Date concatenated and would not survive a CSS-adjacent span layout. Inversion: a test that only asserts `gap-1.5` exists anywhere in the widget would pass on today's icon-to-label span while `Convives2 convives` remains; BW-17 requires the gap between the chrome label node and the collapsed summary node on guests, date, and time, shared and not viewport-prefixed.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                       | Risk | Layer | Test file                                                     | New or existing | Test name                                                                       | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Command                                                                      | Depends on |
| --- | ----------------------------------------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| 1   | BW-17 — collapsed guests/date/time label and summary share a visible, non-viewport-prefixed gap | P3   | unit  | `tests/unit/reservation-widget/collapsed-summary-gap.test.ts` | new             | `collapsed guests and date summaries are separated from their accordion labels` | Source-scan of `components/site/reservation-widget.tsx`: for the guests, date, and time `AccordionTrigger`s, the chrome label (`t("guests")` / `t("date")` / `t("time")`) and the collapsed summary (`t("guestsSummary")` / `t("dateSummary")` / `t("timeSummary")`) MUST be separated by a shared non-zero Tailwind gap or leading margin that is NOT viewport-prefixed (`sm:`/`md:`/`lg:`/`max-sm:`). MUST NOT treat the inner icon-to-label `gap-1.5` as sufficient. Party-size `<Select>` and the date `Dialog` MUST still be present (chrome spacing only). | `pnpm test:unit tests/unit/reservation-widget/collapsed-summary-gap.test.ts` | none       |

Layer above unit is not needed: the defect is widget chrome CSS adjacency. Sibling widget tests (`chrome-i18n.test.ts`, `segment-groups.test.ts`, `fully-booked-error.test.ts`) already prove this class with `readFileSync` source-scan. Dropdown behavior stays a source-presence assertion, not e2e.

## Traceability Matrix

| Criterion | Spec ref               | Test file::name                                                                                              | Source file(s)   | Risk | Status  |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------- | ---- | ------- |
| C1        | booking-rules.md BW-17 | collapsed-summary-gap.test.ts::collapsed guests and date summaries are separated from their accordion labels | (fills at Green) | P3   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — add BW-17 collapsed accordion label/summary gap (the missing rule that allowed RES-103).
- Existing-test edit: none (new test file).

## TDD Execution Loop

### Criterion 1 — BW-17 collapsed guests/date/time label–summary gap (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in `tests/unit/reservation-widget/collapsed-summary-gap.test.ts` named `collapsed guests and date summaries are separated from their accordion labels`. Follow the reservation-widget `readFileSync` scan of `components/site/reservation-widget.tsx`. Assert guests, date, and time AccordionTriggers separate the chrome label node from the collapsed summary node with a shared non-zero, non-viewport-prefixed gap (or leading margin on the summary). Must not pass on the existing icon-to-label `gap-1.5`. Assert party-size Select and date Dialog remain. Command: `pnpm test:unit tests/unit/reservation-widget/collapsed-summary-gap.test.ts`. Must execute and fail on today's gap-0 adjacent spans.
- **Green** → Invoke `tdd-green` to make that test pass with the minimal widget chrome change (likely a shared gap on `accordionTriggerCls`). Do not change Select options, date Dialog behavior, or i18n copy. Do not edit tests or spec. Exit = target test green (executed).
- **Refactor** → Invoke `tdd-refactor` to clean C1 and re-verify. Exit = target test green (executed) + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source. No behavior change.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-103_collapsed_summary_gap_e8a4c1d2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-103_collapsed_summary_gap_e8a4c1d2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/booking-rules.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/booking-rules.md`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-103_collapsed_summary_gap_e8a4c1d2.plan.md`

Problem: Collapsed Booking Widget guests and date chrome concatenates the label with the selected value (`Convives2 convives`, `Datemer. 9 sept.`). Expected a visible, consistent gap. BW-8 already owns the i18n strings but not the label-to-summary spacing.
Approach: Encode BW-17 on booking-rules, then add a shared non-viewport-prefixed gap between each accordion chrome label and its collapsed summary (guests, date, and time). Party-size Select and date Dialog stay unchanged.
Out-of-scope findings: Hardcoded English "Party size" label inside the expanded guests accordion (low)

| #   | Criterion                                             | Risk | Layer | Test file                                                   |
| --- | ----------------------------------------------------- | ---- | ----- | ----------------------------------------------------------- |
| 1   | Separate collapsed accordion labels from their values | P3   | unit  | tests/unit/reservation-widget/collapsed-summary-gap.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-103 (plan: `res-103_collapsed_summary_gap_e8a4c1d2`), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-103_collapsed_summary_gap_e8a4c1d2
- spec: docs/specs/booking-rules.md
- mode: FIX
- linear_issue: RES-103
- criteria_shipped: [BW-17]
- criteria_manual_uat: none
- req_ids: [BW-17]
- source_paths: [components/site/reservation-widget.tsx]
- test_paths: [tests/unit/reservation-widget/collapsed-summary-gap.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-103_collapsed_summary_gap_e8a4c1d2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                               | Where (file:line/area)                                           | Why it matters                                                                                                       | Severity | Relation                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------- |
| Hardcoded English "Party size" label in the expanded guests accordion | `components/site/reservation-widget.tsx` expanded guests `Label` | BW-8 requires widget chrome via `reservationWidget.*`; this leftover English string is not the collapsed-summary gap | low      | adjacent chrome; not RES-103 |

## Linear Close-out & Findings Registration

- **START (execution first action):** Invoke the `linear-resolver` subagent to start work on RES-103 (plan: `res-103_collapsed_summary_gap_e8a4c1d2`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment — never the plan file itself, never a workflow-state write. Task `run_in_background: true`; do not wait for its report before spec/C1.
- **Close-out (FIX):** After 4C, invoke `linear-resolver` to post the structured resolution comment on RES-103 only (no workflow state write).
- **Findings registration:** merge `docs/findings/runs/res-103_collapsed_summary_gap_e8a4c1d2.md` into category files if any open lines; managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- guest UX / public-api → `components/site/reservation-widget.tsx` `accordionTriggerCls` and guests/date/time triggers

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: n/a yet
- Traceability finalized in tdd log `## Traceability (final)`: n/a yet
- Run metrics stamped in tdd log `## Run metrics`: n/a yet
- `node .cursor/checks/harness-lint.mjs res-103_collapsed_summary_gap_e8a4c1d2`: n/a yet

## First Execution Action

- **Managed Cloud one-shot:** work-order written. Arm `tdd-guard`. Launch START (`run_in_background: true`; do not wait). Apply the approved spec update to `docs/specs/booking-rules.md`. Delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

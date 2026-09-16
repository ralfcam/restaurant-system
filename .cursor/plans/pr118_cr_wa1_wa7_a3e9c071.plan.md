# pr118_cr_wa1_wa7_a3e9c071

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
- Work-order: `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (planning hint only — no tracked Linear ID on this invocation)
- Project: restaurant-system V-0.2 (hint; PR #118 / RES-76 context)
- Work type: implementation (regression of two WA Dashboard defects)
- Milestone: M4 (work-type hint)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text CodeRabbit Major threads on PR #118 (`rmr118-a4c1`, `rmr118-e7b2`) — not a new Linear ID. Observed: (1) `/admin` weekly overview calls `getAllOperatingWindowsMap()`, which substitutes `DEFAULT_OPERATING_DAYS` when `operating_windows` is empty/error; (2) `loadWeeklyServiceOverview` shares an unguarded `Promise.all` with `getFloorSnapshot`, so one slot/window throw 500s tonight's occupancy/bookings.
- Missing constraint: WA-1 names suggested-segment templates but does not say an empty/unconfigured ledger MUST NOT use `DEFAULT_OPERATING_DAYS`. No WA requires isolating weekly load from FP-11 widgets.
- Spec update proposed: `docs/specs/scheduling.md` → sharpen WA-1; add WA-7.

## Spec

- Source: extend `docs/specs/scheduling.md`
- Summary: Empty/unconfigured `operating_windows` yields seven day columns with no services (no DEFAULT templates). Weekly overview load failure must not fail current-day Dashboard widgets.
- Clarifications needed: none. Guest widget may keep `getAllOperatingWindowsMap` defaults; only the staff overview is constrained.

### Spec edit to apply (orchestrator)

In `docs/specs/scheduling.md`: extend Scope to WA-1–WA-7. After WA-1's last sentence, add that an empty or unconfigured `operating_windows` ledger MUST yield seven day columns with no services and MUST NOT substitute `DEFAULT_OPERATING_DAYS`. After WA-6, add WA-7 isolation.

## Acceptance Criteria → Tests

| #   | Criterion                                         | Risk | Layer | Test file                                          | New or existing     | Test name                                                      | Assertion                                                                                                      | Command                                                             | Depends on |
| --- | ------------------------------------------------- | ---- | ----- | -------------------------------------------------- | ------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| C1  | Weekly load failure does not fail FP-11 Dashboard | P1   | unit  | tests/unit/floor/dashboard-weekly-overview.test.ts | existing (add test) | weekly overview load is isolated from tonight's floor snapshot | page source does not put `loadWeeklyServiceOverview` in the same unguarded `Promise.all` as `getFloorSnapshot` | `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts` | none       |
| C2  | Empty windows are not DEFAULT templates           | P1   | unit  | tests/unit/floor/dashboard-weekly-overview.test.ts | existing (add test) | weekly overview does not load DEFAULT operating-day templates  | `/admin` loader source does not call `getAllOperatingWindowsMap` / `DEFAULT_OPERATING_DAYS`                    | `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref           | Test file::name                                                                                   | Source file(s)     | Risk | Status  |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------- | ------------------ | ---- | ------- |
| C1        | scheduling.md WA-7 | dashboard-weekly-overview.test.ts::weekly overview load is isolated from tonight's floor snapshot | app/admin/page.tsx | P1   | planned |
| C2        | scheduling.md WA-1 | dashboard-weekly-overview.test.ts::weekly overview does not load DEFAULT operating-day templates  | app/admin/page.tsx | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked / source-read)

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — sharpen WA-1; add WA-7
- Existing-test edit: none (add tests only)

## TDD Execution Loop

### Criterion 1 — Weekly load isolated from FP-11 (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing test in `tests/unit/floor/dashboard-weekly-overview.test.ts` named `weekly overview load is isolated from tonight's floor snapshot`. It reads `app/admin/page.tsx` and fails because `loadWeeklyServiceOverview` is a sibling of `getFloorSnapshot` inside one unguarded `Promise.all`. Command: `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts`. Work-order: `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md`. Do not edit the existing chrome `it`.
- **Green** → Invoke `tdd-green` to isolate weekly load so a throw cannot reject `getFloorSnapshot` / `getAuthUser`. Do not change guest `getAllOperatingWindowsMap` defaults. Exit = target test green. Work-order same.
- **Refactor** → Invoke `tdd-refactor` to clean the isolation; re-run the file + lint + typecheck + prettier --check on touched source.

### Criterion 2 — No DEFAULT templates (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing test in the same file named `weekly overview does not load DEFAULT operating-day templates`. It reads the `/admin` weekly loader source and fails because it calls `getAllOperatingWindowsMap` (DEFAULT fallback on empty/error). Command same. Do not edit other `it`s.
- **Green** → Invoke `tdd-green` so the overview uses configured `operating_windows` only (empty/error → no services). Do not remove DEFAULT fallback from the guest calendar reader. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean the configured-only path; re-run tests + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — omitted)

No tracked Linear ID on this invocation. START omitted. PR #118 / RES-76 is context only.

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`. No `start-linear`. No `4b-linear` (no tracked issue).

## Docs sync packet

- plan_slug: pr118_cr_wa1_wa7_a3e9c071
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [WA-7, WA-1-empty-ledger]
- criteria_manual_uat: none
- req_ids: [WA-1, WA-7]
- source_paths: [app/admin/page.tsx]
- test_paths: [tests/unit/floor/dashboard-weekly-overview.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: []
- traceability_log: docs/verifier-reports/tdd/pr118_cr_wa1_wa7_a3e9c071.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                            | Where (file:line/area)                                  | Why it matters                                     | Severity | Relation                                |
| -------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- | -------- | --------------------------------------- |
| Guest calendar still uses DEFAULT on empty windows | app/actions/availability.ts `getAllOperatingWindowsMap` | Intentional guest fallback; not this Dashboard fix | n/a      | in-scope exclusion — leave guest reader |

## Linear Close-out & Findings Registration

- START: omitted — no tracked issue
- Close-out: omit 4B
- Findings registration: 4C merge + register from ledger (floor/attach/cap); Cloud does not auto-confirm net-new issues

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Isolation of weekly load vs `getFloorSnapshot` → `app/admin/page.tsx`
- Configured-only windows (no DEFAULT) → `app/admin/page.tsx`

## Retrospective (close-out, Step 4E)

- Patterns for packet: none until Refactor reports
- Traceability finalized: pending
- Run metrics: pending
- harness-lint: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order written. No START (no tracked issue). Apply spec edit to `docs/specs/scheduling.md`, then Criterion 1 Red.

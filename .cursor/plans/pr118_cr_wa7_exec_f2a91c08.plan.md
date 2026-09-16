# pr118_cr_wa7_exec_f2a91c08

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
- Work-order: `.cursor/plans/pr118_cr_wa7_exec_f2a91c08.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name informational)
- Project: untracked hint (free-text `bug:` / CodeRabbit threads; no new Linear ID)
- Work type: implementation (sharpen existing WA-7 + regression test)
- Milestone: M4 (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: free-text — unresolved Major CodeRabbit threads on PR #118 after HEAD `76de403`. Thread `rmr118-8b04` (`cr-comment:v1:d21e3b2b28cc4f720067947a`): WA-7 isolation is only source-scanned as two unguarded `Promise.all` shapes in `tests/unit/floor/dashboard-weekly-overview.test.ts`. Observed: that scan passes while a sequential `await getFloorSnapshot(today)` plus uncaught `await loadWeeklyServiceOverview(selectedDate)` would still reject the current-day path. Expected: a rejecting weekly window/slot read leaves FP-11 occupancy and today's bookings available.
- Missing constraint (root cause): WA-7 required isolation but did not require an executed failure path, so a vacuous source-scan could satisfy the written tests while sequential uncaught weekly await still took down tonight's Dashboard.
- Spec update proposed: `docs/specs/scheduling.md` WA-7 — isolation MUST hold concurrently or sequentially; `{ days: [] }` MAY be the failure fallback; proof MUST execute a rejecting weekly load and still settle the current-day snapshot (source-scanning `Promise.all` / `.catch` is not sufficient).
- Thread `rmr118-3e91` (`cr-comment:v1:f8b640b33ef1f3d27e16ef67`) on `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md` ("Require delegation-guard evidence before advancing C1 or C2") is hook-authoring process-meta, not a scheduling product rule. Out of scope — do not invent a toolchain AC or edit the completed plan. This run still arms `tdd-guard` per Execution Protocol.

## Spec

- Source: extend existing `docs/specs/scheduling.md` (WA-7)
- Summary: `/admin` weekly overview load failure must not reject current-day FP-11 occupancy or today's bookings, whether loads are concurrent or sequential. Overview MAY fall back to empty-service columns / `{ days: [] }`. Isolation is proven by executing a rejecting weekly window/slot read, not by scanning Dashboard source for `Promise.all` or `.catch`.
- Clarifications needed: none. Pre-mortem: a sequential-await refactor would ship a source-green suite and still take down tonight's Dashboard. Inversion: the current regex pair passes while the failure path never runs.

## Acceptance Criteria → Tests

| #   | Criterion                                                                             | Risk | Layer | Test file                                            | New or existing                                                    | Test name                                                        | Assertion                                                                                                                                                                                                                                          | Command                                                             | Depends on |
| --- | ------------------------------------------------------------------------------------- | ---- | ----- | ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| C1  | Rejecting weekly window/slot load still settles tonight's floor snapshot and bookings | P0   | unit  | `tests/unit/floor/dashboard-weekly-overview.test.ts` | existing file (add one `it`; do not delete chrome / DEFAULT tests) | weekly overview rejection still settles tonight's floor snapshot | Successful `getFloorSnapshot` + rejecting weekly availability/window read → current-day snapshot still settles for occupancy/bookings; weekly overview uses empty days / `{ days: [] }`. Must execute the rejection (not only scan `Promise.all`). | `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref           | Test file::name                                                                                     | Source file(s)                                         | Risk | Status  |
| --------- | ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---- | ------- |
| C1        | scheduling.md WA-7 | dashboard-weekly-overview.test.ts::weekly overview rejection still settles tonight's floor snapshot | `app/admin/page.tsx` (and any isolator Green extracts) | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- If page import needs a Green-phase stub (harness cannot invoke the Server Component), Red reports that — do not treat a compile/import crash as RED.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — sharpen WA-7 so isolation is concurrent-or-sequential and must be proven by an executed rejecting weekly load.
- Existing-test edit: `tests/unit/floor/dashboard-weekly-overview.test.ts` — the vacuous `Promise.all` source-scan cannot prove WA-7; add (or replace that one `it` with) an executed failure-path test. Do not delete the chrome or DEFAULT-template tests.

## TDD Execution Loop

### Criterion C1 — weekly rejection still settles tonight's floor snapshot (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in `tests/unit/floor/dashboard-weekly-overview.test.ts` named "weekly overview rejection still settles tonight's floor snapshot". Execute a rejecting weekly window/slot read with a successful `getFloorSnapshot`; assert current-day occupancy/bookings still settle and weekly days are empty. Must not be a `Promise.all` source-scan. Exit: RED for the right reason, or already-green if today's `.catch(() => ({ days: [] }))` already satisfies the executed path (report already-green; do not invent a missing export just to fail). Command: `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts`.
- **Green** → Invoke `tdd-green` to make that test pass with the minimal source change (only if Red was actually RED). If Red was already-green, skip Green. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit: target file green (executed) + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4-format`.

`4d-review-trail` — INPUT: `docs/verifier-reports/tdd/pr118_cr_wa7_exec_f2a91c08.md` (per-criterion sections appended after each Refactor phase). OUTPUT: `## Suggested Review Order (collated)` in the same log.

`4e-traceability` — INPUT: same tdd log. OUTPUT: `## Traceability (final)` and `## Run metrics`.

`4-docs-packet` — assemble the Docs sync packet from the log.

`4-docs-updater` — delegate with that packet.

`4c-findings` — INPUT: `docs/findings/runs/pr118_cr_wa7_exec_f2a91c08.md` (merged into `docs/findings/<category>.md` at Step 4C). Skip register if ledger empty.

`4-format` — INPUT: this run's dirty paths from `git status --porcelain`. OUTPUT: `pnpm exec prettier --write <path> …` (never `.`). Then STEP 4G, then STEP 4F (managed Cloud: commit.md, on PASS push.md).

```markdown
## Docs sync packet

- plan_slug: pr118_cr_wa7_exec_f2a91c08
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [WA-7]
- source_paths: [app/admin/page.tsx]
- test_paths: [tests/unit/floor/dashboard-weekly-overview.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr118_cr_wa7_exec_f2a91c08.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                                                     | Where (file:line/area)                            | Why it matters                                                                                                                                | Severity      | Relation    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| Delegation-guard spawn/denial/disarm evidence on a completed plan (process-meta; not filed) | `.cursor/plans/pr118_cr_wa1_wa7_a3e9c071.plan.md` | Hook-authoring liveness is not a scheduling AC. This run arms `tdd-guard` per protocol. Do not edit the completed plan or add a toolchain AC. | n/a (process) | rmr118-3e91 |

Planning-time seed only. Do not copy the process-meta row into `docs/findings/runs/` (TDD-process notes are not ledger entries).

## Linear Close-out & Findings Registration

- **START:** omit — free-text `bug:` with no tracked Linear ID.
- **Close-out (4B):** omit — no tracked issue.
- **Findings registration:** merge run file if it has open lines; skip register if empty after curation. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- dashboard isolation → `app/admin/page.tsx` weekly load vs `getFloorSnapshot`
- executed WA-7 test → `tests/unit/floor/dashboard-weekly-overview.test.ts`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (seed)
- Traceability finalized in tdd log `## Traceability (final)`: yes (at close-out)
- Run metrics stamped in tdd log `## Run metrics`: yes (at close-out)
- `node .cursor/checks/harness-lint.mjs pr118_cr_wa7_exec_f2a91c08`: pending close-out

## First Execution Action

- **Managed Cloud one-shot:** after writing `.cursor/plans/pr118_cr_wa7_exec_f2a91c08.plan.md`, do not wait. No START (no tracked issue). Arm `tdd-guard`, apply the `docs/specs/scheduling.md` WA-7 edit listed in Permissions Requested, Prettier that spec, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never `gh pr merge`.

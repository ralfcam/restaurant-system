# PR #126 remaining Majors — stable FP-15-COMPLETE page order

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
- Work-order: `.cursor/plans/pr126_cr_stable_order_c3a91e08.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (hint only — untracked free-text)
- Project: untracked hint — same floor/scheduling owner as RES-72
- Work type: implementation (money / data-integrity)
- Milestone: M4
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text — PR #126 US latest-head `unresolved_threads` (2 Major). Adapter ids `pr126-cr-a7f2` (schema.test.ts) and `pr126-cr-b4e1` (`reservations.ts`).
- Observed vs expected:
  - **b4e1 (confirmed):** `getFloorSnapshot` pages `orders` with `.range` and no unique order. PostgREST offset pages can overlap or skip rows; seated `tableTotals` can under/overstate. Expected: every matching order appears in exactly one page.
  - **a7f2 (not a product defect):** `schema.test.ts` FP-4/FP-15 its remain source-regex. `getFloorSnapshot` already executes in `floor-snapshot-bills.test.ts`; overlay guest/party/time/`billTotal` already executes in `auto-assign.test.ts`. A chip-mount test of today's JSX would be green on current code (invalid Red). Leftover is existing test-debt (`C5 never mounts the chip`).
- Missing constraint (root cause): FP-15-COMPLETE requires paging past `max_rows` but does not require a unique immutable page key, so offset pagination is not a complete read.
- Spec update proposed: `docs/specs/scheduling.md` FP-15-COMPLETE — each paged orders read MUST `.order("id", { ascending: true })` before `.range`.

## Spec

- Source: extend existing `docs/specs/scheduling.md`
- Summary: Seated chip bills sum every matching order. Paging past PostgREST `max_rows` is already required. This run adds the stable `orders.id` order so those pages are disjoint and complete.
- Clarifications needed: none. Finding a7f2 is classified test-debt / already covered at action+overlay; not a second AC.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                    | Risk | Layer | Test file                                       | New or existing                  | Test name                                            | Assertion                                                                                                                                                                         | Command                                                        | Depends on |
| --- | -------------------------------------------------------------------------------------------- | ---- | ----- | ----------------------------------------------- | -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| C1  | FP-15-COMPLETE-STABLE — paged orders reads apply unique immutable `id` order before `.range` | P0   | unit  | `tests/unit/floor/floor-snapshot-bills.test.ts` | existing file, **new `it` only** | `floor snapshot pages orders with a stable id order` | The orders thenable records `.order("id", { ascending: true })` before `.range`; without that call the 1001st matching total is omitted. Must fail on today's unordered `.range`. | `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                     | Test file::name                                                                  | Source file(s)                      | Risk | Status  |
| --------- | ---------------------------- | -------------------------------------------------------------------------------- | ----------------------------------- | ---- | ------- |
| C1        | scheduling.md FP-15-COMPLETE | floor-snapshot-bills.test.ts::floor snapshot pages orders with a stable id order | app/actions/reservations.ts (Green) | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — add the unique immutable `orders.id` order to FP-15-COMPLETE.
- Existing-test edit: none. Red adds one new `it` and a file-local thenable; do not modify existing its or `ordersPagedThenable`.

## TDD Execution Loop

### Criterion C1 — FP-15-COMPLETE-STABLE (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("floor snapshot pages orders with a stable id order")` in `tests/unit/floor/floor-snapshot-bills.test.ts`. New thenable in this `it` only: return the 1001st matching row on page 2 only when `.order("id", { ascending: true })` was called before `.range`; otherwise page 2 is empty. Assert `tableTotals["7"]` includes that 1001st total (same 1000×1 + 3.5 contract as the existing paging `it`). Do not edit existing its. Must fail on today's unordered loop. Command: `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts`.
- **Green** → Invoke `tdd-green` to add `.order("id", { ascending: true })` on the `orders` select before `.range` in `fetchAllOrderPages`. No cursor pagination, no date window, no new RPC. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean C1 source; exit = green (executed, whole relevant suite) + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Omit — free-text `bug:` with no tracked issue. STEP 2B / 4B skipped.

## Docs Sync

No `start-linear`. Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format` (no `4b-linear`).

`4d-review-trail` INPUT: `docs/verifier-reports/tdd/pr126_cr_stable_order_c3a91e08.md` — OUTPUT: `## Suggested Review Order (collated)` in that log.
`4e-traceability` INPUT: same log — OUTPUT: `## Traceability (final)` + `## Run metrics`.
`4c-findings` INPUT: `docs/findings/runs/pr126_cr_stable_order_c3a91e08.md` merged into `docs/findings/<category>.md`.
`4-format` INPUT: this run's dirty paths from `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <path> …` (never `.`); then STEP 4G then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: pr126_cr_stable_order_c3a91e08
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [FP-15-COMPLETE]
- source_paths: [app/actions/reservations.ts]
- test_paths: [tests/unit/floor/floor-snapshot-bills.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr126_cr_stable_order_c3a91e08.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                              | Where (file:line/area)                             | Why it matters                                                                                         | Severity | Relation                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------- |
| schema.test.ts FP-4/FP-15 its remain source-regex; chip never mounts | `tests/unit/floor/schema.test.ts`                  | Maintainability Major a7f2; action+overlay already execute; a mount test of current JSX would be green | med      | existing `docs/findings/test-debt.md` “C5 never mounts the chip” |
| Concurrent inserts during paging can still shift offsets             | `app/actions/reservations.ts` `fetchAllOrderPages` | Stable `id` order fixes heap-order skip/dup; a live insert mid-loop can still shift pages              | low      | CR suggested cursor/freeze; YAGNI beyond unique order            |
| FP-15 still sums lifetime orders (no service-date window)            | `getFloorSnapshot`                                 | Historical tickets on a reused label can inflate tonight's chip                                        | med      | existing product-gap; not this thread                            |

## Linear Close-out & Findings Registration

- **START:** skip (no tracked issue).
- **Close-out (4B):** skip.
- **Findings registration:** merge run file → `docs/findings/<category>.md`, then `linear-resolver` REGISTER FINDINGS (floor/cap; managed Cloud does not auto-confirm net-new issues). Resolve in-run the prior “no stable order” tech-debt line when C1 ships so it is not re-filed.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [booking] → `app/actions/reservations.ts` `fetchAllOrderPages` `.order("id")` then `.range`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (filled after Refactor)
- Traceability finalized in tdd log `## Traceability (final)`: yes at 4E
- Run metrics stamped in tdd log `## Run metrics`: yes at 4E
- `node .cursor/checks/harness-lint.mjs pr126_cr_stable_order_c3a91e08`: at 4E

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `tdd-guard` first. No START. Apply the spec edit listed in `## Permissions Requested`, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never `gh pr merge`.

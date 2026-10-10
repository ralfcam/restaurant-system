# res-151_cloud_harness_guards_14f7

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
  before 4C. After 4C/4B, run the format pass, then STEP 4G (do not run the CLI), then STEP 4F. Linear
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
  (do not run `coderabbit-gate.mjs` here; the CLI lives on `/push`; do not write the
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

**Cloud-VM exception recorded here:** this managed session has no `Task`
subagent tool (catalog search returned none). START / tdd-\* / docs-updater /
linear-resolver delegation is therefore BLOCKED. The Cloud issue task still
requires the ACs to ship. The orchestrator executes spec → Red tests → Green
source in that order, without arming `tdd-guard` (arming would brick the only
writer). Parent Linear `save_comment` stays forbidden; START is visibility
BLOCKED.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-151_cloud_harness_guards_14f7.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (only nonterminal RES `V-X.X`; V-0.1/V-0.2 completed)
- Work type: launch-critical/security (harness guards; issue label `security`)
- Milestone: M8 — General Availability (GA)
- Mixed design + implementation: no
- Clarification: none (CPOO merge-bypass scope is explicit)

## Issue & Root Cause (FIX mode only)

- Issue: [RES-151](https://linear.app/realized/issue/RES-151/harness-guards-bypassed-in-cloud-agents-fan-out-cap-linear-write-lock) — Cloud agents do not run `beforeMCPExecution`, so the Linear write lock never fires; the fan-out cap of 8 uses an unlocked JSON counter and fails open; `detectGhPrMerge` matches only literal `gh pr merge`.
- Missing constraint: G-LG1 deferred Cloud Linear wiring; G-TD1 pinned fan-out fail-open; no AC required tolerant merge matching or protected-branch push denial.
- Spec update proposed: `docs/specs/dev-toolchain.md` — amend G-LG1 + G-TD1 item 3; add G-FO1, G-MRG1, G-PUSH1.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md`
- Summary: Cloud Linear write lock on `preToolUse` MCP writers (deny unknown server). Fan-out reservations atomic and fail-closed. Merge detector covers bash -c, full paths, `gh -R`, `gh api …/merge`, GraphQL `mergePullRequest`, curl merge URL, GitHub MCP merge tools. Any `git push` to `main` or `staging` (including force) is denied.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                        | Risk | Layer | Test file                                                    | New or existing | Test name                                                                        | Assertion                             | Command                                                                     | Depends on |
| --- | -------------------------------- | ---- | ----- | ------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| 1   | G-LG1 Cloud Linear write lock    | P0   | unit  | tests/unit/dev-toolchain/linear-write-cloud-path.test.ts     | new             | preToolUse MCP save_issue denies when flag off and when server unknown           | spawn-level deny                      | pnpm test:unit tests/unit/dev-toolchain/linear-write-cloud-path.test.ts     | spec       |
| 2   | G-FO1 atomic fail-closed fan-out | P0   | unit  | tests/unit/dev-toolchain/task-fanout-atomic.test.ts          | new             | nine parallel Task reservations deny exactly one; malformed stdin exits non-zero | 8 allow / 1 deny; failClosed true     | pnpm test:unit tests/unit/dev-toolchain/task-fanout-atomic.test.ts          | spec       |
| 3   | G-MRG1 tolerant merge matching   | P0   | unit  | tests/unit/dev-toolchain/merge-bypass-guard.test.ts          | new             | each listed merge bypass is denied                                               | one it per bypass + allowed siblings  | pnpm test:unit tests/unit/dev-toolchain/merge-bypass-guard.test.ts          | spec       |
| 4   | G-PUSH1 no push to main/staging  | P0   | unit  | tests/unit/dev-toolchain/protected-branch-push-guard.test.ts | new             | force and ordinary pushes to main/staging denied                                 | deny those; allow feature-branch push | pnpm test:unit tests/unit/dev-toolchain/protected-branch-push-guard.test.ts | spec       |

## Traceability Matrix

| Criterion | Spec ref             | Test file::name                     | Source file(s)                                              | Risk | Status  |
| --------- | -------------------- | ----------------------------------- | ----------------------------------------------------------- | ---- | ------- |
| G-LG1     | dev-toolchain.md §17 | linear-write-cloud-path.test.ts     | linear-write-policy.mjs, linear-write-guard.mjs, hooks.json | P0   | planned |
| G-FO1     | dev-toolchain.md §31 | task-fanout-atomic.test.ts          | task-fanout-policy.mjs, task-fanout-guard.mjs, hooks.json   | P0   | planned |
| G-MRG1    | dev-toolchain.md §32 | merge-bypass-guard.test.ts          | tdd-guard-policy.mjs, git-stage-guard.mjs, hooks.json       | P0   | planned |
| G-PUSH1   | dev-toolchain.md §33 | protected-branch-push-guard.test.ts | tdd-guard-policy.mjs, git-stage-guard.mjs                   | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Out of scope: RES-149 conductor eligibility; linear-spawn and comment-size stay off `preToolUse`; no migrations; no push to main/staging; no `gh pr merge`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — amend G-LG1, G-TD1 item 3, implementation-trace rows; add G-FO1 / G-MRG1 / G-PUSH1.
- Existing-test edit: `tests/unit/dev-toolchain/linear-guard-placement.test.ts` — G-LG1 now requires linear-write on `preToolUse`.
- Existing-test edit: `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` — fan-out failClosed becomes true; malformed fan-out exits non-zero.
- Existing-test edit: `.cursor/checks/task-fanout-policy.test.mjs` — pin failClosed true on the Task preToolUse entry.

## TDD Execution Loop

### Criterion 1 — G-LG1 Cloud Linear write lock (layer: unit)

- **Red** → Invoke `tdd-red` to add `tests/unit/dev-toolchain/linear-write-cloud-path.test.ts` proving `preToolUse` `MCP:save_issue` / `save_comment` / `save_status_update` deny when the allow flag is off, including unknown/missing server; placement test requires the MCP matcher.
- **Green** → Invoke `tdd-green` to register `linear-write-guard.mjs` on `preToolUse` with that matcher and deny unknown-server writes on that path.
- **Refactor** → Invoke `tdd-refactor` to keep spawn/comment-size off `preToolUse` and re-verify.

### Criterion 2 — G-FO1 atomic fail-closed fan-out (layer: unit)

- **Red** → Invoke `tdd-red` to add `tests/unit/dev-toolchain/task-fanout-atomic.test.ts`: nine parallel hook spawns against an empty counter deny exactly one; malformed stdin exits non-zero; hooks.json `failClosed: true`.
- **Green** → Invoke `tdd-green` to lock load/tryReserve/save and fail-close the hook.
- **Refactor** → Invoke `tdd-refactor` to keep TTL/start/stop/--failure behavior and update `task-fanout.mdc`.

### Criterion 3 — G-MRG1 tolerant merge matching (layer: unit)

- **Red** → Invoke `tdd-red` to add one executed test per bypass in `tests/unit/dev-toolchain/merge-bypass-guard.test.ts`.
- **Green** → Invoke `tdd-green` to expand the detector and wire MCP merge tools through `git-stage-guard.mjs`.
- **Refactor** → Invoke `tdd-refactor` to keep `gh pr create|view|ready|edit` allowed.

### Criterion 4 — G-PUSH1 no push to main/staging (layer: unit)

- **Red** → Invoke `tdd-red` to add `tests/unit/dev-toolchain/protected-branch-push-guard.test.ts` for ordinary, force, HEAD:, +refspec, full-path, and bash -c pushes to main/staging.
- **Green** → Invoke `tdd-green` to deny those in `git-stage-guard.mjs`.
- **Refactor** → Invoke `tdd-refactor` to keep feature-branch `git push origin HEAD` allowed.

## Manual-UAT (deferred, not automated)

- Live Cloud probe of 9 parallel Tasks and a live Linear `save_issue` denial — unit spawn-level tests prove the logic; a live Cloud denial is the hook-authoring liveness ideal, not automatable here.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-151_cloud_harness_guards_14f7`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-151_cloud_harness_guards_14f7.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 4 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test edit `tests/unit/dev-toolchain/linear-guard-placement.test.ts`, `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`, `.cursor/checks/task-fanout-policy.test.mjs`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-151_cloud_harness_guards_14f7.plan.md`

Problem: Cloud agents skip beforeMCPExecution, so the Linear write lock never fires; the fan-out cap races and fails open; the merge guard matches only literal gh pr merge.
Approach: Wire the Linear write guard to preToolUse MCP writers and deny unknown-server writes; lock fan-out reservations and fail closed; expand merge matching and block git push to main or staging.
Out-of-scope findings: none

| #   | Criterion                  | Risk | Layer | Test file                                                    |
| --- | -------------------------- | ---- | ----- | ------------------------------------------------------------ |
| 1   | Cloud Linear write lock    | P0   | unit  | tests/unit/dev-toolchain/linear-write-cloud-path.test.ts     |
| 2   | Atomic fail-closed fan-out | P0   | unit  | tests/unit/dev-toolchain/task-fanout-atomic.test.ts          |
| 3   | Tolerant merge matching    | P0   | unit  | tests/unit/dev-toolchain/merge-bypass-guard.test.ts          |
| 4   | No push to main/staging    | P0   | unit  | tests/unit/dev-toolchain/protected-branch-push-guard.test.ts |
```

## Docs Sync

START is BLOCKED (no Task / no parent Linear write). Close-out todos stay: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater` (inline if Task missing), `4c-findings`, `4b-linear` (BLOCKED same reason), `4-format`, then commit.md and push.md.

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

- RES-149 conductor eligibility stays out of this run.

## Linear Close-out & Findings Registration

- START: BLOCKED — Task unavailable; parent must not `save_comment`.
- Close-out: BLOCKED for the same reason; resolution lives on the draft PR (`Closes RES-151`).
- Findings: only if the run file has open lines.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- security → linear-write-policy / hooks.json preToolUse MCP matcher
- security → task-fanout lock + failClosed
- security → merge + protected-branch detectors

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-151_cloud_harness_guards_14f7`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. START BLOCKED. Apply the spec / existing-test edits listed in Permissions Requested, then Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never `gh pr merge`. Never push to `main` or `staging`.

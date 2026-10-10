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

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-127_guard_scripts_d2be.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: restaurant-system V-0.5 (`P-RES-12`), canonical version key `V-0.5`. Live set: V-0.5 status Backlog (nonterminal); V-0.2 and V-0.1 Completed (excluded). No duplicate canonical key. Precedence: the issue already sits on that only nonterminal RES version project.
- Work type: launch-critical/security/money (security write-boundary on the armed TDD guard)
- Milestone: M8 — General Availability (GA). Matches the issue's existing milestone and the security route. No move.
- Mixed design + implementation: no
- Clarification: none. Ready brief `Decisions:` already choose the prefix, the named state-file escape, and the paths that stay writable.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-127 — while armed, depth 0 can Write `.cursor/hooks/tdd-delegation-guard.mjs` and `.cursor/hooks/lib/tdd-guard-policy.mjs`. Expected: those Writes are `permission: "deny"`, and `.cursor/hooks/state/tdd-guard.json` stays no deny.
- Missing constraint (root cause): G-TD1 items 1–3 protect product prefixes and the disarm file only by omission. `PROTECTED_PREFIXES` does not include `.cursor/hooks/`, so `checkTddWrite` returns null for a guard script.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-TD1 gains item 4 (guard-script deny, named state-file allow at any depth and phase, no other `.cursor/` path protected) and the evidence row names that deny. FIRST execution action after START is launched.

## Spec

- Source: existing `docs/specs/dev-toolchain.md` (G-TD1). Hub walk not required: the Ready brief names this spec and criterion.
- Summary: Spawn-proven liveness already denies a protected product path and allows the disarm file. This change requires the same deny for orchestrator Writes under `.cursor/hooks/`, with the disarm file allowed by its exact relative name.
- Clarifications needed: none.

## Acceptance Criteria → Tests

Pre-mortem: protecting all of `.cursor/` would deny the disarm write and brick the armed window. The criterion therefore names one file, not a broader prefix. Inversion: a test that only expects no deny on `tdd-guard.json` passes on today's code. Red must fail because a depth-0 Write of the guard script is not denied, and because `.cursor/hooks/state/other.json` is not denied either — after the prefix exists, only the exact state-file name stays allowed.

| #   | Criterion                                                                                                                                                         | Risk | Layer | Test file                                             | New or existing         | Test name                                                                  | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Command                                                              | Depends on |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ----------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| 1   | While armed, depth 0 denies a BOM-prefixed Write under `.cursor/hooks/` except the named state file, at any depth and phase; other `.cursor/` paths stay writable | P0   | unit  | `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | existing (add one test) | `armed depth 0 denies a BOM-prefixed Write to the delegation guard script` | One `it`: spawn status 0 and `permission: "deny"` for `.cursor/hooks/tdd-delegation-guard.mjs` at depth 0. Same file imports `checkTddWrite` and `PROTECTED_PREFIXES`: prefix includes `.cursor/hooks/`; guard script, its lib, and `.cursor/hooks/state/other.json` at depth 0 are `{ deny: true, kind: "delegation" }`; the named state file is null at depth 0 and 1 for phase null, red, green, and refactor; `.cursor/plans/x.plan.md`, `.cursor/commands/conduct.md`, `.cursor/checks/tdd-guard-policy.test.mjs`, and `.cursor/hooks.json` at depth 0 are null. Existing state-file spawn still `{}`. | `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                      | Test file::name                                                                                      | Source file(s)                           | Risk | Status  |
| --------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---- | ------- |
| G-TD1-4   | dev-toolchain.md G-TD1 item 4 | tdd-guard-liveness.test.ts::armed depth 0 denies a BOM-prefixed Write to the delegation guard script | `.cursor/hooks/lib/tdd-guard-policy.mjs` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No Supabase, Playwright, or deployed pack.
- Verification command from the Ready brief: `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts && node --test .cursor/checks/tdd-guard-policy.test.mjs`

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — add G-TD1 item 4, extend the regression-guard paragraph, and name the guard-script deny on the G-TD1 evidence row. Ready brief `Allowed edits`.
- Existing-test edit: `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` — add one test for the depth-0 spawn and the pure `checkTddWrite` pins. The state-file case already expects no deny and must keep doing so. Do not edit `.cursor/checks/tdd-guard-policy.test.mjs` in Red; that file stays in the verification command so existing cases still run.

## TDD Execution Loop

### Criterion 1 — G-TD1-4 guard-script deny (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing `it` in `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` only. Do not edit `docs/specs/dev-toolchain.md`, `.cursor/hooks/lib/tdd-guard-policy.mjs`, or `.cursor/checks/tdd-guard-policy.test.mjs`. The test spawns `tdd-delegation-guard.mjs` with a BOM-prefixed `Write` whose path is `.cursor/hooks/tdd-delegation-guard.mjs`, state armed at depth 0, and expects `permission: "deny"`. The same `it` imports `checkTddWrite` and `PROTECTED_PREFIXES` and pins the matrix in the criterion table. Restore `tdd-guard.json` in `finally` / `afterAll` the way the file already does. Run `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`. Exit: the new test fails because the write is allowed, not because of a harness error. Existing G-TD1 cases stay green.
- **Green** → Invoke `tdd-green` to make that test pass with a minimal edit to `.cursor/hooks/lib/tdd-guard-policy.mjs` only. Add `.cursor/hooks/` to `PROTECTED_PREFIXES`. Allow exactly `.cursor/hooks/state/tdd-guard.json` by that relative name inside `checkTddWrite`, before the protected-prefix deny, at every depth and phase. Do not special-case a directory. Do not protect `.cursor/hooks.json`, `.cursor/plans/`, `.cursor/commands/`, or `.cursor/checks/`. Do not edit tests or the spec. Exit: `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` and `node --test .cursor/checks/tdd-guard-policy.test.mjs` both green, executed, not skipped.
- **Refactor** → Invoke `tdd-refactor` to clean the policy change without behavior change and re-verify both commands, plus `pnpm lint`, `pnpm typecheck`, and `pnpm exec prettier --check` on the source file this criterion touched. Exit: still green.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-127_guard_scripts_d2be`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-127_guard_scripts_d2be.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test edit `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | existing-test edit `.cursor/checks/tdd-guard-policy.test.mjs`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-127_guard_scripts_d2be.plan.md`

Problem: While the TDD guard is armed, the orchestrator (depth 0) can Write `.cursor/hooks/tdd-delegation-guard.mjs` and `.cursor/hooks/lib/tdd-guard-policy.mjs`. G-TD1 denies product prefixes and leaves the disarm file allowed only because `.cursor/hooks/` is not a protected prefix. Expected: those guard-script Writes are denied, and `.cursor/hooks/state/tdd-guard.json` stays allowed by its file name at any depth and phase.
Approach: Add `.cursor/hooks/` to the protected prefixes and return no deny for that one relative state-file path before the prefix check. Do not protect the rest of `.cursor/`. Prove it with a depth-0 BOM spawn of the delegation guard plus a pure policy case that denies a sibling state file. The absolute-path normalize from RES-126 stays as it is.
Out-of-scope findings: none

| #   | Criterion                                                          | Risk | Layer | Test file                                           |
| --- | ------------------------------------------------------------------ | ---- | ----- | --------------------------------------------------- |
| 1   | Depth 0 denies `.cursor/hooks/` Writes except the named state file | P0   | unit  | tests/unit/dev-toolchain/tdd-guard-liveness.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G (do not run `coderabbit-gate.mjs` here; the CLI lives on `/push`; do not write the receipt into the tdd log), then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

Ready brief exclusions, not new issues. Do not file them.

| Finding                                              | Where (file:line/area)                   | Why it matters                                               | Severity | Relation                            |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ | -------- | ----------------------------------- |
| Absolute-path normalize                              | RES-126                                  | Already specified and shipped; this issue does not reopen it | n/a      | Ready brief exclusion — do not file |
| Protecting all of `.cursor/`                         | `.cursor/hooks/lib/tdd-guard-policy.mjs` | Would deny the disarm write and brick the armed window       | n/a      | Ready brief exclusion — do not file |
| `.cursor/hooks.json` and the other preToolUse guards | `.cursor/hooks.json`                     | Wiring and sibling guards are outside this deny              | n/a      | Ready brief exclusion — do not file |

The open tech-debt line "Disarm escape is implicit (not STATE_PATH allow-listed)" is the same gap as G-TD1 item 4. This criterion implements that allow-by-name. Close-out checks that line off; it is not a new finding.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-127 (plan: `res-127_guard_scripts_d2be`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before the spec edit.
- **Close-out (FIX):** delegate `linear-resolver` to post the resolution comment only. No workflow-state write.
- **Findings registration:** skip net-new filing. The table above is operator exclusions. If the run file stays empty, do not ask `linear-resolver` to create issues. If a phase records a real out-of-scope line, merge it and persist it on the ledger without auto-confirming a new issue.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Filled at Step 4D from the refactor log.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: filled at Step 4E
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-127_guard_scripts_d2be`: pending

## First Execution Action

- **Managed Cloud one-shot:** this file is the work-order. Arm the delegation guard, launch START (`run_in_background: true`, do not wait), apply the G-TD1 spec edit, then delegate Criterion 1 Red to `tdd-red`.

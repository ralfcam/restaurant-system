# /sdd-to-tdd RES-126 — absolute-path normalize is checkout-name-hardcoded

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-09).
Branch `cursor/res-126-bf39` from `origin/staging`. Ready brief Queue 7
(dispatch 2026-10-08) pre-authorizes the paths in Permissions Requested.
Verification: `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/res-126_absolute_normalize_bf39.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-126_absolute_normalize_bf39.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-126_absolute_normalize_bf39.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/res-126_absolute_normalize_bf39.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/res-126_absolute_normalize_bf39.md`** (matching `## <category>`
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
  `.cursor/plans/res-126_absolute_normalize_bf39.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-126_absolute_normalize_bf39.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: restaurant-system V-0.5 (`P-RES-12`), the issue's existing project.
  Live set: V-0.5 status Backlog (nonterminal); V-0.2 and V-0.1 Completed
  (terminal). One canonical `V-0.5`. Precedence: existing nonterminal RES
  version project.
- Work type: launch-critical/security/money (armed delegation guard fails open
  on an absolute protected path)
- Milestone: M8 — General Availability (issue already on M8; security maps to M8)
- Mixed design + implementation: no
- Clarification: none (Ready brief `Decisions:` resolve the absolute-path,
  root, Windows, and regression-test rules)

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-126 — a Write of `/workspace/lib/billing/foo.ts` (and the same
  path with backslashes) returns `{}` while armed; the relative path
  `lib/billing/foo.ts` returns `permission: "deny"`. Reproduced 2026-10-09
  by spawning `tdd-delegation-guard.mjs` (armed depth 1 phase red, and armed
  depth 0): relative deny, absolute and backslash no deny.
- Missing constraint (root cause): G-TD1 item 1 requires a protected-path
  deny while armed in red, but it does not require an absolute path inside
  this checkout to be made relative to the repository root before that match.
  `normalize()` only strips the folder name `/restaurant-system/`.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-TD1 item 1 and its
  regression guard — absolute and backslash paths under the checkout root
  deny the same way as `lib/billing/foo.ts`. FIRST execution action. Listed
  in `## Permissions Requested`.

## Spec

- Source: existing `docs/specs/dev-toolchain.md` (hub walk: `docs/specs/README.md`
  lists this file as the dev-toolchain owner; no `docs/specs/domains/` hub)
- Summary: G-TD1 requires spawn-proven delegation-guard liveness: a
  BOM-prefixed armed-red Write to a protected path is deny, the state-file
  disarm escape is no deny, and the two guards are fail-open on throw.
  RES-126 extends item 1 so a checkout-absolute path is relativized from the
  module location before the prefix match.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                  | Risk | Layer | Test file                                             | New or existing                                             | Test name                                                               | Assertion                                                                                                                                                                                                                                                                               | Command                                                              | Depends on |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ----------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| C1  | While armed in red, a BOM-prefixed Write of the absolute checkout path of `lib/billing/foo.ts`, and of that path with backslashes, is `permission: "deny"` | P0   | unit  | `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | existing file, one new `it` (do not edit the existing `it`) | absolute checkout path of a protected file is denied while armed in red | Spawn `tdd-delegation-guard.mjs` with state `{ armed: true, depth: 1, phase: "red" }` and a BOM-prefixed Write. Path `path.join(repoRoot, "lib/billing/foo.ts")` and the same string with `\` separators both return status 0 and `permission: "deny"`. Restore `tdd-guard.json` after. | `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                                   | Test file::name                                                                                                                  | Source file(s)                                       | Risk | Status  |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---- | ------- |
| C1        | `docs/specs/dev-toolchain.md` G-TD1 item 1 | `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` :: absolute checkout path of a protected file is denied while armed in red | `.cursor/hooks/lib/tdd-guard-policy.mjs` `normalize` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration, e2e, or deployed criterion.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — G-TD1 item 1 and its
  regression guard must require checkout-absolute and backslash protected
  Writes to deny. Evidence row names the new test.
- Existing-test edit: `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` —
  add one new `it` only. Do not modify, rename, or delete the existing
  `it` "TDD delegation-guard liveness is spawn-proven".

## TDD Execution Loop

### Criterion C1 — absolute checkout path denied while armed in red (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing `it` named "absolute checkout path of a protected file is denied while armed in red" in `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`. Reuse `runGuard`, `parseHookStdout`, `restoreTddState`, and the BOM prefix. Arm state `{ armed: true, depth: 1, phase: "red" }`. Spawn a Write of `path.join(repoRoot, "lib/billing/foo.ts")` and of that path with backslashes. Expect status 0 and `permission: "deny"` for both. Do not edit the existing `it`. The test must execute and fail because today's stdout is `{}`. Command: `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`.
- **Green** → Invoke `tdd-green` to make that test pass by changing `normalize` in `.cursor/hooks/lib/tdd-guard-policy.mjs` only. Relativize a path that sits inside the checkout root. Find that root from this module's location the same way `STATE_PATH` does (`join` upward from `__dirname`), never from the folder name `restaurant-system`. Treat backslashes as separators before the prefix match. A path outside the checkout stays unmatched to `lib/`. Exit: the target test is green and executed, not skipped. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean the normalize change without behavior change. Exit: target test still green (executed), `pnpm lint` with 0 warnings, `pnpm typecheck` clean, and `pnpm exec prettier --check` clean on the touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-126_absolute_normalize_bf39`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-126_absolute_normalize_bf39.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test edit `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-126_absolute_normalize_bf39.plan.md`

Problem: While the delegation guard is armed, a Write of the relative path lib/billing/foo.ts is permission deny, but the same file as an absolute checkout path or with backslashes returns an empty allow. G-TD1 item 1 never required that absolute path to be made relative to this checkout before the protected-prefix match, and normalize() only strips the folder name restaurant-system.
Approach: Extend G-TD1 item 1 so an absolute path inside this checkout, forward-slash or backslash, is relativized using the repository root found from the policy module's location, the same way STATE_PATH is, never from a hardcoded folder name. One new spawn test in the existing liveness file must deny both shapes while armed in red. The normalize change is the only source edit.
Out-of-scope findings: RES-127 guard-script prefix (Medium, already tracked); other preToolUse guards and .cursor/hooks.json (excluded by the brief)

| #   | Criterion                                                                 | Risk | Layer | Test file                                           |
| --- | ------------------------------------------------------------------------- | ---- | ----- | --------------------------------------------------- |
| 1   | Absolute checkout path of lib/billing/foo.ts is denied while armed in red | P0   | unit  | tests/unit/dev-toolchain/tdd-guard-liveness.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1
Red. INPUT: this plan's `## Linear Plan Digest` section. Task
`run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-126_absolute_normalize_bf39
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-126
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [G-TD1]
- source_paths: [.cursor/hooks/lib/tdd-guard-policy.mjs]
- test_paths: [tests/unit/dev-toolchain/tdd-guard-liveness.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-126_absolute_normalize_bf39.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                   | Where (file:line/area)                                      | Why it matters                                                                              | Severity | Relation                         |
| --------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- | -------------------------------- |
| Orchestrator can edit `.cursor/hooks` scripts while armed | `.cursor/hooks/lib/tdd-guard-policy.mjs` PROTECTED_PREFIXES | Guard scripts stay writable; protecting all of `.cursor/` would brick the state-file disarm | Medium   | already RES-127 — do not re-file |
| Other preToolUse guards and `.cursor/hooks.json`          | `.cursor/hooks.json`                                        | Brief excludes them from this normalize fix                                                 | Medium   | excluded by Ready brief          |

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-126 (plan:
  `res-126_absolute_normalize_bf39`), posting this plan's `## Linear Plan Digest`
  as the single `Work started:` comment. Task `run_in_background: true`. Do not
  wait before the spec edit or C1 Red.
- **Close-out (FIX):** delegate `linear-resolver` for RES-126: resolution
  comment only. No workflow-state write.
- **Findings registration:** RES-127 is already tracked. Do not auto-confirm a
  net-new issue. If the run file stays empty, skip filing and leave the
  category files unchanged.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Collate at close-out from the Refactor report into
  `docs/verifier-reports/tdd/res-126_absolute_normalize_bf39.md`.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-126_absolute_normalize_bf39`: pending

## First Execution Action

- **Managed Cloud one-shot:** the work-order is this file. Do not wait for a
  second accept. Arm the guard, launch START (`run_in_background: true`; do not
  wait), apply the spec edit in `## Permissions Requested`, then delegate
  Criterion C1 Red. After successful close-out, execute
  `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

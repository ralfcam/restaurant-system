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
- Work-order: `.cursor/plans/res-127_cr_canonicalize_d2be.plan.md`
- Workflow mode: FIX
- In-loop: CodeRabbit finding `fp:cf8dd7febbf40d6f7fc5bc2b37280bd3ac4d45db369f69d09c64a2f6ae668a52` on unpushed branch `cursor/res-127-d2be` (no PR number yet). Skip START and CLOSE-OUT.

## Project & Milestone Route

- Team: key `RES`
- Project: restaurant-system V-0.5
- Work type: launch-critical/security
- Milestone: M8 — General Availability (GA)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-127 / CodeRabbit major on `.cursor/hooks/lib/tdd-guard-policy.mjs`. Observed: depth-0 `checkTddWrite(".cursor/plans/../hooks/tdd-delegation-guard.mjs")` returns null. Expected: delegation deny, same as the collapsed `.cursor/hooks/` path.
- Missing constraint (root cause): G-TD1 matches protected prefixes on the raw spelling. It never required collapsing `.`, `..`, and repeated slashes after checkout-root relativization.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-TD1 item 4 — judge the collapsed repo-relative path.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md`
- Summary: An armed depth-0 write is denied when the path reaches `.cursor/hooks/` only after collapse. The named disarm file stays allowed. Checkout `//` and `/./` forms of `lib/billing/foo.ts` deny. `lib/../docs/specs/dev-toolchain.md` at depth 0 phase null is not a delegation deny.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                | Risk | Layer | Test file                                             | New or existing           | Test name                                                               | Assertion                                                                                   | Command                                                              | Depends on |
| --- | ------------------------------------------------------------------------ | ---- | ----- | ----------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| 1   | Collapse `.` / `..` / repeated slashes before the protected-prefix match | P0   | unit  | `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | new test in existing file | armed depth 0 denies a Write that reaches the guard script through `..` | spawn deny of `.cursor/plans/../hooks/tdd-delegation-guard.mjs`; `checkTddWrite` pins below | `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref              | Test file::name                                                                                                                | Source file(s)                                                         | Risk | Status  |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---- | ------- |
| 1         | G-TD1 item 4 collapse | `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`::armed depth 0 denies a Write that reaches the guard script through `..` | `.cursor/hooks/lib/tdd-guard-policy.mjs` `normalize` + `checkTddWrite` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — G-TD1 item 4, regression guard, evidence row.
- Existing-test edit: `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` — add one new `it` only. Do not modify the existing tests.

## TDD Execution Loop

### Criterion 1 — Collapse before the protected-prefix match (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` named `armed depth 0 denies a Write that reaches the guard script through ..` in `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`. Arm `{ armed: true, depth: 0, phase: null }` and restore state in `finally` via the existing `restoreTddState`. Spawn `tdd-delegation-guard.mjs` with a BOM-prefixed Write of `.cursor/plans/../hooks/tdd-delegation-guard.mjs` and expect `{ status: 0, permission: "deny" }`. Also pin `checkTddWrite` at `{ depth: 0, phase: null }`: `.cursor/plans/../hooks/tdd-delegation-guard.mjs` and `.cursor/plans/../hooks/lib/tdd-guard-policy.mjs` equal `{ deny: true, kind: "delegation" }`; `.cursor/plans/../hooks/state/tdd-guard.json` is null; `lib/../docs/specs/dev-toolchain.md` is null; `path.join(repoRoot, "lib/billing/foo.ts")` with an extra slash after the root (`root + "//lib/billing/foo.ts"`) and `root + "/./lib/billing/foo.ts"` are delegation denies. Do not edit source. Run `pnpm test:unit tests/unit/dev-toolchain/tdd-guard-liveness.test.ts`. Exit is RED: the new test fails because the `..` write is allowed, and the failure is an assertion, not an import error.
- **Green** → Invoke `tdd-green` to collapse `.`, `..`, and repeated slashes inside `normalize` in `.cursor/hooks/lib/tdd-guard-policy.mjs`, and to run every `checkTddWrite` decision on that one normalized path. Keep the named disarm file allowed only by exact collapsed equality. Do not treat a path outside this checkout as inside it beyond today's one-leading-slash strip. Do not edit tests. Exit is the new test and the existing liveness tests green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean the collapse without changing behavior. Exit is the liveness file green, `node --test .cursor/checks/tdd-guard-policy.test.mjs` green, and prettier check on the touched policy file.

## Manual-UAT (deferred, not automated)

- none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                                                   | Where (file:line/area)                         | Why it matters                               | Severity | Relation                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Filesystem-root `/lib/...` still matches a protected prefix after one leading-slash strip | `.cursor/hooks/lib/tdd-guard-policy.mjs`       | already open on `docs/findings/tech-debt.md` | low      | pre-existing; do not fix here                                                                                                              |
| CodeRabbit minor `fp:011c670bed5b3cdcd119805655e4aa86e51152393c6a30b00f38af8122998542`    | `docs/findings/security.md` non-canonical line | in-place sharpen of an open line             | low      | `/capture` after this fix: archive that line as resolved once collapse lands; do not add a new open line for a defect this criterion fixes |

## Linear Close-out & Findings Registration

- **START:** skip. In-loop CodeRabbit fix; RES-127 already has a Work started comment for `res-127_guard_scripts_d2be`.
- **Close-out:** skip. Same in-loop rule. No second resolution comment. No workflow-state write.
- **Findings:** below filing floor. Archive the resolved security line via `docs-updater` ledger-apply. Do not file a new Linear issue.

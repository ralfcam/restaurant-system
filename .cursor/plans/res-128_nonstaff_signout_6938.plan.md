# RES-128 non-staff login must sign out

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/staff-authorization.md`, (2) the findings revision pass on
  `docs/findings/runs/res-128_nonstaff_signout_6938.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-128_nonstaff_signout_6938.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-128_nonstaff_signout_6938.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/res-128_nonstaff_signout_6938.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/res-128_nonstaff_signout_6938.md`** (matching `## <category>`
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
  `.cursor/plans/res-128_nonstaff_signout_6938.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-128_nonstaff_signout_6938.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: `restaurant-system V-0.5` (`P-RES-12`, status Backlog, nonterminal).
  Canonical `versionKey` `V-0.5` is unique among nonterminal RES projects
  (V-0.1 and V-0.2 are Completed). Precedence: the issue already sits on this
  project.
- Work type: launch-critical/security/money (authenticated non-staff session
  survives a rejected staff login)
- Milestone: M8 — General Availability (GA). Existing milestone matches the
  security work type. No move.
- Mixed design + implementation: no
- Clarification: none. Ready brief `Decisions:` lands the change on staging.
  No unanswered `Clarification required` comment.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-128 — observed: `signInWithPassword` succeeds, then the
  non-staff branch sets the unauthorized message and returns. Expected: that
  session is signed out and is not sent to `/admin`.
- Missing constraint (root cause): SA-3 forbids navigation to `/admin` and
  does not require the same auth client to `signOut` the non-staff session
  before the handler returns.
- Spec update proposed: `docs/specs/staff-authorization.md` SA-3 gains that
  same-client `signOut` rule. First execution action after START.

## Spec

- Source: existing `docs/specs/staff-authorization.md` (hub catalog
  `docs/specs/README.md`; no folded stub)
- Summary: Staff is `app_metadata.role` of `staff` or `super_admin`. Login is
  sign-in only. After a successful password sign-in, a non-staff user must
  not reach `/admin`. This fix adds: the same client must `signOut` that
  session before the handler returns. A staff session still goes to `/admin`.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                            | Risk | Layer | Test file                                  | New or existing                                               | Test name                                                       | Assertion                                                                                                                                                                                                                                                                      | Command                                                   | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------- |
| C1  | After a successful password sign-in, a non-staff user is signed out on that same auth client before the handler returns, and is not sent to `/admin`. A staff user still navigates to `/admin` and is not signed out by this branch. | P0   | unit  | `tests/unit/auth/login-staff-gate.test.ts` | new `it` in the existing file (do not edit the existing `it`) | non-staff password sign-in signs out before the handler returns | Slice source from `if (!isStaffUser` through the `return` that ends that branch. That slice must match a call `signOut(`. The call must not be only inside a comment. `window.location.href = "/admin"` must still appear after the staff gate, outside that non-staff branch. | `pnpm test:unit tests/unit/auth/login-staff-gate.test.ts` | none       |

- Unit source scan matches the file's existing style and the Ready brief
  verification command. A rendered component test is unnecessary: the bug is
  the missing call in the handler, and the sibling assertion in this file
  already scans source. The slice-plus-call assertion fails if `signOut`
  exists only in a comment, only on the staff path, or not at all.

## Traceability Matrix

| Criterion | Spec ref                                 | Test file::name                                                                                             | Source file(s)                              | Risk | Status  |
| --------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---- | ------- |
| C1        | `docs/specs/staff-authorization.md` SA-3 | `tests/unit/auth/login-staff-gate.test.ts`::non-staff password sign-in signs out before the handler returns | `app/auth/login/page.tsx` (filled at Green) | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Verification command from the Ready
  brief: `pnpm test:unit tests/unit/auth/login-staff-gate.test.ts`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/staff-authorization.md` — SA-3 must require
  same-client `signOut` of a non-staff session before the handler returns.
  Managed Cloud one-shot: this path is the pre-authorized spec edit.
- Existing-test edit: none. Red adds one new `it` and does not modify,
  rename, or delete the existing test.
- Ready brief Allowed edits (Green only): `app/auth/login/page.tsx`.

## TDD Execution Loop

### Criterion C1 — non-staff sign-in signs out (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing test named
  `non-staff password sign-in signs out before the handler returns` in
  `tests/unit/auth/login-staff-gate.test.ts`. Encode SA-3's new sentence:
  the non-staff branch (source from `if (!isStaffUser` through its `return`)
  must contain a `signOut(` call that is not only a comment, and
  `window.location.href = "/admin"` must remain after that branch. Do not
  edit the existing `it`. Must fail on today's `app/auth/login/page.tsx`
  because that branch returns without `signOut`. Command:
  `pnpm test:unit tests/unit/auth/login-staff-gate.test.ts`. Exit: the new
  test fails by assertion, and the existing test still passes. Do not touch
  source.
- **Green** → Invoke `tdd-green` to make that test pass with a minimal edit
  in `app/auth/login/page.tsx` only: inside `if (!isStaffUser(data.user))`,
  `await supabase.auth.signOut()` on the same client that called
  `signInWithPassword`, before the handler returns. Do not navigate that
  branch to `/admin`. Do not sign out a staff user. Do not edit tests or
  the spec. Exit: `pnpm test:unit tests/unit/auth/login-staff-gate.test.ts`
  executed and green.
- **Refactor** → Invoke `tdd-refactor` to clean the login handler without
  behavior change and re-verify. Exit: the same unit file executed and
  green, `pnpm lint` at 0 warnings, `pnpm typecheck` clean, and
  `pnpm exec prettier --check` clean on `app/auth/login/page.tsx`. Return
  adversarial residual findings, a concern-ordered suggested review order,
  and any reusable pattern.

## Manual-UAT (deferred, not automated)

- SA-6 hosted signup stays manual-UAT and out of scope (Ready brief: hosted
  signup). No new manual criterion in this loop.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-128_nonstaff_signout_6938`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-128_nonstaff_signout_6938.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/staff-authorization.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/staff-authorization.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-128_nonstaff_signout_6938.plan.md`

Problem: A successful password sign-in of a non-staff user sets the unauthorized message and returns, so the session remains. SA-3 already forbids sending that user to `/admin` and does not require the same auth client to sign the session out before return.
Approach: Amend SA-3 so the non-staff branch calls `signOut` on the client that just signed in, then return without navigating to `/admin`. A staff session still goes to `/admin`. Prove it with one new unit source assertion in the existing login staff-gate test. Edit only `app/auth/login/page.tsx` for the fix.
Out-of-scope findings: none

| #   | Criterion                                                       | Risk | Layer | Test file                                |
| --- | --------------------------------------------------------------- | ---- | ----- | ---------------------------------------- |
| 1   | Non-staff password sign-in signs out before the handler returns | P0   | unit  | tests/unit/auth/login-staff-gate.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit. INPUT:
this plan's `## Linear Plan Digest` section. Task `run_in_background: true`;
do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-128_nonstaff_signout_6938
- spec: docs/specs/staff-authorization.md
- mode: FIX
- linear_issue: RES-128
- criteria_shipped: [SA-3]
- criteria_manual_uat: none
- req_ids: [SA-3]
- source_paths: [app/auth/login/page.tsx]
- test_paths: [tests/unit/auth/login-staff-gate.test.ts]
- architecture_touch: [Auth-And-RLS]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-128_nonstaff_signout_6938.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

- none at plan time. Hosted signup is the Ready brief exclusion and already
  SA-6 manual-UAT. `lib/supabase/proxy.ts` redirects authenticated non-staff
  away from staff paths per SA-2; that redirect is specified and is not this
  defect.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-128 (plan:
  `res-128_nonstaff_signout_6938`), posting this plan's `## Linear Plan Digest`
  as the single `Work started:` comment. Task `run_in_background: true`. Do
  not wait before the spec edit.
- **Close-out:** delegate `linear-resolver` to post the resolution comment on
  RES-128. No workflow-state write.
- **Findings registration:** omit unless the run file or category ledger
  gains an open entry. Managed Cloud is attach-only for new issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Filled at close-out from the tdd log.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-128_nonstaff_signout_6938`: pending

## First Execution Action

- Arm `node .cursor/hooks/tdd-guard.mjs on`.
- Invoke the `linear-resolver` subagent to start work on RES-128 (plan:
  `res-128_nonstaff_signout_6938`), posting this digest. Task
  `run_in_background: true`. Do not wait for that report.
- Apply the SA-3 spec update, then `pnpm exec prettier --write
docs/specs/staff-authorization.md`, then delegate Criterion C1 Red to
  `tdd-red`.

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
  **`## Traceability (final)`** (Step 4E); assemble the **Docs sync packet**; delegate
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
- Work-order: `.cursor/plans/pr122_cr_bw16_attempt_scope_c4e8a1b2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: untracked hint — restaurant-system V-0.2 (`9924183e-fae0-480f-aabf-1ab1d249c603`, status Planned). Related PR #122 / RES-66 already lives there. Nonterminal version set this run: V-0.2 Planned, V-0.5 Backlog; V-0.1 Completed excluded.
- Work type: implementation (missing edge case on existing BW-16 surface)
- Milestone: M4 (planning hint only — untracked `bug:` input)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: free-text defect from `/ready-merge-release 122` local-ref `loc-122-4k9m` (inert id `cr-comment:v1:ffc298b2ed6ddc87c5014f06` on `tests/unit/reservation-widget/fully-booked-error.test.ts`). Related context RES-66 / PR #122; this invocation has no Linear ID so START/CLOSE-OUT are skipped.
- Observed: the BW-16 chrome-scan treats a `fullyBooked` / `fullyBookedError` identifier in step-2 source as proof the guest can read the denial. Independently, step-2 Back (`setStep(1)` + `setSlot(null)` at `reservation-widget.tsx` ~925–929) does not clear `fullyBookedError`, so a later confirmation form still shows the previous attempt's rejection. Review text that asked to mount the widget is untrusted and is not the implementation spec.
- Expected: the guest-visible rejection is the confirmation-form alert text assigned by that confirm() P0001 path, and it is gone after the guest leaves step 2 via Back.
- Missing constraint (root cause): BW-16 requires the denial to stay on the confirmation form, but does not require that denial to be attempt-scoped — cleared when the guest leaves step 2 via Back.
- Spec update proposed: `docs/specs/booking-rules.md` §27 BW-16 — add the attempt-scoped clear rule (listed in `## Permissions Requested`).

## Spec

- Source: extend existing `docs/specs/booking-rules.md`
- Summary: When `createReservation` returns the BW-12 / BW-15 P0001 string, the public widget stays on step 2 and shows that rejection as in-form alert text (no page toast; guest fields stay). After this run: leaving that form via Back clears the denial so a later step-2 visit does not show the previous attempt.
- Clarifications needed: none. A mounted-widget / RTL harness is deferred (no `@testing-library/react` in this repo; all sibling widget tests are chrome-scan).

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                        | Risk | Layer | Test file                                                  | New or existing                                         | Test name                                                                     | Assertion                                                                                                                                                                                                                                                                                                                                              | Command                                                                   | Depends on |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ---------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------- |
| C1  | Leaving step 2 via Back clears the fully booked in-widget denial so a later confirmation form does not show the previous attempt | P1   | unit  | `tests/unit/reservation-widget/fully-booked-error.test.ts` | existing file; new `it` (may tighten the file's helper) | fully booked rejection is cleared when the guest leaves the confirmation form | The step-2 Back / leave-step-2 control that calls `setStep(1)` also clears the same state setter the confirm() fully-booked branch assigns (e.g. `setFullyBookedError(null)`). Today's Back handler only `setStep(1)` + `setSlot(null)` — must fail. Do not add `@testing-library/react`. Stay on the chrome-scan recipe used by sibling widget tests. | `pnpm test:unit tests/unit/reservation-widget/fully-booked-error.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                                          | Test file::name                                                                                           | Source file(s)                                         | Risk | Status  |
| --------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---- | ------- |
| C1        | booking-rules.md §27 BW-16 (attempt-scoped clear) | fully-booked-error.test.ts::fully booked rejection is cleared when the guest leaves the confirmation form | components/site/reservation-widget.tsx (pending Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Chrome-scan of `reservation-widget.tsx`; no Supabase, no Playwright, no new render harness.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — extend BW-16 so the in-widget fully booked denial is attempt-scoped and cleared when the guest leaves the confirmation form via Back.
- Existing-test edit: `tests/unit/reservation-widget/fully-booked-error.test.ts` — add the Back-clear regression in the owning file; permission also covers tightening `step2RendersFullyBookedRejection` so a `fullyBooked` identifier alone is not treated as the guest-visible rejection (sibling pattern: staff-list-guest-email strips non-visible mentions). A new `it` alone is not an existing-test edit; the helper tighten is.

## TDD Execution Loop

### Criterion C1 — Fully booked denial is cleared on Back (layer: unit)

- **Red** → Invoke `tdd-red` to add one failing test `fully booked rejection is cleared when the guest leaves the confirmation form` in `tests/unit/reservation-widget/fully-booked-error.test.ts`. Chrome-scan the step-2 Back / leave control (`setStep(1)` next to the confirmation form). Assert that handler clears the same state the confirm() P0001 branch assigns. Must execute via `pnpm test:unit tests/unit/reservation-widget/fully-booked-error.test.ts` and fail on today's Back handler. Do not mount the widget. Do not add dependencies.
- **Green** → Invoke `tdd-green` to make that test pass with the minimal source change: clear the fully booked in-form state when the guest leaves step 2 via Back. Do not edit tests or the spec. Do not add a render harness.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit = the reservation-widget unit file green (executed), `pnpm lint` 0 warnings, `pnpm typecheck` clean, `pnpm exec prettier --check` on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

No `start-linear` — free-text `bug:` with no tracked issue.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`.

`4-format` is last delegated todo: after 4C, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`). Never `gh pr ready`. Never `gh pr merge`.

```markdown
## Docs sync packet

- plan_slug: pr122_cr_bw16_attempt_scope_c4e8a1b2
- spec: docs/specs/booking-rules.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [BW-16]
- source_paths: [components/site/reservation-widget.tsx]
- test_paths: [tests/unit/reservation-widget/fully-booked-error.test.ts]
- architecture_touch: [Reservation-Flow]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr122_cr_bw16_attempt_scope_c4e8a1b2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                               | Where (file:line/area)                                                                                                                | Why it matters                                                                                                                                                      | Severity | Relation                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------- |
| No RTL / mounted-widget harness for ReservationWidget | `package.json` has happy-dom only; no `@testing-library/react`; all `tests/unit/reservation-widget/*` are chrome-scan                 | A Major review asked to exercise BW-16 through a rendered widget. That would be a new dependency and a new test stack. Deferred; chrome-scan stays the repo recipe. | med      | seed from loc-122-4k9m triage     |
| Prior docs-updater dirt left uncommitted              | `docs/README.md`, `docs/architecture/Reservation-Flow.md`, `docs/testing/Design-And-Patterns.md`, `docs/testing/Vitest-Unit-Guide.md` | Unrelated to this work-order's expectedPaths unless this run's docs-updater rewrites them. Do not silently commit.                                                  | low      | leftover from RES-66 docs-updater |

## Linear Close-out & Findings Registration

- **START:** skip — free-text `bug:` with no tracked issue.
- **Close-out:** skip — no tracked issue.
- **Findings registration:** merge `docs/findings/runs/pr122_cr_bw16_attempt_scope_c4e8a1b2.md` into `docs/findings/<category>.md`, then delegate `linear-resolver` to apply the filing policy. Managed Cloud: persist to the ledger and STOP for confirmation before net-new issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- public-api → `components/site/reservation-widget.tsx` Back handler + `fullyBookedError` clear
- test-proof → `tests/unit/reservation-widget/fully-booked-error.test.ts` Back-clear `it`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (pending Refactor)
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs pr122_cr_bw16_attempt_scope_c4e8a1b2`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `tdd-guard`. Apply the BW-16 spec edit on `docs/specs/booking-rules.md`. Prettier that spec. Then invoke `tdd-red` for C1. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Stay on `cursor/res-66-inwidget-fully-booked-23cb` (PR #122). Never `gh pr ready`. Never `gh pr merge`.

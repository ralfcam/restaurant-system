# res-113_select_allowlist_71a3

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/res-113_select_allowlist_71a3.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-113_select_allowlist_71a3.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-113_select_allowlist_71a3.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/res-113_select_allowlist_71a3.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/res-113_select_allowlist_71a3.md`** (matching `## <category>`
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
  `.cursor/plans/res-113_select_allowlist_71a3.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-113_select_allowlist_71a3.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link, informational). `get_team` query `RES` resolved team `0db89a46-afdd-48ae-a6a5-8080628a3a19`.
- Project: existing `restaurant-system V-0.5` (status Backlog, type backlog → available, nonterminal). Precedence #2 (issue's existing nonterminal RES version project). Discovery set: V-0.5 available. V-0.1 and V-0.2 Completed excluded as terminal. No allocation tie.
- Work type: test/audit. The scheduled defect is that C8 does not pin the reservations SELECT allowlist string. Dispatch left the issue on M5 with a complete `/sdd-to-tdd` brief (Queue 5, re-checked 2026-10-06). Priority is Medium, not launch-bound Urgent/High.
- Milestone: M5 — Alpha Release. Issue already on that milestone. Matches test-debt / test-audit.
- Mixed design + implementation: no. RA-10 already exists; this run adds the missing SELECT-argument sentence. No M1–M3 decision is open.
- Clarification: none. No `Clarification required` comment on RES-113. Ready brief Decisions: where to land staging. Out of scope: guest profile history.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-113 — C8 (`tests/unit/analytics/staff-page.test.ts` "analytics UI and JSON omit guest PII") stays green if `getReservationAnalytics` calls `.select("*")`. Observed: `thenable` returns `() => self` for every method, so `.select()` arguments are discarded, and `analyticsReservationFields` drops extra columns before the aggregators. The JSON assertion then sees no `guest_name`, `email`, or `phone`. Expected: the reservations read passes an explicit column list, and a unit test observes that argument, so `*` or a guest column fails the test. A live `*` would still load those columns into the service-role result before the map.
- Missing constraint (root cause): RA-10 forbids guest PII on the analytics UI and JSON. It does not require the reservations `.select()` argument itself to be an explicit allowlist. JSON-key assertions can pass while the query asks for every column.
- Evidence: `app/actions/analytics.ts` already defines `RESERVATION_ANALYTICS_SELECT` as `id, status, date, completed_at, time, party_size` and passes it to `.from("reservations").select(...)`. `tests/unit/analytics/staff-page.test.ts` never reads that argument. Sibling pattern: the same action's `status_events` select is an explicit column list; the reservations path has the same shape in source and no test pin.
- Spec update proposed: `docs/specs/reservation-analytics.md` RA-10 — the reservations read in `getReservationAnalytics` MUST call `.select()` with exactly `id, status, date, completed_at, time, party_size`. That argument MUST NOT be `*` and MUST NOT name `guest_name`, `email`, or `phone`. A unit test MUST observe the argument passed to `.select()`. A thenable that ignores `.select()` is not evidence. This edit is the first spec action and is listed in `## Permissions Requested`.

## Spec

- Source: existing `docs/specs/reservation-analytics.md` (hub walk: `docs/specs/README.md` lists this file as the owner of RA-1–RA-10; no domain index entry).
- Summary: Staff analytics at `/admin/analytics` returns outcomes, duration, and booking patterns for an inclusive date range and never shows guest PII. This fix makes the reservations SELECT argument part of RA-10, not only the rendered JSON.
- Clarifications needed: none.
- Pre-mortem: a service-role `select("*")` puts `guest_name`, `email`, and `phone` in the Node process before any mapper. The missing rule is the SELECT argument.
- Inversion: asserting that `RESERVATION_ANALYTICS_SELECT` exists while the call is `.select("*")` would still pass. The test must record the runtime argument to `.select()`.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                              | Risk | Layer | Test file                               | New or existing         | Test name                                                       | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Command                                                  | Depends on |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | --------------------------------------- | ----------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| C1  | RA-10: `getReservationAnalytics` calls `.select()` on `reservations` with exactly `id, status, date, completed_at, time, party_size`, and that argument is not `*` and does not name `guest_name`, `email`, or `phone` | P0   | unit  | tests/unit/analytics/staff-page.test.ts | existing file, new test | `reservations analytics select is an explicit column allowlist` | Staff gate resolves a user. A recording query builder (not the existing `thenable`, which discards method arguments) captures the first argument of `reservations` `.select()`. After `getReservationAnalytics({ from: "2026-09-06", to: "2026-09-12" })` resolves without `error`, that argument equals `id, status, date, completed_at, time, party_size`. It does not contain `*`, `guest_name`, `email`, or `phone`. Do not modify the existing PII test or `thenable`. | `pnpm test:unit tests/unit/analytics/staff-page.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                       | Test file::name                                                                                        | Source file(s)           | Risk | Status  |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------ | ---- | ------- |
| C1        | reservation-analytics.md RA-10 | tests/unit/analytics/staff-page.test.ts::reservations analytics select is an explicit column allowlist | app/actions/analytics.ts | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration, e2e, or deployed criterion.
- Verification from the Ready brief: `pnpm test:unit tests/unit/analytics/staff-page.test.ts`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/reservation-analytics.md` — RA-10 must require the reservations `.select()` allowlist. Pre-authorized by the Ready brief `Spec:` path.
- Existing-test edit: none. Add one new `it` only. Do not modify, rename, or delete the existing test or the shared `thenable` helper.
- Green source scope, if the recorded argument is not already the allowlist: `app/actions/analytics.ts` (Ready brief `Allowed edits`).

## TDD Execution Loop

### Criterion C1 — reservations SELECT allowlist (layer: unit)

- **Red** → Invoke `tdd-red` to add `reservations analytics select is an explicit column allowlist` to `tests/unit/analytics/staff-page.test.ts`. Use a recording query builder. The assertion must observe the runtime `.select()` argument on `reservations`. Do not edit `app/**` or `lib/**`. Do not modify the existing test or `thenable`. Run `pnpm test:unit tests/unit/analytics/staff-page.test.ts`. A right-reason RED is an assertion failure showing the select argument is `*`, names a guest column, or was not called. If the argument is already the allowlist, do not weaken the assertion and do not touch source: report the vitest passed/failed line and the received argument as ALREADY GREEN and leave the new test in place.
- **Green** → Invoke `tdd-green` to make `reservations analytics select is an explicit column allowlist` pass. Edit only `app/actions/analytics.ts`, and only when the recorded argument is not the allowlist. If Red already observed the allowlist, change no source and re-run the same command. Exit: the target test executed and passed. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 without changing behavior and re-verify. Exit: `pnpm test:unit tests/unit/analytics/staff-page.test.ts` executed and passed, `pnpm lint` with 0 warnings, `pnpm typecheck` clean, and `pnpm exec prettier --check` clean on source files this criterion touched (or no source touch). Do not edit tests or the spec.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-113_select_allowlist_71a3`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-113_select_allowlist_71a3.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/reservation-analytics.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/reservation-analytics.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-113_select_allowlist_71a3.plan.md`

Problem: The analytics staff-page test treats missing guest PII in the JSON as proof of RA-10. Its query thenable ignores `.select()`, and the action drops extra columns before aggregates, so `.select("*")` would still pass while a live star select loads `guest_name`, `email`, and `phone` into the service-role result. The missing constraint is that RA-10 does not require the reservations `.select()` argument itself to be an explicit allowlist.

Approach: Extend RA-10 so `getReservationAnalytics` must call `.select()` with `id, status, date, completed_at, time, party_size`, never `*` and never those guest columns. Add one unit test that records the runtime argument. Change `app/actions/analytics.ts` only if that argument is not already the allowlist. A thenable that ignores `.select()` is not evidence.

Out-of-scope findings: guest profile history (Ready brief) · none other

| #   | Criterion                                                     | Risk | Layer | Test file                               |
| --- | ------------------------------------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | Reservations analytics select is an explicit column allowlist | P0   | unit  | tests/unit/analytics/staff-page.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion C1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` runs after 4C/4B: `pnpm exec prettier --write` on this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-113_select_allowlist_71a3
- spec: docs/specs/reservation-analytics.md
- mode: FIX
- linear_issue: RES-113
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [RA-10]
- source_paths: [app/actions/analytics.ts]
- test_paths: [tests/unit/analytics/staff-page.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-113_select_allowlist_71a3.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |
| none    |                        |                |          |          |

Guest profile history stays out of scope per the Ready brief and is not a new code defect to ledger.

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-113 (plan: `res-113_select_allowlist_71a3`), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.
- **Close-out (FIX):** delegate `linear-resolver` for RES-113: post the structured resolution comment only. No workflow-state write.
- **Findings registration:** skip when this run's ledger is empty (no open lines in `docs/findings/runs/res-113_select_allowlist_71a3.md` and the table above stays none). Do not re-file the standing bus. If a phase adds an open run-file line, merge that line, then register attach-only.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Pending Refactor. Collate into the tdd log after C1 Refactor.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none until Refactor names one
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-113_select_allowlist_71a3`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). Apply the RA-10 spec edit. Set phase `red`. Delegate Criterion C1 Red.

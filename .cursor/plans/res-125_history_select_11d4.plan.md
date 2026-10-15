# RES-125 — ficha history drops extra reservation columns

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
- Work-order: `.cursor/plans/res-125_history_select_11d4.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: `restaurant-system V-0.5` (`P-RES-12`), the issue's existing project.
  `list_projects` for team RES this run: V-0.5 status Backlog (nonterminal);
  V-0.2 and V-0.1 status Completed (terminal, excluded). One canonical `V-0.5`.
- Work type: launch-critical/security/money (reservation column serialization)
- Milestone: M8 — General Availability (GA). The issue is already on M8, which
  matches security work. No move.
- Mixed design + implementation: no
- Clarification: none. The Ready brief `Decisions:` are the contract. No
  `Clarification required` comment is open on RES-125. `blockedBy` is empty.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-125 — `getGuestProfile` reads `reservations` with `select("*")`
  (`app/actions/guest-profiles.ts`) and `buildGuestProfile` maps each row with
  `...row` (`lib/guest-profiles.ts`). Expected: the query selects only the
  named ficha and incident columns, and each history row is built from named
  fields so `conf_code`, `created_at`, and any later column never reach the ficha.
- Missing constraint (root cause): GP-8 names a live service-role read and does
  not forbid `select("*")`. GP-5 names the history table and its evidence row
  requires `...row`. Neither criterion names an allowlist.
- Spec update proposed: `docs/specs/guest-profiles.md` GP-5 and GP-8 (first
  execution action after START is launched; path listed below).

Evidence: `getGuestProfile` calls `.select("*")` then passes `rows` into
`buildGuestProfile`, which spreads `...row`. `deriveGuestIncidents` reads
`cancelled_at` and `seated_at` from those query rows, not from history.
`tests/unit/guest-profiles/merge.test.ts` reads `history` row `id` after
`buildGuestProfile`, which today survives only because of the spread.
Sibling: `app/actions/analytics.ts` already selects `RESERVATION_ANALYTICS_SELECT`
instead of `*` (RES-113, out of scope). Pre-mortem: a staff ficha response
ships `conf_code` and every future reservation column because no criterion
forbids the star select or the spread.

## Spec

- Source: existing `docs/specs/guest-profiles.md` (hub walk: `docs/specs/README.md`
  lists this file; no `docs/specs/domains/` owner and no folded stub).
- Summary: GP-8 requires one named select list and forbids `*`. GP-5 requires
  each history row to be named fields only, including `id` and `table_label`,
  with no row spread. `cancelled_at` and `seated_at` stay on the query for
  incidents and stay off the history row.
- Clarifications needed: none (Ready brief).

Exact GP-5 replacement (normative), appended to the existing paragraph after
"Same-day rows stay separate.":

Each history row is built from named fields only: `id`, `email`, `guest_name`,
`phone`, `notes`, `date`, `time`, `party_size`, `table_label`, `status`, and
`isVisit`. The builder MUST NOT spread the reservation row, so `conf_code`,
`created_at`, `cancelled_at`, `seated_at`, and any later column never appear
on a history row. `id` and `table_label` stay because the Table column reads
`table_label` and reservation ids stay unique in a merged ficha list.

Exact GP-8 replacement (normative), appended after "No rebuild job is required.":

`getGuestProfile` selects only `id`, `email`, `guest_name`, `phone`, `notes`,
`date`, `time`, `party_size`, `table_label`, `status`, `cancelled_at`, and
`seated_at`, never `*`. `cancelled_at` and `seated_at` feed incident
derivation and are not history columns.

Evidence-row edits (same file):

- GP-5 shipped cell: replace `History rows keep `...row`plus`date`, `time`, `party_size`, `status`, `isVisit`.`
  with `History rows are named fields only (`id`, `email`, `guest_name`, `phone`, `notes`, `date`, `time`, `party_size`, `table_label`, `status`, `isVisit`) with no row spread.`
- GP-8 shipped cell: replace `.select("*")` with
  `.select("id, email, guest_name, phone, notes, date, time, party_size, table_label, status, cancelled_at, seated_at")`.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                 | Risk | Layer | Test file                                         | New or existing           | Test name                                                           | Assertion                                                                                                                                                                                                                                  | Command                                                          | Depends on |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------- |
| 1   | GP-8 select allowlist: `getGuestProfile` selects only the named columns and never `*`                                                                     | P0   | unit  | `tests/unit/guest-profiles/live-read.test.ts`     | new test in existing file | `getGuestProfile selects the ficha allowlist and never star`        | One `select` argument splits to exactly `id`, `email`, `guest_name`, `phone`, `notes`, `date`, `time`, `party_size`, `table_label`, `status`, `cancelled_at`, `seated_at`, and the argument does not contain `*`                           | `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts`     | none       |
| 2   | GP-5 named history: `buildGuestProfile` returns only the named fields plus `isVisit` and drops `conf_code`, `created_at`, `cancelled_at`, and `seated_at` | P0   | unit  | `tests/unit/guest-profiles/build-profile.test.ts` | new test in existing file | `history rows keep named fields and drop extra reservation columns` | `history` `toEqual` one object with `id`, `email`, `guest_name`, `phone`, `notes`, `date`, `time`, `party_size`, `table_label`, `status`, and `isVisit` when the input also has `conf_code`, `created_at`, `cancelled_at`, and `seated_at` | `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts` | none       |

- Both are P0 data-integrity. Select runs first because it is the query boundary. The history map is independent and runs second. Unit tests decide both without Postgres: the live-read test records the `select` argument on its own mock, and the profile test calls `buildGuestProfile` directly.

## Traceability Matrix

| Criterion | Spec ref | Test file::name                                                                                                        | Source file(s)                  | Risk | Status  |
| --------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---- | ------- |
| 1         | GP-8     | `tests/unit/guest-profiles/live-read.test.ts`::`getGuestProfile selects the ficha allowlist and never star`            | `app/actions/guest-profiles.ts` | P0   | planned |
| 2         | GP-5     | `tests/unit/guest-profiles/build-profile.test.ts`::`history rows keep named fields and drop extra reservation columns` | `lib/guest-profiles.ts`         | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- If that infra cannot be brought up at execution time, the affected criteria STOP (a skipped suite is never accepted as Red/Green).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/guest-profiles.md` — GP-5 and GP-8 name the allowlist and the named history fields, and the evidence rows drop `...row` and `select("*")`.
- Existing-test edit: none. Add one new test to each file below. Do not modify an existing `it` or the shared `thenable` in `live-read.test.ts`.
  - `tests/unit/guest-profiles/live-read.test.ts`
  - `tests/unit/guest-profiles/build-profile.test.ts`

The Ready brief `Allowed edits` also names `app/actions/guest-profiles.ts` and `lib/guest-profiles.ts` for Green and Refactor.

## TDD Execution Loop

### Criterion 1 — GP-8 select allowlist (layer: unit)

- **Red** → Invoke `tdd-red` to add `getGuestProfile selects the ficha allowlist and never star` in `tests/unit/guest-profiles/live-read.test.ts`. The test installs its own `from` mock that records every `select` argument, calls `getGuestProfile("ada@ex.com")` once, splits that argument on commas, trims, and expects exactly `["id", "email", "guest_name", "phone", "notes", "date", "time", "party_size", "table_label", "status", "cancelled_at", "seated_at"]`, and expects the raw argument not to contain `*`. It must fail on today's `.select("*")`. Do not edit the shared `thenable` or any existing test. Command: `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts`. Exit: the new test fails on the assertion, and it executed.
- **Green** → Invoke `tdd-green` to change `getGuestProfile`'s reservations read in `app/actions/guest-profiles.ts` to that allowlist and nothing else. Exit: the new test executes and passes, and `pnpm test:unit tests/unit/guest-profiles` still passes.
- **Refactor** → Invoke `tdd-refactor` to clean the select string only if needed, without changing behavior. Exit: the guest-profiles unit suite executes green, plus `pnpm lint`, `pnpm typecheck`, and `pnpm exec prettier --check` on the touched source.

### Criterion 2 — GP-5 named history fields (layer: unit)

- **Red** → Invoke `tdd-red` to add `history rows keep named fields and drop extra reservation columns` in `tests/unit/guest-profiles/build-profile.test.ts`. Pass one reservation that has `id`, `email`, `guest_name`, `phone`, `notes`, `date`, `time`, `party_size`, `table_label`, `status: "confirmed"`, plus `conf_code`, `created_at`, `cancelled_at`, and `seated_at`. Expect `profile.history` to equal exactly one object with the named fields and `isVisit: false`, and without the four extra keys. Cast the input so the existing parameter type still compiles. Do not edit an existing test. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`. Exit: the new test fails because `...row` still copies the extra keys, and it executed.
- **Green** → Invoke `tdd-green` to build each history row in `lib/guest-profiles.ts` from those named fields only, including `id`, with no spread. Keep `deriveGuestIncidents` on the query rows. Exit: the new test executes and passes, and `pnpm test:unit tests/unit/guest-profiles` still passes (the merge test still reads history `id`).
- **Refactor** → Invoke `tdd-refactor` to align the history parameter and return types with the named fields, without changing behavior. Exit: the guest-profiles unit suite executes green, plus `pnpm lint`, `pnpm typecheck`, and `pnpm exec prettier --check` on the touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-125_history_select_11d4`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-125_history_select_11d4.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-profiles.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/guest-profiles.md` | existing-test edit none (new tests only)
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-125_history_select_11d4.plan.md`

Problem: getGuestProfile reads reservations with select star, and buildGuestProfile spreads each row onto ficha history. Extra columns such as conf_code and created_at, plus any later column, leave the database and reach the staff ficha. GP-5 and GP-8 do not name an allowlist or forbid the spread.
Approach: GP-8 requires one named select list and forbids star. GP-5 requires each history row to be built from named fields only, including id and table_label, with no row spread. cancelled_at and seated_at stay on the query for incident derivation and stay off the history row. Two unit regressions pin the select argument and the exact history object.
Out-of-scope findings: none

| #   | Criterion                                                      | Risk | Layer | Test file                                       |
| --- | -------------------------------------------------------------- | ---- | ----- | ----------------------------------------------- |
| 1   | getGuestProfile selects the named ficha columns and never star | P0   | unit  | tests/unit/guest-profiles/live-read.test.ts     |
| 2   | history rows are named fields only, with no spread             | P0   | unit  | tests/unit/guest-profiles/build-profile.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1. Plan slug: `res-125_history_select_11d4`.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none. The analytics allowlist is already RES-113. PII write checks are already RES-124. Merge and segment readers already select named columns and stay out of this change.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-125 (plan: `res-125_history_select_11d4`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before the spec edit.
- **Close-out (FIX):** delegate `linear-resolver` for RES-125: post the structured resolution comment only. No workflow-state write.
- **Findings registration:** omit unless a phase reports a real out-of-scope finding. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- select allowlist → `app/actions/guest-profiles.ts` reservations `.select`
- named history fields → `lib/guest-profiles.ts` `buildGuestProfile` map

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none at planning time
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-125_history_select_11d4`: pending

## First Execution Action

- **Managed Cloud one-shot:** this work-order is `.cursor/plans/res-125_history_select_11d4.plan.md`. Do not wait for a second accept. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). Apply the GP-5 and GP-8 spec edit listed in `## Permissions Requested`. Then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

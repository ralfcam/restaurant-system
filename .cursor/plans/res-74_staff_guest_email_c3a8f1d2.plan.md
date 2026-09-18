# res-74_staff_guest_email_c3a8f1d2

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
- Work-order: `.cursor/plans/res-74_staff_guest_email_c3a8f1d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, status Planned) — precedence #2 (issue's existing nonterminal RES version project). Discovery set: V-0.2 Planned (ongoing), V-0.5 Backlog (available); V-0.1 Completed excluded as terminal. No allocation tie.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Issue is currently tagged M3 (Design Approval); the governing ACs are already testable and this is not mixed unresolved design + implementation. Milestone hint for later dispatch: M4.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-74 — Guest email is collected and stored (BW-13) and returned on the staff date list (`getReservationsByDate` `select("*")`, `ReservationRow.email`, GP-9 ficha link), but `/admin/reservations` guest contact shows only name + phone. Expected: the stored address is visible with the other contact fields; rows with no email still load.
- Missing constraint (root cause): `booking-rules.md` STAFF-LIST / BW-13 / GP-9 require email to be stored, selected, and used as a ficha entry key. No AC requires the email **string itself** to appear in the staff list guest-information block. A ficha link can exist while staff still cannot read the address on the list.
- Spec update proposed: `docs/specs/booking-rules.md` → add **STAFF-GUEST-EMAIL** (visible address with name and phone; GP-9 link is not sufficient) and **STAFF-GUEST-EMAIL-ABSENT** (null/blank/whitespace email still renders name and phone; no placeholder; list does not fail). First execution write after START.

## Spec

- Source: extend existing `docs/specs/booking-rules.md`
- Summary: Staff `/admin/reservations` already loads `ReservationRow.email`. The list guest-information block must show that stored address as visible contact text next to guest name and phone. The GP-9 "Guest profile" control does not satisfy the display rule. Legacy or online rows with null/blank/whitespace email must still render name and phone without failing the view or inventing an address.
- Clarifications needed: none. Pre-mortem: shipping only the existing ficha link leaves staff unable to read the email on the list. Inversion: a test that only asserts `ReservationRow.email` or `guestProfileHref` would pass while the address stays hidden — the new ACs require the chrome to interpolate the email string in the guest-contact block.

## Acceptance Criteria → Tests

| #   | Criterion                                                                    | Risk | Layer | Test file                                                | New or existing         | Test name                                                    | Assertion                                                                                                                                                                                                                                             | Command                                                                 | Depends on |
| --- | ---------------------------------------------------------------------------- | ---- | ----- | -------------------------------------------------------- | ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 1   | STAFF-GUEST-EMAIL — stored email is visible contact text with name and phone | P1   | unit  | `tests/unit/reservations/staff-list-guest-email.test.ts` | new                     | `staff list displays stored guest email with name and phone` | Source-scan of `components/staff/reservations-manager.tsx`: guest-information block interpolates the stored email as visible text (not only `guestProfileHref`); `guestName` and `phone` remain in that block. A GP-9 link alone fails the assertion. | `pnpm test:unit tests/unit/reservations/staff-list-guest-email.test.ts` | none       |
| 2   | STAFF-GUEST-EMAIL-ABSENT — null/blank email does not fail the list           | P1   | unit  | `tests/unit/reservations/staff-list-guest-email.test.ts` | existing (add one `it`) | `staff list still shows name and phone when email is absent` | Same file: email text line is omitted unless trimmed email is non-empty; name and phone interpolations remain; no fabricated placeholder (`null` / `undefined` / literal empty-address copy).                                                         | `pnpm test:unit tests/unit/reservations/staff-list-guest-email.test.ts` | C1         |

Layer above unit is not needed: the defect is chrome interpolation, and sibling staff-list tests (`reservation-entry.test.ts`, `list-empty-copy.test.ts`) already prove this class with `readFileSync` source-scan. `getReservationsByDate` already `select("*")`s `email`.

## Traceability Matrix

| Criterion | Spec ref                                  | Test file::name                                                                            | Source file(s)   | Risk | Status  |
| --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- | ---- | ------- |
| C1        | booking-rules.md STAFF-GUEST-EMAIL        | staff-list-guest-email.test.ts::staff list displays stored guest email with name and phone | (fills at Green) | P1   | planned |
| C2        | booking-rules.md STAFF-GUEST-EMAIL-ABSENT | staff-list-guest-email.test.ts::staff list still shows name and phone when email is absent | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Reuse: `tests/unit/guest-profiles/reservation-entry.test.ts` and `tests/unit/reservations/list-empty-copy.test.ts` `readFileSync` chrome-scan pattern. Do not weaken GP-9 ficha-link tests. Do not change guest INSERT / RES-PRIV.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — add STAFF-GUEST-EMAIL and STAFF-GUEST-EMAIL-ABSENT so the missing staff-list display rule is normative before the regression tests.
- Existing-test edit: none (new test file; C2 adds a second `it` to that new file after C1 Red creates it)

## TDD Execution Loop

### Criterion 1 — STAFF-GUEST-EMAIL visible address (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in `tests/unit/reservations/staff-list-guest-email.test.ts` named `staff list displays stored guest email with name and phone`. Follow the reservation-entry / list-empty-copy `readFileSync` scan of `components/staff/reservations-manager.tsx`. Assert the guest-information block interpolates the stored email as visible text (same block as `guestName` / `phone`). `guestProfileHref(r.email)` / a "Guest profile" link alone MUST fail this test. Command: `pnpm test:unit tests/unit/reservations/staff-list-guest-email.test.ts`. Must execute and fail on today's chrome (name + phone only).
- **Green** → Invoke `tdd-green` to make that test pass with the minimal chrome change: render the stored email as visible contact text next to name and phone. Do not change tests, spec, RES-PRIV, or GP-9. Exit = target test green (executed).
- **Refactor** → Invoke `tdd-refactor` to clean C1 and re-verify. Exit = target test green (executed) + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source. No behavior change.

### Criterion 2 — STAFF-GUEST-EMAIL-ABSENT (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one `it` to `tests/unit/reservations/staff-list-guest-email.test.ts` named `staff list still shows name and phone when email is absent`. Assert the email address line is omitted unless the stored email is non-blank after trim; `guestName` and `phone` remain; no `null` / `undefined` / placeholder address string. Command: `pnpm test:unit tests/unit/reservations/staff-list-guest-email.test.ts`. Must execute; this `it` must fail if C1 Green rendered email unconditionally without a blank-safe gate.
- **Green** → Invoke `tdd-green` to add the smallest blank-safe gate around the email line (null / `""` / whitespace omit the address; name and phone stay). Do not edit tests or spec. Exit = C2 `it` green (executed) without regressing C1.
- **Refactor** → Invoke `tdd-refactor` to clean C2 and re-verify the file plus lint / typecheck / prettier --check on touched source. Exit = both `it`s green (executed).

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-74_staff_guest_email_c3a8f1d2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-74_staff_guest_email_c3a8f1d2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/booking-rules.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/booking-rules.md`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-74_staff_guest_email_c3a8f1d2.plan.md`

Problem: Guest email is stored on online reservations and returned on the staff date list, but `/admin/reservations` guest contact shows only name and phone. The existing Guest profile link does not put the address on the list. Staff cannot read the email without leaving the date list.
Approach: Encode STAFF-GUEST-EMAIL and STAFF-GUEST-EMAIL-ABSENT on booking-rules, then show the stored address as visible contact text beside name and phone. Null, blank, or whitespace email (legacy rows) must still render name and phone and must not invent an address. No schema or guest-privilege change.
Out-of-scope findings: none

| #   | Criterion                                   | Risk | Layer | Test file                                              |
| --- | ------------------------------------------- | ---- | ----- | ------------------------------------------------------ |
| 1   | Show stored guest email with name and phone | P1   | unit  | tests/unit/reservations/staff-list-guest-email.test.ts |
| 2   | Absent email still renders name and phone   | P1   | unit  | tests/unit/reservations/staff-list-guest-email.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-74 (plan: `res-74_staff_guest_email_c3a8f1d2`), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-74_staff_guest_email_c3a8f1d2
- spec: docs/specs/booking-rules.md
- mode: FIX
- linear_issue: RES-74
- criteria_shipped: [STAFF-GUEST-EMAIL, STAFF-GUEST-EMAIL-ABSENT]
- criteria_manual_uat: none
- req_ids: [STAFF-GUEST-EMAIL, STAFF-GUEST-EMAIL-ABSENT]
- source_paths: [components/staff/reservations-manager.tsx]
- test_paths: [tests/unit/reservations/staff-list-guest-email.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-74_staff_guest_email_c3a8f1d2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none at plan time. Related allergy capture stays on RES-75 / RES-94. Search-by-email on the staff list filter is not requested.

## Linear Close-out & Findings Registration

- **START (execution first action):** Invoke the `linear-resolver` subagent to start work on RES-74 (plan: `res-74_staff_guest_email_c3a8f1d2`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment — never the plan file itself, never a workflow-state write. Task `run_in_background: true`; do not wait for its report before spec/C1.
- **Close-out (FIX):** After 4C, invoke `linear-resolver` to post the structured resolution comment on RES-74 only (no workflow state write).
- **Findings registration:** merge `docs/findings/runs/res-74_staff_guest_email_c3a8f1d2.md` into category files if any open lines; managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- public-api / PII display → `components/staff/reservations-manager.tsx` guest-contact block
- data-integrity → blank/null email gate on the same block

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: n/a yet
- Traceability finalized in tdd log `## Traceability (final)`: n/a yet
- Run metrics stamped in tdd log `## Run metrics`: n/a yet
- `node .cursor/checks/harness-lint.mjs res-74_staff_guest_email_c3a8f1d2`: n/a yet

## First Execution Action

- **Managed Cloud one-shot:** work-order written. Arm `tdd-guard`. Launch START (`run_in_background: true`; do not wait). Apply the approved spec update to `docs/specs/booking-rules.md`. Delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

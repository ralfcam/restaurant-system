# res-83_walk_in_seating_41f0

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
- Work-order: `.cursor/plans/res-83_walk_in_seating_41f0.plan.md`
- Workflow mode: FEATURE
- linear_issue: RES-83

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, `versionKey` `V-0.5`). Precedence: RES-83 already sits on this project. Do not move it.
- Work type: implementation
- Milestone: M4 (Code Complete). The issue currently sits on M2 — Requirements Sign-Off because design already shipped `docs/specs/walk-in-seating.md`. Do not mutate the Linear milestone.
- Mixed design + implementation: no — the governing spec is testable and already merged.
- Clarification: none

## Spec

- Source: existing `docs/specs/walk-in-seating.md` (WI-1–WI-8). Do not edit it.
- Summary: Staff on `/admin/floor` seat a walk-in as a normal `reservations` row via `requireStaffUser` and the service-role client. The row is inserted already `seated` on the selected table, today in the restaurant timezone, at the current local time. Omitted name and phone are `''`; omitted email is null. The online party cap of 8 does not apply. Fit, overlap, and `validate_reservation_availability` still refuse creation. No booking confirmation email. Completion uses the existing `seated → completed` transition.
- Clarifications needed: none. Pre-mortem (a seated walk-in that bypasses the cover cap, or a confirmation email sent for a blank guest) is already encoded as WI-2 and WI-6. Inversion (a test that only checks the export exists) is blocked by asserting the insert payload, the absent email send, and that the trigger source has no walk-in exception.

## Acceptance Criteria → Tests

All eight criteria are decidable with a mocked service client and source reads. No integration, e2e, or manual-UAT layer. New file only: `tests/unit/reservations/walk-in.test.ts`. Do not edit `tests/unit/reservations/create-reservation.test.ts` or any other existing test.

| #    | Criterion            | Risk | Layer | Test file                                 | New or existing | Test name                                                                                                  | Assertion                                                                                                                                                                                                                                                                                                                   | Command                                                  | Depends on |
| ---- | -------------------- | ---- | ----- | ----------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| WI-1 | Staff gate           | P0   | unit  | `tests/unit/reservations/walk-in.test.ts` | new file        | `walk-in create requires a staff session and the floor control is walk-in-seat`                            | Unauthenticated caller gets the existing `/admin` login redirect and no insert. Authenticated non-staff cannot create. `super_admin` can reach the service client. `components/staff/floor-plan.tsx` contains `data-testid="walk-in-seat"`.                                                                                 | `pnpm test:unit tests/unit/reservations/walk-in.test.ts` | none       |
| WI-2 | Seated row           | P0   | unit  | same                                      | new `it`        | `successful walk-in inserts one seated reservation for today and now and sends no confirmation email`      | One insert: `status` seated, submitted `table_label`, `date` from `getTodayInRestaurantTZ()`, `time` from `getNowTimeInRestaurantTZ()`, submitted `party_size`, omitted name/phone `''`, omitted email null, `conf_code` matches `TVL-####`. `sendBookingConfirmation` is not called even when an email is stored.          | same                                                     | WI-1       |
| WI-6 | Existing trigger     | P0   | unit  | same                                      | new `it`        | `walk-in create returns the availability trigger refusal and adds no walk-in exception`                    | Insert error text from the trigger is returned and no success row is kept. `validate_reservation_availability` in the canonical baseline has no walk-in exception.                                                                                                                                                          | same                                                     | WI-2       |
| WI-5 | Fit and overlap      | P0   | unit  | same                                      | new `it`        | `walk-in create refuses a table that is too small or overlaps an occupying reservation`                    | `seats` below party writes no row. Overlapping `confirmed` or `seated` occupying window on that label writes no row. A non-overlapping reservation on that label does not block.                                                                                                                                            | same                                                     | WI-1       |
| WI-8 | Completion           | P0   | unit  | same                                      | new `it`        | `seated walk-in completion persists completed, stamps completed_at, clears the label, and frees the table` | `transitionReservationStatus` seated→completed persists `completed`, stamps `completed_at`, clears `table_label`, and sets the table group `available`. No new status edge. If this already passes because the transition exists, record the pin and advance to Refactor re-verify only. Do not invent a failing assertion. | same                                                     | none       |
| WI-3 | Party size           | P1   | unit  | same                                      | new `it`        | `walk-in party size must be an integer of at least 1 and may exceed 8`                                     | `0`, negative, fraction, and non-number write no row. Party larger than 8 is accepted when the table fits. Guest `validateReservationPayload` still rejects a party larger than 8.                                                                                                                                          | same                                                     | WI-2       |
| WI-4 | Contact format       | P1   | unit  | same                                      | new `it`        | `walk-in stores trimmed valid contact and refuses a bad phone or email`                                    | Non-blank phone must match `PHONE_RE`. Non-blank email must match `EMAIL_RE`. A failed check writes no row. Valid name, phone, and email are stored trimmed.                                                                                                                                                                | same                                                     | WI-2       |
| WI-7 | Table becomes seated | P1   | unit  | same                                      | new `it`        | `successful walk-in sets the table group seated and the floor overlay shows party size and time`           | On success the table group is set `seated` the same way the existing seated transition does. The floor overlay for that table shows the walk-in as seated with its party size and time.                                                                                                                                     | same                                                     | WI-2       |

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                                                                                       | Source file(s) | Risk | Status  |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---- | ------- |
| WI-1      | walk-in-seating.md WI-1 | `tests/unit/reservations/walk-in.test.ts`::`walk-in create requires a staff session and the floor control is walk-in-seat`                            | (Green fills)  | P0   | planned |
| WI-2      | walk-in-seating.md WI-2 | `tests/unit/reservations/walk-in.test.ts`::`successful walk-in inserts one seated reservation for today and now and sends no confirmation email`      | (Green fills)  | P0   | planned |
| WI-6      | walk-in-seating.md WI-6 | `tests/unit/reservations/walk-in.test.ts`::`walk-in create returns the availability trigger refusal and adds no walk-in exception`                    | (Green fills)  | P0   | planned |
| WI-5      | walk-in-seating.md WI-5 | `tests/unit/reservations/walk-in.test.ts`::`walk-in create refuses a table that is too small or overlaps an occupying reservation`                    | (Green fills)  | P0   | planned |
| WI-8      | walk-in-seating.md WI-8 | `tests/unit/reservations/walk-in.test.ts`::`seated walk-in completion persists completed, stamps completed_at, clears the label, and frees the table` | (Green fills)  | P0   | planned |
| WI-3      | walk-in-seating.md WI-3 | `tests/unit/reservations/walk-in.test.ts`::`walk-in party size must be an integer of at least 1 and may exceed 8`                                     | (Green fills)  | P1   | planned |
| WI-4      | walk-in-seating.md WI-4 | `tests/unit/reservations/walk-in.test.ts`::`walk-in stores trimmed valid contact and refuses a bad phone or email`                                    | (Green fills)  | P1   | planned |
| WI-7      | walk-in-seating.md WI-7 | `tests/unit/reservations/walk-in.test.ts`::`successful walk-in sets the table group seated and the floor overlay shows party size and time`           | (Green fills)  | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- If that infra cannot be brought up at execution time, the affected criteria STOP (a skipped suite is never accepted as Red/Green).

## Permissions Requested (before execution)

none

## TDD Execution Loop

### Criterion WI-1 — Staff gate (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-1. Read `.cursor/plans/res-83_walk_in_seating_41f0.plan.md` Criterion WI-1 first. New file `tests/unit/reservations/walk-in.test.ts`, test `walk-in create requires a staff session and the floor control is walk-in-seat`. Follow `tests/unit/guest-profiles/staff-gate.test.ts` mocks for `requireStaffUser` and `createServiceClient`. Action export may be `seatWalkIn` from `app/actions/reservations.ts`. Must fail on the missing export or missing `data-testid="walk-in-seat"`. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`. Do not edit existing tests. Do not touch source.
- **Green** → Invoke `tdd-green` to make WI-1 pass. Minimal `seatWalkIn` using `requireStaffUser` and `createServiceClient`. Unauthenticated follows the existing `/admin` login redirect. Non-staff cannot insert. `super_admin` can. Add `data-testid="walk-in-seat"` on the selected-table panel in `components/staff/floor-plan.tsx`. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-1 and re-verify. Exit = target test green, `pnpm lint` 0 warnings, `pnpm typecheck` clean, `pnpm exec prettier --check` on touched source.

### Criterion WI-2 — Seated row (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-2 in the same file. One new `it`: `successful walk-in inserts one seated reservation for today and now and sends no confirmation email`. Assert the insert payload and that `sendBookingConfirmation` is not called when an email is stored. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to insert one seated row with today/now, blank omitted name/phone, null omitted email, unique `TVL-####` `conf_code`, and no confirmation email. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-2 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-6 — Existing trigger (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-6. One new `it`: `walk-in create returns the availability trigger refusal and adds no walk-in exception`. A mocked insert error such as `Booking denied: Outside operating hours.` is returned and no success row is kept. The canonical `validate_reservation_availability` function has no walk-in exception. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to surface the trigger error without swallowing it and without adding a walk-in exception to the trigger. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-6 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-5 — Fit and overlap (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-5. One new `it`: `walk-in create refuses a table that is too small or overlaps an occupying reservation`. Use `occupyingWindowsOverlap`. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to refuse when seats are below the party or an occupying `confirmed`/`seated` window overlaps, and allow a non-overlapping reservation on that label. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-5 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-8 — Completion (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-8. One new `it`: `seated walk-in completion persists completed, stamps completed_at, clears the label, and frees the table`. Call existing `transitionReservationStatus`. If the test is already green because that transition already satisfies the spec, report the pin and stop. Do not invent a fake failing assertion and do not add a new status edge.
- **Green** → Invoke `tdd-green` only if Red failed for a missing stamp, clear, or `available` sync. Otherwise skip Green and record that the existing transition already satisfies WI-8.
- **Refactor** → Invoke `tdd-refactor` to re-verify WI-8. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-3 — Party size (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-3. One new `it`: `walk-in party size must be an integer of at least 1 and may exceed 8`. Also assert guest `validateReservationPayload` still rejects a party larger than 8. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to enforce integer ≥ 1 on the walk-in path and accept a party larger than 8 when the table fits. Do not change guest validation. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-3 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-4 — Contact format (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-4. One new `it`: `walk-in stores trimmed valid contact and refuses a bad phone or email`. Use `PHONE_RE` and `EMAIL_RE`. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to trim and store valid contact and refuse a non-blank phone or email that fails the existing format checks, writing no row. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-4 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion WI-7 — Table becomes seated (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for WI-7. One new `it`: `successful walk-in sets the table group seated and the floor overlay shows party size and time`. Assert the same table-group seated sync the existing seated transition uses, and that the floor overlay shows party size and time for that seated walk-in. Command: `pnpm test:unit tests/unit/reservations/walk-in.test.ts`.
- **Green** → Invoke `tdd-green` to set the table group `seated` on success the same way `transitionReservationStatus` does. Reuse the existing overlay render for party size and time. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean WI-7 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-83_walk_in_seating_41f0`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-83_walk_in_seating_41f0.md` at close-out.

Mode: FEATURE
Owning spec: `docs/specs/walk-in-seating.md`
Criteria: 8 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-83_walk_in_seating_41f0.plan.md`

Problem: Staff on `/admin/floor` can only seat a guest who already has a reservation. A walk-in has no create path, so the selected table cannot be occupied without first booking online. The missing constraint is a staff-only seated reservation row that still obeys fit, overlap, and the availability trigger, and that does not send a confirmation email.
Approach: Add one staff action that inserts a normal `reservations` row already `seated` on the selected table, for today and the current time in the restaurant timezone. Name and phone may be blank; email may be null. Party size is an integer of at least 1 and is not capped at 8. The existing trigger is unchanged. Completion uses the existing seated-to-completed transition.
Out-of-scope findings: none

| #    | Criterion                          | Risk | Layer | Test file                               |
| ---- | ---------------------------------- | ---- | ----- | --------------------------------------- |
| WI-1 | Staff gate and floor control       | P0   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-2 | Seated row, no confirmation email  | P0   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-6 | Availability trigger still refuses | P0   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-5 | Table fit and overlap              | P0   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-8 | Seated to completed                | P0   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-3 | Party size                         | P1   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-4 | Contact format                     | P1   | unit  | tests/unit/reservations/walk-in.test.ts |
| WI-7 | Table group seated and overlay     | P1   | unit  | tests/unit/reservations/walk-in.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-83 (plan: `res-83_walk_in_seating_41f0`), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`. No `4b-linear` (FEATURE; close-out comment is FIX-only). The closing commit still uses `Fixes RES-83`.

```markdown
## Docs sync packet

- plan_slug: res-83_walk_in_seating_41f0
- spec: docs/specs/walk-in-seating.md
- mode: FEATURE
- linear_issue: RES-83
- criteria_shipped: [WI-1, WI-2, WI-6, WI-5, WI-8, WI-3, WI-4, WI-7]
- criteria_manual_uat: none
- req_ids: [WI-1, WI-2, WI-3, WI-4, WI-5, WI-6, WI-7, WI-8]
- source_paths: []
- test_paths: [tests/unit/reservations/walk-in.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-83_walk_in_seating_41f0.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-83 (plan: `res-83_walk_in_seating_41f0`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait.
- **Close-out:** FEATURE. Do not post a FIX resolution comment. Do not write In Progress, In Review, or Done.
- **Findings registration:** merge the run file if any open lines exist. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- (filled after Refactor phases)

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-83_walk_in_seating_41f0`: pending

## First Execution Action

- **Managed Cloud one-shot:** arm `node .cursor/hooks/tdd-guard.mjs on`, launch START (`run_in_background: true`; do not wait), set phase `red`, then Invoke the `tdd-red` subagent to write the failing test for WI-1.

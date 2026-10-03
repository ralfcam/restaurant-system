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
- Work-order: `.cursor/plans/res-75_allergen_capture_b4e8c1a7.plan.md`
- Workflow mode: FEATURE

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`d355ac92-faa0-4866-b501-32880e087b91`) — issue already on this nonterminal version project
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off. This run does not `save_issue` the milestone.
- Mixed design + implementation: no
- Clarification: none

## Spec

- Source: existing `docs/specs/allergen-capture.md`
- Summary: Optional guest allergens text is stored on `reservations.allergens` (nullable, trimmed, max 500) by a service-role write after the guest insert. Blank stores null and the reservation still completes. Staff see a non-null value on that row in `/admin/reservations`. The guest INSERT allowlist does not gain `allergens`. A failed service-role write removes the new reservation.
- Clarifications needed: none. Pre-mortem: a guest who writes `allergens` on the anon insert, or a failed follow-up write that leaves a reservation without rolling it back, is already AL-2. Isolation is AL-4. No spec edit.

## Acceptance Criteria → Tests

All six criteria are unit tests in one file. The Ready brief verification command is `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`. UI criteria follow the repo's source-reading unit style (no Testing Library). Behavior criteria mock `createReservation` / `transitionReservationStatus` the way `tests/unit/reservations/create-reservation.test.ts` does.

| #   | Criterion                | Risk | Layer | Test file                                        | New or existing | Test name                                    | Assertion                                                                                                                                                                                    | Command                                                         | Depends on |
| --- | ------------------------ | ---- | ----- | ------------------------------------------------ | --------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| 1   | AL-1 Guest field         | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-1 guest field stores null when blank      | Widget source has `data-testid="reservation-allergens-input"` on the guest-details step, and a blank allergens value still creates a reservation with `allergens` null                       | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | none       |
| 2   | AL-2 Saved on the row    | P0   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-2 trimmed service-role write and rollback | Non-blank value is trimmed, max 500, longer value creates no reservation, anon insert body has no allergens, service-role write is only that column, failed write deletes the new row        | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | AL-1       |
| 3   | AL-3 Staff display       | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-3 staff row shows allergens               | `reservations-manager.tsx` renders `data-testid="reservation-allergens"` only when the value is non-null; null omits the text and the rest of the row remains; the view stays under `/admin` | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | AL-2       |
| 4   | AL-4 Isolation           | P0   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-4 allergen text stays on its reservation  | Two rows for the same email keep their own allergens text; one row's text is not rendered on the other                                                                                       | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | AL-3       |
| 5   | AL-5 Completion          | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-5 completed transition leaves allergens   | `transitionReservationStatus` to `completed` succeeds when allergens is null and when set, and does not write the column                                                                     | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | AL-2       |
| 6   | AL-6 Neighbor rules stay | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts | new             | AL-6 guest validation and confirmation stay  | `validateReservationPayload` still requires name, valid email, and party at most 8; createReservation still sends the booking confirmation email                                             | pnpm test:unit tests/unit/reservations/allergen-capture.test.ts | AL-2       |

## Traceability Matrix

| Criterion | Spec ref                 | Test file::name                                                                                | Source file(s)                                                      | Risk | Status  |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---- | ------- |
| AL-1      | allergen-capture.md AL-1 | tests/unit/reservations/allergen-capture.test.ts::AL-1 guest field stores null when blank      | components/site/reservation-widget.tsx, app/actions/reservations.ts | P1   | planned |
| AL-2      | allergen-capture.md AL-2 | tests/unit/reservations/allergen-capture.test.ts::AL-2 trimmed service-role write and rollback | app/actions/reservations.ts, supabase migration                     | P0   | planned |
| AL-3      | allergen-capture.md AL-3 | tests/unit/reservations/allergen-capture.test.ts::AL-3 staff row shows allergens               | components/staff/reservations-manager.tsx                           | P1   | planned |
| AL-4      | allergen-capture.md AL-4 | tests/unit/reservations/allergen-capture.test.ts::AL-4 allergen text stays on its reservation  | components/staff/reservations-manager.tsx                           | P0   | planned |
| AL-5      | allergen-capture.md AL-5 | tests/unit/reservations/allergen-capture.test.ts::AL-5 completed transition leaves allergens   | app/actions/reservations.ts                                         | P1   | planned |
| AL-6      | allergen-capture.md AL-6 | tests/unit/reservations/allergen-capture.test.ts::AL-6 guest validation and confirmation stay  | lib/reservations/validation.ts, app/actions/reservations.ts         | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration or e2e phase.
- Command for every phase: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/allergen-capture.md` — pre-authorized by the Ready brief. No edit is required; the spec is already testable.
- Existing-test edit: `tests/integration/reservations/public-privileges.integ.test.ts` — pre-authorized. Do not edit it unless a Green change would make the pinned allowlist assertion lie. The allowlist must stay without `allergens`.

## TDD Execution Loop

### Criterion 1 — AL-1 Guest field (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-1 guest field stores null when blank` in `tests/unit/reservations/allergen-capture.test.ts`. It must fail on current code because the widget has no `data-testid="reservation-allergens-input"` and `createReservation` does not persist a null `allergens` column. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`. The test must execute and fail on an assertion, not skip.
- **Green** → Invoke `tdd-green` to add the optional field on the guest-details step of `components/site/reservation-widget.tsx` and persist blank/omitted allergens as null in `app/actions/reservations.ts`, plus the nullable column. Exit: that test file green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean the new field without changing behavior. Exit: the same unit command green, plus lint and typecheck on touched source.

### Criterion 2 — AL-2 Saved on the row (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-2 trimmed service-role write and rollback` in the same file. Assert trim, 500-char max, refusal of longer input with no reservation, anon insert without `allergens`, service-role update of only that column on the new row, and delete of the new row when that write fails. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`.
- **Green** → Invoke `tdd-green` to implement that write path in `app/actions/reservations.ts` and the column migration. Do not add `allergens` to the guest INSERT allowlist.
- **Refactor** → Invoke `tdd-refactor` to tidy the write/rollback path. Exit: unit command green, lint, typecheck.

### Criterion 3 — AL-3 Staff display (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-3 staff row shows allergens` in the same file. Assert `components/staff/reservations-manager.tsx` renders `data-testid="reservation-allergens"` for a non-null value, omits allergen text when null, and still renders the rest of the row. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`.
- **Green** → Invoke `tdd-green` to map and render `allergens` on the staff reservation row.
- **Refactor** → Invoke `tdd-refactor` to tidy the display. Exit: unit command green, lint, typecheck.

### Criterion 4 — AL-4 Isolation (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-4 allergen text stays on its reservation` in the same file. Two reservations that share an email must keep distinct allergens text, and one value must not be rendered on the other row. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`.
- **Green** → Invoke `tdd-green` to bind the rendered text to that row's own `allergens` only.
- **Refactor** → Invoke `tdd-refactor` to tidy isolation. Exit: unit command green, lint, typecheck.

### Criterion 5 — AL-5 Completion (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-5 completed transition leaves allergens` in the same file. `transitionReservationStatus` to `completed` succeeds for null and for a set value and does not update `allergens`. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`.
- **Green** → Invoke `tdd-green` to keep the completed transition from writing `allergens`.
- **Refactor** → Invoke `tdd-refactor` to tidy the transition. Exit: unit command green, lint, typecheck.

### Criterion 6 — AL-6 Neighbor rules stay (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `AL-6 guest validation and confirmation stay` in the same file. `validateReservationPayload` still requires a name, a valid email, and a party of at most 8, and `createReservation` still calls the booking confirmation mailer. Command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts`.
- **Green** → Invoke `tdd-green` only if the new test fails because implementation drifted. If it already passes because neighbor rules were untouched, stop and report that; do not change validation or the mailer to force a failure.
- **Refactor** → Invoke `tdd-refactor` to confirm the neighbor rules stayed. Exit: unit command green, lint, typecheck.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-75_allergen_capture_b4e8c1a7`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-75_allergen_capture_b4e8c1a7.md` at close-out.

Mode: FEATURE
Owning spec: `docs/specs/allergen-capture.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/allergen-capture.md` | existing-test edit `tests/integration/reservations/public-privileges.integ.test.ts` | none required this run
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-75_allergen_capture_b4e8c1a7.plan.md`

Problem: Guests cannot record allergy or allergen text on the reservation they are creating, and staff cannot see that text on the reservation in `/admin/reservations`.
Approach: Store nullable trimmed text on `reservations.allergens` via a service-role write after the guest insert. Blank stays null. The guest INSERT allowlist does not include the column. Staff render the value only on its own row.
Out-of-scope findings: none

| #   | Criterion                                    | Risk | Layer | Test file                                        |
| --- | -------------------------------------------- | ---- | ----- | ------------------------------------------------ |
| 1   | AL-1 guest field, blank stores null          | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts |
| 2   | AL-2 trim, cap, service-role write, rollback | P0   | unit  | tests/unit/reservations/allergen-capture.test.ts |
| 3   | AL-3 staff display                           | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts |
| 4   | AL-4 isolation per reservation               | P0   | unit  | tests/unit/reservations/allergen-capture.test.ts |
| 5   | AL-5 completion leaves the column            | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts |
| 6   | AL-6 neighbor validation and mail stay       | P1   | unit  | tests/unit/reservations/allergen-capture.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, background, do not wait. Then Criterion 1 Red. No spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`. No `4b-linear` (FEATURE).

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

- none at planning time. Spec excludes an allergen code list, a ficha rollup, and a guest INSERT allowlist change.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-75 (plan: `res-75_allergen_capture_b4e8c1a7`), posting the digest above. Task `run_in_background: true`.
- **Close-out:** omit (FEATURE).
- **Findings registration:** only if the run file gains open lines. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- service-role allergens write and rollback → `app/actions/reservations.ts`
- staff row binding → `components/staff/reservations-manager.tsx`
- guest field → `components/site/reservation-widget.tsx`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-75_allergen_capture_b4e8c1a7`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START in the background. Do not edit the spec. Delegate Criterion 1 Red.

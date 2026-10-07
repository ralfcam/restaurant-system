# /sdd-to-tdd RES-122 — timezone-shifted reservation date navigation

Managed Cloud one-shot. `agent/runtime` = `managed`. Branch
`cursor/res-122-e94a` from `origin/staging`. Ready brief Queue 6
(dispatch 2026-10-07) pre-authorizes the paths in Permissions Requested.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/scheduling.md` and `docs/specs/booking-rules.md`, (2) the
  findings revision pass on `docs/findings/runs/res-122_date_nav_e94a.md`
  after every phase (and, at close-out, the merge of its open lines into
  `docs/findings/<category>.md` + prune to `archive.md` via `docs-updater`),
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-122_date_nav_e94a.md` after each
  `tdd-refactor` phase, and (4) at close-out, **`## Suggested Review Order
(collated)`**, **`## Traceability (final)`**, and **`## Run metrics`** in
  that tdd log. After a spec or living-findings write, `pnpm exec prettier
--write` **that file** (never `prettier --write .`). Snapshot trees
  (`docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source
  change** from `tdd-green`. **Every cleanup / re-verify** from
  `tdd-refactor`. Run them sequentially, one **phase** at a time, honoring
  each phase's exit condition before the next Task call.
- **Do not mark a phase done on subagent assertion alone.** Before advancing,
  the phase's exit condition (the target test's actual pass/fail) must be
  visible from a fresh command in this turn, and the diff must match the
  report.
- **One Task call per phase.** Never pass `model` on Task for `tdd-red` /
  `tdd-green` / `tdd-refactor` / `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`,
  `hooks/**`, `src/**`, or `supabase/**` yourself.
- Docs sync = `docs-updater`. **Wait for its report** before 4C. Linear START,
  close-out, and finding registration = `linear-resolver`. START is the first
  execution Task, `run_in_background: true`. Do **not** wait for START before
  the spec edit or C1 Red.
- Arm `node .cursor/hooks/tdd-guard.mjs on` as the first execution shell
  action. Set `phase red|green|refactor` before each phase Task and
  `phase clear` after Refactor. Disarm with `off` as the last action after
  commit/push (or on a stop).
- **Close-out sequence:** 4D → 4E → Docs sync packet → Step 4 (docs-updater)
  → 4C → 4B → format pass (`pnpm exec prettier --write` on this run's dirty
  paths; never `.`) → STEP 4G (`node .cursor/checks/coderabbit-gate.mjs`) →
  STEP 4F (`.cursor/commands/commit.md`, then `.cursor/commands/push.md` on
  PASS). Never `gh pr ready`. Never `gh pr merge`.
- Verification command for every phase:
  `pnpm test:unit tests/unit/reservations/date-navigation.test.ts`.
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-122_date_nav_e94a.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. Only nonterminal RES version
  project. Team key confirmed `RES`.
- Work type: UAT/RC critical-bug polish (staging regression). Not a new
  feature, so not M4.
- Milestone: M7 — Release Candidate (RC). Issue is already on that milestone.
  Dispatch 2026-10-06 recorded M7 → no change. No move.
- Mixed design + implementation: no. Ready brief Decisions place the arrow
  rule on scheduling.md item 3 and the latest-list rule on booking-rules
  STAFF-LIST. Both spec paths are in Allowed edits.
- Clarification: none.

## Issue & Root Cause (FIX mode only)

- Issue: RES-122 — On `/admin/reservations`, Next can leave the selected date
  unchanged and Previous can move it back two days. Expected: each arrow
  changes the selected date by exactly one calendar day in any browser UTC
  offset; the date control updates immediately; a late response for an earlier
  date does not replace the list; direct date selection and Today keep working.
- Missing constraint (root cause): scheduling.md item 3 requires restaurant
  TZ helpers for scheduling and “today”, and it does not require the staff
  date arrows to add one calendar day independent of the browser offset.
  STAFF-LIST does not require the visible list to stay on the latest selected
  date when an earlier `getReservationsByDate` resolves late.
- Evidence: `offsetDate` in `components/staff/reservations-manager.tsx`
  (lines 87–91) does `new Date(iso + "T00:00:00")`, `setDate`, then
  `toISOString().slice(0, 10)`. Under `TZ=Europe/Zurich` (offset -120),
  `2026-10-07` + 1 day stays `2026-10-07` and - 1 day becomes `2026-10-05`.
  The sibling `addCalendarDays` in `lib/floor/weekly-service-overview.ts`
  uses `Date.UTC` and is correct; reusing that private helper is out of
  scope (duplicate-helper ledger; file not in Allowed edits). The date input
  `value` is the server `selectedDate` prop, so a click does not change it
  until `router.push` re-renders the page. Previous and Next are
  `disabled={isPending}`. The effect already drops a cleaned-up fetch, and
  it still applies whatever resolves for the prop date.
- Spec update proposed: extend scheduling.md item 3 with `shiftCalendarDate`
  and the immediate date control; extend booking-rules STAFF-LIST so a stale
  earlier response cannot replace the latest date's list.

## Spec

- Source: existing `docs/specs/scheduling.md` item 3 and
  `docs/specs/booking-rules.md` STAFF-LIST (Ready brief).
- Summary: Arrows move one calendar day via `shiftCalendarDate` in
  `lib/timezone.ts`. The date control shows that day immediately and both
  arrows stay enabled while the list loads. The list on screen is the latest
  selected date.
- Clarifications needed: none. Pre-mortem: a UTC-only test of `offsetDate`
  passes while Zurich still skips a day, so C1 must run the helper in a
  `TZ=Europe/Zurich` child process.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                          | Risk | Layer | Test file                                         | New or existing       | Test name                                                          | Assertion                                                                                                                                                                                                                                                                                                    | Command                                                          | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------------------------- | --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------- |
| C1  | Previous and Next move exactly one calendar day under a positive UTC offset, the date input shows that day immediately, and both arrows stay enabled while loading | P1   | unit  | `tests/unit/reservations/date-navigation.test.ts` | new file              | `previous and next move one calendar day in a positive UTC offset` | A `TZ=Europe/Zurich` Node child imports `shiftCalendarDate` from `lib/timezone.ts` and gets `2026-10-07` + 1 = `2026-10-08` and - 1 = `2026-10-06`. The manager calls that helper for both arrows, sets the date-input state before `router.push`, and the two arrow buttons are not `disabled={isPending}`. | `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` | none       |
| C2  | A response for an earlier date does not replace the list once a newer date is selected                                                                             | P1   | unit  | `tests/unit/reservations/date-navigation.test.ts` | new test in that file | `a stale reservations response does not replace the latest date`   | After the date control shows the next day, a late `getReservationsByDate` result for the previous day does not render, and the list matches the latest date.                                                                                                                                                 | `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` | C1         |

No integration or e2e. The defect is client date arithmetic and which
resolved list is shown. `getReservationsByDate` itself stays unchanged.
Operator staging UAT is out of scope (Ready brief).

## Traceability Matrix

| Criterion | Spec ref                    | Test file::name                                                                                                         | Source file(s)                                                 | Risk | Status  |
| --------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- | ------- |
| C1        | scheduling.md item 3        | `tests/unit/reservations/date-navigation.test.ts` :: `previous and next move one calendar day in a positive UTC offset` | `lib/timezone.ts`, `components/staff/reservations-manager.tsx` | P1   | pending |
| C2        | booking-rules.md STAFF-LIST | `tests/unit/reservations/date-navigation.test.ts` :: `a stale reservations response does not replace the latest date`   | `components/staff/reservations-manager.tsx`                    | P1   | pending |

## Execution Preconditions

- Infra needed: none (all unit/mocked). C1 spawns `node` with
  `TZ=Europe/Zurich` inside the test so the parent Vitest process may stay
  UTC.
- Node 22 with `--experimental-strip-types` is present (`node -v` = v22.14.0).

## Permissions Requested (before execution)

- Spec edit: `docs/specs/scheduling.md` — item 3 gains the one-day arrow rule,
  `shiftCalendarDate`, immediate date control, and arrows that stay enabled.
- Spec edit: `docs/specs/booking-rules.md` — STAFF-LIST gains the latest-date
  list rule.
- Existing-test edit: none. C1 and C2 are new tests in a new file.

## TDD Execution Loop

### Criterion 1 — one calendar day (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test for C1 in
  `tests/unit/reservations/date-navigation.test.ts`. Name it
  `previous and next move one calendar day in a positive UTC offset`.
  Spawn `process.execPath` with `--experimental-strip-types` and
  `env.TZ = "Europe/Zurich"` (parent TZ must not matter). The child
  dynamically imports `lib/timezone.ts` via an absolute `pathToFileURL` and
  asserts `shiftCalendarDate("2026-10-07", 1) === "2026-10-08"` and
  `shiftCalendarDate("2026-10-07", -1) === "2026-10-06"`. Also read
  `components/staff/reservations-manager.tsx` and assert both arrow clicks
  call `shiftCalendarDate`, `navigateToDate` assigns the date-input state
  before `router.push`, and the previous-day and next-day buttons are not
  `disabled={isPending}`. Do not assert stale-list behavior (that is C2). Do
  not edit source. Run
  `pnpm test:unit tests/unit/reservations/date-navigation.test.ts`. Stop when
  this test fails because `shiftCalendarDate` is missing or the manager still
  uses `offsetDate` / `toISOString` / a prop-only date input. A skip or
  0 tests is BLOCKED.
- **Green** → Use the `tdd-green` subagent to make that test pass. Add
  `shiftCalendarDate` in `lib/timezone.ts` using `Date.UTC` calendar
  arithmetic (same idea as the private week helper, but do not edit
  `lib/floor/weekly-service-overview.ts` or `lib/analytics/report.ts`). Point
  both reservation arrows at it and remove `offsetDate`. Update the date
  input from state set inside `navigateToDate` before `router.push`. Remove
  `disabled={isPending}` from the two arrow buttons only. Do not change
  `getReservationsByDate`'s query, and do not implement the stale-list rule
  unless this test fails without it. Do not edit tests or specs. Stay inside
  Allowed edits.
- **Refactor** → Use the `tdd-refactor` subagent to clean the helper and the
  arrow wiring without changing behavior. Re-run the unit test, `pnpm lint`,
  `pnpm typecheck`, and `pnpm exec prettier --check` on the touched source.

### Criterion 2 — latest list wins (layer: unit)

- **Red** → Use the `tdd-red` subagent to add one failing test
  `a stale reservations response does not replace the latest date` in
  `tests/unit/reservations/date-navigation.test.ts`. Render
  `ReservationsManager` (happy-dom or an equivalent client render already
  used in this repo; do not add a dependency). Mock `getReservationsByDate`
  so each date's promise can resolve late, and mock `useRouter`. Start on
  `2026-10-07`. Activate Next day so the date control shows `2026-10-08`.
  Resolve a `2026-10-07` result that contains a guest name the `2026-10-08`
  result does not. Assert that guest is absent and the list shows the 8 Oct
  guest. Do not edit the C1 test or any source. Run the same unit command.
  Stop when this new test fails because a late earlier response still renders
  or the 8 Oct list never loads. A skip is BLOCKED.
- **Green** → Use the `tdd-green` subagent to make that test pass. Fetch
  `getReservationsByDate` for the date the control shows, and ignore a
  resolved result that is not the latest selected date. Keep the dimmed
  `loadingDate` list state. Do not disable both arrows. Do not edit tests,
  specs, or `app/actions/reservations.ts`.
- **Refactor** → Use the `tdd-refactor` subagent to clean the latest-date
  guard without changing behavior. Re-run the unit test, `pnpm lint`,
  `pnpm typecheck`, and `pnpm exec prettier --check` on the touched source.

## Manual-UAT (deferred, not automated)

- Staging check before promotion to main (Ready brief; operator UAT). No
  automated substitute.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-122_date_nav_e94a`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-122_date_nav_e94a.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 2 automatable · 1 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md`, `docs/specs/booking-rules.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-122_date_nav_e94a.plan.md`

Problem: Previous and Next on /admin/reservations parse the ISO date as local midnight and serialize with toISOString. In Europe/Zurich, 2026-10-07 plus one day stays 2026-10-07 and minus one day becomes 2026-10-05. The date control also waits for the server prop, and a late list response can still paint an earlier day. Item 3 never required a one-day calendar shift, and STAFF-LIST never required the list to stay on the latest date.
Approach: Add shiftCalendarDate in lib/timezone.ts using Date.UTC calendar arithmetic and point both arrows at it. Show that date in the control before router.push, and keep both arrows enabled while the dimmed list loads. Apply getReservationsByDate only when its date is still the latest selected date. Leave the week controls, the query, and the duplicate addCalendarDays helpers alone.
Out-of-scope findings: duplicate addCalendarDays helpers (already on the tech-debt ledger, low)

| #   | Criterion                                                                      | Risk | Layer | Test file                                       |
| --- | ------------------------------------------------------------------------------ | ---- | ----- | ----------------------------------------------- |
| 1   | One calendar day in a positive UTC offset, immediate date, arrows stay enabled | P1   | unit  | tests/unit/reservations/date-navigation.test.ts |
| 2   | A stale earlier list response does not replace the latest date                 | P1   | unit  | tests/unit/reservations/date-navigation.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to
start work on RES-122 (plan: `res-122_date_nav_e94a`), posting this plan's
`## Linear Plan Digest`. Task `run_in_background: true`. Do not wait before
the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then coderabbit-gate,
then commit.md, then push.md.

## Out-of-Scope Findings

| Finding                             | Where (file:line/area)                                               | Why it matters                                                                                      | Severity | Relation                                |
| ----------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| Duplicate private `addCalendarDays` | `lib/floor/weekly-service-overview.ts` and `lib/analytics/report.ts` | A second UTC date shifter already exists; this run adds `shiftCalendarDate` instead of merging them | low      | already on `docs/findings/tech-debt.md` |
| `/admin` week controls              | WA-5                                                                 | Week shift is a different control                                                                   | low      | Ready brief out of scope                |
| `getReservationsByDate` query       | `app/actions/reservations.ts`                                        | Auth and error contract is not this bug                                                             | low      | Ready brief out of scope                |

## Linear Close-out & Findings Registration

- START: background `linear-resolver` on RES-122 with the digest above.
- Close-out: resolution comment only. No workflow-state write.
- Findings registration: the duplicate helper is already on the tech-debt
  ledger. Do not file a new issue for it. Skip REGISTER when the run file has
  no new open lines that clear the filing floor.

## Suggested Review Order

- Calendar shift → `lib/timezone.ts` `shiftCalendarDate`
- Arrow clicks and immediate date → `components/staff/reservations-manager.tsx`
- Stale list guard → the `getReservationsByDate` effect in that file

## Retrospective

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized: pending close-out
- Run metrics: pending close-out

## First Execution Action

Launch START in the background, then edit `docs/specs/scheduling.md` item 3
and `docs/specs/booking-rules.md` STAFF-LIST, then delegate C1 Red to
`tdd-red`.

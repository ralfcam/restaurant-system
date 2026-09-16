# res-76_weekly_service_overview_c4a8d1e2

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
- Work-order: `.cursor/plans/res-76_weekly_service_overview_c4a8d1e2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link) — UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, `versionKey` `V-0.2`, status Planned / nonterminal). Precedence: issue already on this nonterminal RES version project. Discovery set: V-0.2 (planned), V-0.5 (backlog); V-0.1 completed/excluded. No allocation tie.
- Work type: implementation (product-gap / missing Dashboard weekly overview; issue ACs already testable)
- Milestone: M4 (work-type hint). Live issue milestone is `M3 — Design Approval`. Not treated as mixed unresolved design: Slack/issue ACs plus existing BW-1–BW-12 / Monday-first hours conventions make the contract testable. Do not write Linear milestone/state.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: `RES-76` — `/admin` Dashboard shows current-day bookings, covers, and FP-11 floor occupancy only. Expected: a selected-week overview of each day's configured services with green/red remaining-slot status and previous/next week navigation.
- Missing constraint (root cause): `docs/specs/scheduling.md` scope and ACs stop at FP-11 current-day occupancy. They do not require a Monday-first weekly service-availability overview that reuses `getAvailableSlots` / BW-1–BW-12.
- Spec update proposed: `docs/specs/scheduling.md` → add WA-1–WA-6 (seven configured-service days, labels, green/red from existing slot flags, reuse booking rules, week navigation, refresh). FIRST execution write after START.

## Spec

- Source: extend existing `docs/specs/scheduling.md` (hub walk: catalog lists scheduling.md as staff scheduling / floor / Dashboard occupancy owner; no `docs/specs/domains/` hub; booking-rules.md owns slot math reused by WA-3/WA-4).
- Summary: `/admin` gains a Monday-first restaurant-TZ weekly overview. Each of the seven days shows only that weekday's configured opening-hour segments. Each service shows its staff label (BW-4 fallback) and available/fully-booked status derived from `getAvailableSlots(date, 1)` flags grouped with `assignSegmentForTime`. Previous/next week shifts seven days and recomputes. Reloaded data reflects occupying reservations.
- Clarifications needed: none. Week start, party size, closed-day rendering, and past-slot handling are taken from existing `MONDAY_FIRST`, `validateReservationPayload` min party 1, `getAvailableSlots` past-today rule, and the issue AC that closed days must not present services as available.

### Spec edit to apply (orchestrator, after START)

Bump `Last updated` to `2026-09-16`. Extend Scope to name the weekly overview. After FP-14, add:

```markdown
### Weekly service availability (WA) — RES-76

`/admin` Dashboard MUST include a weekly service-availability overview for a
selected restaurant-TZ week, in addition to the current-day FP-11 widgets.

20. **WA-1 — Seven days, configured services only** — The overview displays
    all seven days of the selected week. The selected week is the Monday-first
    restaurant-TZ week that contains the selected date (default: today from
    `getTodayInRestaurantTZ`). Each day lists only the opening-hour segments
    configured for that weekday on `/admin/scheduling` (`operating_windows` /
    `OperatingDay.segments`). A closed day (`is_closed` or no segments) still
    appears as a day column and MUST NOT present any service as available.
    Suggested-segment templates and other weekdays' services MUST NOT be
    copied onto a day that does not configure them.

21. **WA-2 — Service labels** — Each configured service displays its staff
    label. A blank/whitespace label uses the existing BW-4 time-range fallback
    (`opens_at–closes_at`). Labels are shown exactly as staff typed (no auto
    FR/EN translation).

22. **WA-3 — Availability indicator** — A service shows **available** (green)
    when at least one valid booking slot remains for that service, and
    **fully booked** (red) when none remain. Status MUST also be exposed as
    accessible text (`available` / `fully booked`), not color alone. A valid
    booking slot is a generated slot that `getAvailableSlots(date, 1)` would
    mark `available: true` and that `assignSegmentForTime` (BW-1) assigns to
    that segment. Party size `1` is the existing minimum bookable party
    (`validateReservationPayload`). Past-today slots stay unavailable
    (existing `getAvailableSlots` rule). A blocked date yields no remaining
    slots (configured services are fully booked). A closed day has no
    services (WA-1).

23. **WA-4 — Reuse booking rules** — The overview MUST NOT compute a second
    cover/capacity formula. It reuses booking-rules BW-9–BW-12 (occupancy
    window, early-release, table-fit) via the same `getAvailableSlots`
    availability flags the guest widget uses.

24. **WA-5 — Week navigation** — The overview provides previous-week and
    next-week controls. Each control shifts the selected date by seven
    restaurant-TZ calendar days. Changing the week MUST refresh the seven
    displayed dates and recompute each service's availability for the new
    week.

25. **WA-6 — Refresh on reservation change** — When weekly data is reloaded
    (week change or a subsequent Dashboard/overview fetch), service
    availability MUST reflect current occupying reservations and capacity. A
    service that had a remaining slot MUST turn fully booked after those
    slots are taken, and MUST turn available after occupying reservations
    are released (`completed` / `cancelled` / `no_show`, BW-10).
```

Then `pnpm exec prettier --write docs/specs/scheduling.md`.

## Acceptance Criteria → Tests

| #   | Criterion                                                                 | Risk | Layer | Test file                                          | New or existing         | Test name                                                                                       | Assertion                                                                                                                                                                                                                                                | Command                                                             | Depends on |
| --- | ------------------------------------------------------------------------- | ---- | ----- | -------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| C1  | WA-1 seven Monday-first days; only that day's configured services         | P1   | unit  | tests/unit/floor/weekly-service-overview.test.ts   | new                     | `selected week lists seven days and only each day's configured services`                        | Overview for a week with Mon Lunch+Dinner, Tue closed, Wed Breakfast only has 7 date columns; Monday has Lunch+Dinner only; Tuesday `services` is `[]`; Wednesday has Breakfast only; Sunday template services are absent                                | `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`   | none       |
| C2  | WA-2 staff label or BW-4 time-range fallback                              | P2   | unit  | tests/unit/floor/weekly-service-overview.test.ts   | existing file, new test | `configured services use staff labels and BW-4 time-range fallback`                             | Labeled Dinner keeps `"Dinner"`; blank Lunch label is `"12:00–14:00"`                                                                                                                                                                                    | same                                                                | C1         |
| C3  | WA-3/WA-4 green/red from existing slot flags, no second capacity formula  | P0   | unit  | tests/unit/floor/weekly-service-overview.test.ts   | existing file, new test | `service is available when an existing bookable slot remains and fully booked when none remain` | Dinner with one `available: true` slot assigned by `assignSegmentForTime` is `available`; Lunch with only `available: false` slots is `fully_booked`; helper accepts `SlotAvailability[]` and MUST NOT re-sum covers                                     | same                                                                | C1         |
| C4  | WA-5 previous/next week updates dates and availability                    | P1   | unit  | tests/unit/floor/weekly-service-overview.test.ts   | existing file, new test | `previous and next week shift dates and recompute availability`                                 | `shiftSelectedWeek(monday, 1)` / `-1` move ISO dates by 7 days; rebuilt overview dates and per-service status follow the new week's slot map                                                                                                             | same                                                                | C1, C3     |
| C5  | WA-6 reloaded slot/reservation inputs change colors                       | P1   | unit  | tests/unit/floor/weekly-service-overview.test.ts   | existing file, new test | `reloaded slot availability flips service status`                                               | Same week+segments: all Dinner slots available → `available`; after reload all Dinner slots false → `fully_booked`; after a later reload one true → `available`                                                                                          | same                                                                | C3         |
| C6  | WA-1–WA-5 Dashboard chrome: seven days, labels, indicators, week controls | P1   | unit  | tests/unit/floor/dashboard-weekly-overview.test.ts | new                     | `admin Dashboard renders weekly service overview with week navigation`                          | `app/admin/page.tsx` mounts the weekly overview; source/component exposes 7 days, service labels, available/fully-booked indicators (green/red + accessible text), and previous/next week controls (`data-testid` week-overview / prev-week / next-week) | `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts` | C1–C5      |

Layer above unit is not required: behavior is decidable from a pure helper plus the existing Dashboard source-read convention (`dashboard-occupancy.test.ts`). No e2e duplicate.

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                                                                | Source file(s)   | Risk | Status  |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---- | ------- |
| C1        | scheduling.md WA-1      | weekly-service-overview.test.ts::selected week lists seven days and only each day's configured services                        | (fills at Green) | P1   | planned |
| C2        | scheduling.md WA-2      | weekly-service-overview.test.ts::configured services use staff labels and BW-4 time-range fallback                             | (fills at Green) | P2   | planned |
| C3        | scheduling.md WA-3/WA-4 | weekly-service-overview.test.ts::service is available when an existing bookable slot remains and fully booked when none remain | (fills at Green) | P0   | planned |
| C4        | scheduling.md WA-5      | weekly-service-overview.test.ts::previous and next week shift dates and recompute availability                                 | (fills at Green) | P1   | planned |
| C5        | scheduling.md WA-6      | weekly-service-overview.test.ts::reloaded slot availability flips service status                                               | (fills at Green) | P1   | planned |
| C6        | scheduling.md WA-1–WA-5 | dashboard-weekly-overview.test.ts::admin Dashboard renders weekly service overview with week navigation                        | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Do not start Supabase for this loop. A skipped suite is still a BLOCKER if one appears.
- Reuse `DAY_NAMES` / `MONDAY_FIRST` / `assignSegmentForTime` / `SlotAvailability` from existing reservation helpers. Do not invent a second slot generator.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — add WA-1–WA-6 and expand Scope; bump Last updated.
- Existing-test edit: none (new tests / new file; adding `it()` to the new C1 file on later criteria is allowed).

Managed Cloud one-shot: the initiating RES-76 task pre-authorizes **only** `docs/specs/scheduling.md`.

## TDD Execution Loop

### Criterion C1 — WA-1 seven days, configured services only (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1. Work-order: `.cursor/plans/res-76_weekly_service_overview_c4a8d1e2.plan.md` (read C1 + WA-1). File: `tests/unit/floor/weekly-service-overview.test.ts`. Name: `selected week lists seven days and only each day's configured services`. Import the not-yet-present helper (expected missing-symbol or empty-week fail). Fixture: selected date a Wednesday in restaurant TZ; operating days Monday Lunch+Dinner, Tuesday closed, Wednesday Breakfast, other days closed or empty. Assert 7 days Monday-first; Monday services are Lunch+Dinner only; Tuesday services `[]`; Wednesday Breakfast only; no copied suggested segments. Command: `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`. Exit: RED for missing helper / missing weekly model (not harness). Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass. Minimal pure helper (likely `lib/floor/weekly-service-overview.ts`) that builds the seven-day model from selected date + operating days. Consult Next.js skill only if a server module is required; prefer a dependency-free function. Exit: target test GREEN (executed), typecheck clean. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C1 and re-verify. Exit: GREEN (executed) + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source. Return adversarial `## Residual findings`, `Suggested review order:`, `Reusable pattern:`.

### Criterion C2 — WA-2 service labels (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2. Work-order path + C2/WA-2 only. Same unit file. Name: `configured services use staff labels and BW-4 time-range fallback`. Dinner `label: "Dinner"` stays `"Dinner"`; Lunch `label: "  "` or `null` becomes `"12:00–14:00"`. Command: `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`. Exit: RED because labels are missing or raw null. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C2 pass. Minimal: reuse BW-4 label fallback (`segment.label?.trim() || opens–closes`). Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C2 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C3 — WA-3/WA-4 green/red from existing slot flags (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C3. Work-order path + C3/WA-3/WA-4 only. Same unit file. Name: `service is available when an existing bookable slot remains and fully booked when none remain`. Pass `SlotAvailability[]` per date (do not mock Postgres). Dinner 19:00 `available: true` → Dinner `available`; Lunch slots all `available: false` → Lunch `fully_booked`. Membership via `assignSegmentForTime`. Assert the helper does not import a cover-sum of its own (reuse flags). Command: `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`. Exit: RED because status is missing or inverted. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C3 pass. Minimal: group slots with BW-1 and set `available` / `fully_booked` from existing flags. Do not reimplement BW-9–12 math. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C3 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C4 — WA-5 previous/next week navigation (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C4. Work-order path + C4/WA-5 only. Same unit file. Name: `previous and next week shift dates and recompute availability`. From a known Monday ISO, next week dates are +7; previous are −7; availability follows the slot map for the shifted week (e.g. next week's Dinner fully booked while current week's Dinner available). Command: `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`. Exit: RED because shift helper/dates do not move. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C4 pass. Minimal: `shiftSelectedWeek(date, ±1)` plus rebuild. Stay on calendar dates, restaurant-TZ Monday-first. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C4 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C5 — WA-6 refresh flips status (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C5. Work-order path + C5/WA-6 only. Same unit file. Name: `reloaded slot availability flips service status`. Same selected week and segments; first slot map Dinner available; second map Dinner all false → `fully_booked`; third map one true → `available`. Command: `pnpm test:unit tests/unit/floor/weekly-service-overview.test.ts`. Exit: RED if rebuild is stale/cached incorrectly. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C5 pass. Minimal: overview is a pure function of the supplied slot map (no memo that ignores new inputs). Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C5 and re-verify. Re-run the whole weekly-service-overview unit file. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C6 — Dashboard weekly overview chrome (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C6. Work-order path + C6 only. File: `tests/unit/floor/dashboard-weekly-overview.test.ts`. Name: `admin Dashboard renders weekly service overview with week navigation`. Follow `tests/unit/floor/dashboard-occupancy.test.ts` source-read style: `app/admin/page.tsx` must mount a weekly overview; the overview surface has `data-testid` `week-overview`, `prev-week`, `next-week`; seven day columns; service label text; available/fully-booked accessible status (green/red class or tokens plus text). Command: `pnpm test:unit tests/unit/floor/dashboard-weekly-overview.test.ts`. Exit: RED because `/admin` has no weekly overview. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C6 pass. Minimal: staff Dashboard section + week controls wired to the helper / a staff-gated loader that calls existing `getAvailableSlots(date, 1)` and operating-window reads. Consult Next.js + shadcn skills for App Router client/server split and buttons. Do not add a second capacity engine. Exit: target test GREEN (executed) + typecheck. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C6 and re-verify. Also re-run `tests/unit/floor/dashboard-occupancy.test.ts` and `tests/unit/floor/weekly-service-overview.test.ts`. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-76_weekly_service_overview_c4a8d1e2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-76_weekly_service_overview_c4a8d1e2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-76_weekly_service_overview_c4a8d1e2.plan.md`

Problem: `/admin` Dashboard only shows tonight's bookings, covers, and FP-11 floor occupancy. Staff cannot see which configured services still have a bookable slot across the selected week. scheduling.md does not require that weekly overview.
Approach: Add WA-1–WA-6 to scheduling.md, then drive a Monday-first restaurant-TZ helper that lists only each day's configured segments, labels them with the BW-4 fallback, and colors available/fully-booked from existing `getAvailableSlots(date, 1)` flags (no second capacity formula). Wire previous/next week controls on `/admin`.
Out-of-scope findings: none

| #   | Criterion                                       | Risk | Layer | Test file                         |
| --- | ----------------------------------------------- | ---- | ----- | --------------------------------- |
| C1  | Seven days, configured services only            | P1   | unit  | weekly-service-overview.test.ts   |
| C2  | Staff labels / BW-4 fallback                    | P2   | unit  | weekly-service-overview.test.ts   |
| C3  | Green/red from existing slot flags              | P0   | unit  | weekly-service-overview.test.ts   |
| C4  | Previous/next week updates dates + availability | P1   | unit  | weekly-service-overview.test.ts   |
| C5  | Reloaded slots flip service status              | P1   | unit  | weekly-service-overview.test.ts   |
| C6  | Dashboard chrome + week controls                | P1   | unit  | dashboard-weekly-overview.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-76 (plan: res-76_weekly_service_overview_c4a8d1e2), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Phase todos (one per phase; do not bundle):

- `c1-red` — Invoke the `tdd-red` subagent to write the failing test for C1
- `c1-green` — Invoke the `tdd-green` subagent to make the C1 test pass
- `c1-refactor` — Invoke the `tdd-refactor` subagent to clean up C1 and re-verify
- `c2-red` — Invoke the `tdd-red` subagent to write the failing test for C2
- `c2-green` — Invoke the `tdd-green` subagent to make the C2 test pass
- `c2-refactor` — Invoke the `tdd-refactor` subagent to clean up C2 and re-verify
- `c3-red` — Invoke the `tdd-red` subagent to write the failing test for C3
- `c3-green` — Invoke the `tdd-green` subagent to make the C3 test pass
- `c3-refactor` — Invoke the `tdd-refactor` subagent to clean up C3 and re-verify
- `c4-red` — Invoke the `tdd-red` subagent to write the failing test for C4
- `c4-green` — Invoke the `tdd-green` subagent to make the C4 test pass
- `c4-refactor` — Invoke the `tdd-refactor` subagent to clean up C4 and re-verify
- `c5-red` — Invoke the `tdd-red` subagent to write the failing test for C5
- `c5-green` — Invoke the `tdd-green` subagent to make the C5 test pass
- `c5-refactor` — Invoke the `tdd-refactor` subagent to clean up C5 and re-verify
- `c6-red` — Invoke the `tdd-red` subagent to write the failing test for C6
- `c6-green` — Invoke the `tdd-green` subagent to make the C6 test pass
- `c6-refactor` — Invoke the `tdd-refactor` subagent to clean up C6 and re-verify

Close-out todos:

- `4d-review-trail` — Collate **Suggested Review Order (collated)** into `docs/verifier-reports/tdd/res-76_weekly_service_overview_c4a8d1e2.md`. INPUT: that log’s per-criterion Refactor sections. OUTPUT: `## Suggested Review Order (collated)`.
- `4e-traceability` — Finalize **Traceability (final)** + **Run metrics** in the same tdd log. INPUT: `docs/verifier-reports/tdd/res-76_weekly_service_overview_c4a8d1e2.md`. OUTPUT: those two headings. Then `node .cursor/checks/harness-lint.mjs res-76_weekly_service_overview_c4a8d1e2`.
- `4-docs-packet` — Assemble the Docs sync packet in-thread from the tdd log.
- `4-docs-updater` — Invoke the `docs-updater` subagent with that packet (`run_in_background: true`); wait for its report before 4C.
- `4c-findings` — Merge INPUT `docs/findings/runs/res-76_weekly_service_overview_c4a8d1e2.md` into `docs/findings/<category>.md`, then invoke `linear-resolver` to register findings (Cloud: persist + STOP before net-new issues).
- `4b-linear` — Invoke the `linear-resolver` subagent to post the RES-76 resolution comment only (no state write).
- `4-format` — INPUT: this run’s dirty paths from `git status --porcelain`. OUTPUT: `pnpm exec prettier --write <path> …` (never `.`). Then STEP 4G, then execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

```markdown
## Docs sync packet

- plan_slug: res-76_weekly_service_overview_c4a8d1e2
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-76
- criteria_shipped: [C1, C2, C3, C4, C5, C6]
- criteria_manual_uat: none
- req_ids: [WA-1, WA-2, WA-3, WA-4, WA-5, WA-6, FP-11]
- source_paths: [lib/floor/weekly-service-overview.ts, app/admin/page.tsx]
- test_paths: [tests/unit/floor/weekly-service-overview.test.ts, tests/unit/floor/dashboard-weekly-overview.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-76_weekly_service_overview_c4a8d1e2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none — RES-71 (cover limits per slot/service) and RES-80 (channel import) stay on their own issues; do not implement them here.

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-76 (plan: res-76_weekly_service_overview_c4a8d1e2), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait before spec/C1. `## Linear — BLOCKED` is visibility-only.
- **Close-out:** After 4C, invoke `linear-resolver` for RES-76: post structured resolution comment only (no workflow state write).
- **Findings registration:** Skip if run file + new open lines from this run stay empty. Do not re-file RES-71 / RES-80.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

Placeholder — collated after Refactor phases into the tdd log.

- [public-api] weekly overview uses `getAvailableSlots` flags, not a second capacity formula
- [auth] staff-only Dashboard loader
- [schema] no new tables expected

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (pending Refactor lines)
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-76_weekly_service_overview_c4a8d1e2`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Do not wait for a second accept. Fetch `origin/staging`, branch `cursor/res-76-weekly-service-overview-d690`. Arm `tdd-guard`. Launch START (Task `run_in_background: true`; do not wait). Apply the spec edit listed in `## Permissions Requested`. Then delegate C1 Red. Bound by every non-waived STOP.

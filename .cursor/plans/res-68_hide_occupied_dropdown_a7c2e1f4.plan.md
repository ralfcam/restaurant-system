# RES-68 — Hide occupied tables from the reservation table assignment dropdown

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
- Work-order: `.cursor/plans/res-68_hide_occupied_dropdown_a7c2e1f4.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; issue prefix `RES-68`)
- Project: existing `restaurant-system V-0.2` (`versionKey` `V-0.2`, status Planned / nonterminal). Discovery: Restaurant Link team; V-0.1 Completed excluded; V-0.5 Backlog; no duplicate keys. Allocation: issue already on V-0.2 (precedence 2).
- Work type: implementation (FIX — dropdown occupancy vs write-path BW-9/BW-10)
- Milestone: M4 — Code Complete (Feature Freeze) (already on issue; matches implementation)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: [RES-68](https://linear.app/realized/issue/RES-68/hide-occupied-tables-from-the-reservation-table-assignment-dropdown) — Table 8 assigned to a Seated reservation still appears in another 12:00 reservation’s Table assignment dropdown.
- Missing constraint (root cause): FP-5 requires write-path refuse of overlapping occupying labels and undersize omit, but the dropdown filters stale floor `tables.status === "available"` from a one-shot `getReservationTables()` fetch instead of BW-9/BW-10 occupying windows.
- Spec update proposed: `docs/specs/scheduling.md` → **FP-5-DROPDOWN-OCCUPANCY** (listed in `## Permissions Requested`).

Evidence: `selectableTablesForAssignment` (`lib/reservations/selectable-tables.ts`) keeps `currentLabel` else `status === "available" && seats >= partySize`. `assignReservationTable` already refuses overlap via `occupyingWindowMinutes` / `occupyingWindowsOverlap` / `ACTIVE_RESERVATION_STATUSES`. Assign/status writes update in-memory `reservations` and do not refetch tables or `router.refresh()`. Sibling: FP-3 / `planAutoAssignments` already uses windowed claims.

Pre-mortem: filtering floor status would still offer a claimed label when `tables.status` lagged `available`. Inversion: a vacuous “dropdown calls the helper” scan without occupying-window assertions would stay green while Table 8 remains offered.

## Spec

- Source: extend existing `docs/specs/scheduling.md` (FP-5; BW-9/BW-10 via `docs/specs/booking-rules.md`)
- Summary: Manual assign write path already refuses overlapping occupying labels. Dropdown inventory must use the same occupying windows, keep the reservation’s own label, allow non-overlapping reuse, and recompute from the in-memory reservation list without a full page reload.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                           | Risk | Layer | Test file                                           | New or existing                         | Test name                                                                  | Assertion                                                                                                                                                                                                                                                                                  | Command                                                            | Depends on |
| --- | ------------------------------------------------------------------- | ---- | ----- | --------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------- |
| C1  | Omit labels claimed by overlapping seated or confirmed reservations | P1   | unit  | `tests/unit/reservations/selectable-tables.test.ts` | add test (keep existing undersize test) | omits a table claimed by an overlapping seated or confirmed reservation    | labels for Table 8 must not include `"8"` when another same-date seated (and separately confirmed) reservation holds 8 and BW-9 windows overlap (defaults 90+15); candidate is a different id                                                                                              | `pnpm test:unit tests/unit/reservations/selectable-tables.test.ts` | spec       |
| C2  | Keep the reservation’s own assigned table                           | P1   | unit  | same                                                | add test                                | keeps the reservation current label when that table is occupying           | when occupancy.candidate.id is the occupant of 8, labels include `"8"` even if `currentLabel` is omitted                                                                                                                                                                                   | same                                                               | C1         |
| C3  | Allow non-overlapping reuse; floor status is not occupancy          | P1   | unit  | same                                                | add test                                | includes a table claimed by a non-overlapping occupying reservation        | Table 8 remains selectable for a later same-date candidate whose BW-9 window does not overlap, even if `tables.status` is `"seated"`; `out_of_service` still omitted                                                                                                                       | same                                                               | C1         |
| C4  | Recompute occupancy from in-memory reservations (no full reload)    | P1   | unit  | same                                                | add test                                | table assignment dropdown recomputes occupancy from in-memory reservations | `TableAssignment` in `reservations-manager.tsx` passes the live `reservations` list; helper call site uses ≥4 args (tables, partySize, currentLabel, occupancy bag mapped from that list). Assign/status paths must not require `getReservationTables` or `router.refresh()` for occupancy | same                                                               | C1         |

## Traceability Matrix

| Criterion | Spec ref                              | Test file::name                                                                                       | Source file(s)                                    | Risk | Status  |
| --------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---- | ------- |
| C1        | scheduling.md FP-5-DROPDOWN-OCCUPANCY | selectable-tables.test.ts::omits a table claimed by an overlapping seated or confirmed reservation    | lib/reservations/selectable-tables.ts (Green)     | P1   | planned |
| C2        | scheduling.md FP-5-DROPDOWN-OCCUPANCY | selectable-tables.test.ts::keeps the reservation current label when that table is occupying           | lib/reservations/selectable-tables.ts (Green)     | P1   | planned |
| C3        | scheduling.md FP-5-DROPDOWN-OCCUPANCY | selectable-tables.test.ts::includes a table claimed by a non-overlapping occupying reservation        | lib/reservations/selectable-tables.ts (Green)     | P1   | planned |
| C4        | scheduling.md FP-5-DROPDOWN-OCCUPANCY | selectable-tables.test.ts::table assignment dropdown recomputes occupancy from in-memory reservations | components/staff/reservations-manager.tsx (Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Existing undersize test in `selectable-tables.test.ts` stays; do not modify/rename/delete it.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — append **FP-5-DROPDOWN-OCCUPANCY** inside FP-5; stamp Last updated.
- Existing-test edit: none (new tests only).

## TDD Execution Loop

### Criterion C1 — omit overlapping seated/confirmed claims (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("omits a table claimed by an overlapping seated or confirmed reservation")` in `tests/unit/reservations/selectable-tables.test.ts`. Fail because today’s helper ignores occupying claims. Command: `pnpm test:unit tests/unit/reservations/selectable-tables.test.ts`.
- **Green** → Invoke `tdd-green` to teach `selectableTablesForAssignment` an optional occupancy bag (same-date occupying rows, BW-9 windows, skip `row.id === candidate.id`) so overlapping seated/confirmed claims drop. Exit: target test green (executed).
- **Refactor** → Invoke `tdd-refactor` to clean C1; exit green + lint + typecheck + prettier --check on touched source.

### Criterion C2 — keep own assigned label (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("keeps the reservation current label when that table is occupying")`. Fail if the occupant’s own id is treated as a foreign claim.
- **Green** → Invoke `tdd-green` to skip the candidate reservation when collecting claimed labels.
- **Refactor** → Invoke `tdd-refactor` to clean C2; same exit gates.

### Criterion C3 — non-overlapping reuse (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("includes a table claimed by a non-overlapping occupying reservation")`. Fail if floor `status === "available"` (or any occupying claim without window overlap) hides Table 8.
- **Green** → Invoke `tdd-green` to omit only `out_of_service` / undersize / overlapping claims — not floor `available`.
- **Refactor** → Invoke `tdd-refactor` to clean C3; same exit gates.

### Criterion C4 — in-memory recompute (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("table assignment dropdown recomputes occupancy from in-memory reservations")` as a source scan: `TableAssignment` receives `reservations={reservations}`; helper call has ≥4 args derived from that list.
- **Green** → Invoke `tdd-green` to wire `TableAssignment` + a UI→assignable mapper; occupancy from in-memory reservations.
- **Refactor** → Invoke `tdd-refactor` to clean C4; re-verify the whole selectable-tables + assign-table unit files.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-68_hide_occupied_dropdown_a7c2e1f4`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-68_hide_occupied_dropdown_a7c2e1f4.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 4 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-68_hide_occupied_dropdown_a7c2e1f4.plan.md`

Problem: A table assigned to an overlapping Seated or Confirmed reservation still appears in another reservation’s Table assignment dropdown. FP-5 already refuses that assign on the write path, but the dropdown only filters stale floor table status.
Approach: Add FP-5-DROPDOWN-OCCUPANCY so dropdown inventory uses the same BW-9/BW-10 occupying windows as assignReservationTable, keeps the reservation’s own label, allows non-overlapping reuse, and recomputes from the in-memory reservation list without a full page reload.
Out-of-scope findings: no_show dropdown still enabled (med)

| #   | Criterion                                | Risk | Layer | Test file                 |
| --- | ---------------------------------------- | ---- | ----- | ------------------------- |
| C1  | omit overlapping seated/confirmed claims | P1   | unit  | selectable-tables.test.ts |
| C2  | keep own assigned label                  | P1   | unit  | selectable-tables.test.ts |
| C3  | allow non-overlapping reuse              | P1   | unit  | selectable-tables.test.ts |
| C4  | recompute from in-memory reservations    | P1   | unit  | selectable-tables.test.ts |
```

START already posted with this plan slug (`f6efc934-5f0f-4469-9668-62d6f513249c`) — skip re-entry.

## Docs Sync

- `start-linear` — skip; Work started comment already carries `res-68_hide_occupied_dropdown_a7c2e1f4`.
- Close-out: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then STEP 4G then STEP 4F (`/commit` → `/push`).

```markdown
## Docs sync packet

- plan_slug: res-68_hide_occupied_dropdown_a7c2e1f4
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-68
- criteria_shipped: [C1, C2, C3, C4]
- criteria_manual_uat: none
- req_ids: [FP-5, FP-5-DROPDOWN-OCCUPANCY]
- source_paths: [lib/reservations/selectable-tables.ts, components/staff/reservations-manager.tsx]
- test_paths: [tests/unit/reservations/selectable-tables.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-68_hide_occupied_dropdown_a7c2e1f4.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger)

| Finding                                                                                                 | Where                                                       | Why it matters                                                   | Severity | Relation               |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ---------------------- |
| `no_show` still not disabled on Table assignment `<select>` (closed set includes no_show on write path) | `components/staff/reservations-manager.tsx` TableAssignment | Staff can open the dropdown on a no_show row; write path refuses | med      | deferred — not this AC |

## Linear Close-out & Findings Registration

- START: already posted for this plan slug — skip.
- Close-out: `linear-resolver` resolution comment only after 4C.
- Findings: merge run file → bus; register (managed Cloud does not auto-confirm net-new issues); prune filed/attached only.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- occupancy filter → `lib/reservations/selectable-tables.ts`
- live wiring → `components/staff/reservations-manager.tsx` TableAssignment
- regression tests → `tests/unit/reservations/selectable-tables.test.ts`

## Retrospective (close-out, Step 4E)

- Patterns: none yet
- Traceability finalized: pending
- Run metrics: pending
- harness-lint: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order written. START skipped (comment already carries this slug). Apply `docs/specs/scheduling.md` FP-5-DROPDOWN-OCCUPANCY, then Criterion 1 Red.

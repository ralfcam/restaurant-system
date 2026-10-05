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
- Work-order: `.cursor/plans/res-107_guest_incidents_b8d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, `versionKey` `V-0.5`). Precedence: RES-107 already sits on this nonterminal RES project. V-0.1 and V-0.2 are Completed. Do not move it.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off because `/design` already shipped `docs/specs/guest-incident-history.md`. Governing criteria GI-1–GI-6 are testable. Do not `save_issue` the milestone. Do not re-clarify.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-107 — the staff ficha has reservation history and no incident list. Expected: no-show, late cancel, and delay for that normalized email, derived from the reservation row.
- Missing constraint (root cause): none in the spec. GI-1–GI-6 already require the list and the stamps. Code has no `guest-incidents` list and no `cancelled_at` / `seated_at`.
- Spec update proposed: none. Do not edit `docs/specs/guest-incident-history.md`. First execution action after START is Criterion GI-1 Red.

## Spec

- Source: existing `docs/specs/guest-incident-history.md`
- Summary: Incidents are derived from the reservation. `no_show` is that status. Late cancel is `cancelled` with `cancelled_at` at or after 24 hours before the start in Europe/Zurich. Delay is `seated` or `completed` with `seated_at` more than 15 minutes after that start. Cancel stamps `cancelled_at`. Seat stamps `seated_at`. A walk-in inserted already seated stamps `seated_at` at insert. One type per reservation. Another email is not shown. Reload shows the same incidents.
- Clarifications needed: none. Pre-mortem (a cancel that looks late because the clock ignored Zurich, or a delay that survives only until complete) is already GI-3 and GI-4. Inversion (a test that only checks an export exists) is blocked by asserting the stamp payload, the 24h and 15min boundaries, and that the panel source names the incident type and date inside `data-testid="guest-incidents"`.

## Acceptance Criteria → Tests

All six criteria are decidable with a mocked service client and source reads. No integration, e2e, or manual-UAT layer. New file only: `tests/unit/guest-profiles/incidents.test.ts`. Do not edit any existing test. Do not mock `@/lib/timezone` (keep `dateTimeToUTC` real). Import `* as guestProfiles from "@/lib/guest-profiles"` and assert `typeof` for a missing export so Red fails on an assertion, not an import error.

Reservation start is `dateTimeToUTC(date, time)` (Europe/Zurich). Late means `cancelled_at` >= start minus 24 hours. Delay means `seated_at` > start plus 15 minutes. Use the fixed row `date: "2026-06-15"`, `time: "19:00"`.

| #    | Criterion   | Risk | Layer | Test file                                     | New or existing | Test name                                                                     | Assertion                                                                                                                                                                                                                                                                                                                                           | Command                                                      | Depends on       |
| ---- | ----------- | ---- | ----- | --------------------------------------------- | --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------- |
| GI-1 | Ficha list  | P0   | unit  | `tests/unit/guest-profiles/incidents.test.ts` | new file        | `staff ficha lists incidents and anonymous /admin follows the login redirect` | No staff: `getGuestProfile` returns `errors.guestProfiles.unauthorized` and does not call `createServiceClient`. Staff path calls `createServiceClient`. `lib/supabase/proxy.ts` still sends anonymous `/admin` to `/auth/login`. Panel source has `data-testid="guest-incidents"` and renders the incident type and date.                          | `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts` | none             |
| GI-3 | Late cancel | P0   | unit  | same                                          | new `it`        | `cancel stamps cancelled_at and only a late cancel is a late_cancel incident` | Baseline `reservations` has `cancelled_at TIMESTAMPTZ` and `ADD COLUMN IF NOT EXISTS cancelled_at`. Guest `GRANT INSERT` list omits `cancelled_at`. `confirmed` → `cancelled` patch includes an ISO `cancelled_at`. Late, boundary, early, and null `cancelled_at` classify as specified.                                                           | same                                                         | none             |
| GI-4 | Delay       | P0   | unit  | same                                          | new `it`        | `seat and walk-in stamp seated_at and only a late seat is a delay`            | Baseline has `seated_at TIMESTAMPTZ` and `ADD COLUMN IF NOT EXISTS seated_at`. Guest `GRANT INSERT` omits it. `confirmed` → `seated` patch includes ISO `seated_at`. Walk-in insert includes ISO `seated_at`. More than 15 minutes is a delay; at 15 minutes is not. `completed` keeps the delay. `seated` → `completed` does not null `seated_at`. | same                                                         | none             |
| GI-6 | One type    | P0   | unit  | same                                          | new `it`        | `each reservation contributes only one incident type`                         | A `no_show` row with a late `seated_at` yields only `no_show`. A late `cancelled` row yields only `late_cancel`. A delayed `seated` or `completed` row yields only `delay`.                                                                                                                                                                         | same                                                         | GI-2, GI-3, GI-4 |
| GI-2 | No-show     | P1   | unit  | same                                          | new `it`        | `no_show is an incident and confirmed is not`                                 | `status: "no_show"` yields one `{ type: "no_show", date }`. `status: "confirmed"` yields none.                                                                                                                                                                                                                                                      | same                                                         | none             |
| GI-5 | Fan-out     | P1   | unit  | same                                          | new `it`        | `reload returns the same incidents and another email is absent`               | Three matching rows yield three incidents. A second `getGuestProfile` read calls `from("reservations")` again and returns the same incidents. A different email's `.eq("email_normalized", …)` returns only that email's incident.                                                                                                                  | same                                                         | GI-1, GI-2       |

## Traceability Matrix

| Criterion | Spec ref                       | Test file::name                                           | Source file(s)                                                                                      | Risk | Status  |
| --------- | ------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---- | ------- |
| GI-1      | guest-incident-history.md GI-1 | incidents.test.ts::staff ficha lists incidents…           | app/actions/guest-profiles.ts, components/staff/guest-profile-panel.tsx, lib/supabase/proxy.ts      | P0   | planned |
| GI-3      | guest-incident-history.md GI-3 | incidents.test.ts::cancel stamps cancelled_at…            | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql, lib/guest-profiles.ts | P0   | planned |
| GI-4      | guest-incident-history.md GI-4 | incidents.test.ts::seat and walk-in stamp seated_at…      | app/actions/reservations.ts, baseline.sql, lib/guest-profiles.ts                                    | P0   | planned |
| GI-6      | guest-incident-history.md GI-6 | incidents.test.ts::each reservation contributes only one… | lib/guest-profiles.ts                                                                               | P0   | planned |
| GI-2      | guest-incident-history.md GI-2 | incidents.test.ts::no_show is an incident…                | lib/guest-profiles.ts                                                                               | P1   | planned |
| GI-5      | guest-incident-history.md GI-5 | incidents.test.ts::reload returns the same incidents…     | app/actions/guest-profiles.ts, lib/guest-profiles.ts                                                | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Reuse: `tests/unit/guest-profiles/staff-gate.test.ts` staff mocks; `tests/unit/reservations/walk-in.test.ts` insert/update recorders; `dateTimeToUTC` in `lib/timezone.ts`. Fold `cancelled_at` and `seated_at` into `00000000000000_baseline.sql` beside `completed_at` (`ADD COLUMN IF NOT EXISTS`). Do not add a dated migration. Do not put those columns on the guest `GRANT INSERT` list.

## Permissions Requested (before execution)

none

## TDD Execution Loop

Execute in dependency order: GI-1, GI-3, GI-4, GI-2, GI-6, GI-5. GI-6 stays after GI-2 so its Red still fails.

### Criterion GI-1 — Ficha list (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for GI-1. Read `.cursor/plans/res-107_guest_incidents_b8d2.plan.md` Criterion GI-1 first. New file `tests/unit/guest-profiles/incidents.test.ts`, test `staff ficha lists incidents and anonymous /admin follows the login redirect`. Follow `tests/unit/guest-profiles/staff-gate.test.ts` mocks. Must fail because `components/staff/guest-profile-panel.tsx` has no `data-testid="guest-incidents"`. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`. Do not edit existing tests. Do not touch source.
- **Green** → Invoke `tdd-green` to render incident `type` and `date` inside `data-testid="guest-incidents"` on `GuestProfilePanel`, fed by incidents on the profile the page already passes through. Exit = this test green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-1 only. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GI-3 — Late cancel (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `cancel stamps cancelled_at and only a late cancel is a late_cancel incident` in the same new file. Do not edit the GI-1 test. Assert baseline column, grant omission, transition stamp, and `deriveGuestIncidents` boundaries (late, exact 24h, earlier, null). Missing export is `typeof === "function"` on a namespace import. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`.
- **Green** → Invoke `tdd-green` to add `cancelled_at` on the baseline table and the idempotent `ADD COLUMN`, stamp it in `transitionReservationStatus` when `nextStatus === "cancelled"`, and classify late cancels in `deriveGuestIncidents`. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-3. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GI-4 — Delay (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `seat and walk-in stamp seated_at and only a late seat is a delay`. Do not edit earlier tests. Assert baseline `seated_at`, grant omission, seated transition stamp, walk-in insert stamp, the 15-minute boundary, and that completion keeps the delay and does not null `seated_at`. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`.
- **Green** → Invoke `tdd-green` to add `seated_at` the same way as `cancelled_at`, stamp it on `confirmed` → `seated` and on `seatWalkIn` insert, and classify delays. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-4. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GI-6 — One type (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `each reservation contributes only one incident type`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`.
- **Green** → Invoke `tdd-green` so each row emits at most one type, with `no_show` winning over a late seat and `late_cancel` winning over any seat stamp. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-6. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GI-2 — No-show (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `no_show is an incident and confirmed is not`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`.
- **Green** → Invoke `tdd-green` so `deriveGuestIncidents` emits `no_show` for that status and nothing for `confirmed`. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-2. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GI-5 — Fan-out (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `reload returns the same incidents and another email is absent`. Do not edit earlier tests. Mock `from("reservations")` so `.eq("email_normalized", key)` returns only that email's rows. Command: `pnpm test:unit tests/unit/guest-profiles/incidents.test.ts`.
- **Green** → Invoke `tdd-green` so `getGuestProfile` attaches `deriveGuestIncidents` from the live rows and a second call reads again. Pass `incidents` from `app/admin/customers/[email]/page.tsx` into `GuestProfilePanel` (the page currently omits them). Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GI-5. Exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Work started: `/sdd-to-tdd` execution · plan `res-107_guest_incidents_b8d2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-107_guest_incidents_b8d2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-incident-history.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy res-107_guest_incidents_b8d2.plan.md

Problem: The staff ficha shows reservation history and no no-show, late-cancel, or delay incidents. Staff cannot see that history before the next booking. The spec already requires a derived list and stamps on cancel and seat. The code has neither the list nor `cancelled_at` / `seated_at`.
Approach: Derive incidents from the reservation row. Stamp `cancelled_at` on cancel and `seated_at` on seat and on a walk-in insert. Classify `no_show`, `late_cancel` (at or after 24 hours before the Europe/Zurich start), and `delay` (seated or completed, `seated_at` more than 15 minutes after the start). One type per reservation. Render type and date on the staff ficha with `data-testid="guest-incidents"`.
Out-of-scope findings: none

| #   | Criterion                                | Risk | Layer | Test file                                   |
| --- | ---------------------------------------- | ---- | ----- | ------------------------------------------- |
| 1   | GI-1 staff ficha list and login redirect | P0   | unit  | tests/unit/guest-profiles/incidents.test.ts |
| 2   | GI-3 late cancel stamp and window        | P0   | unit  | tests/unit/guest-profiles/incidents.test.ts |
| 3   | GI-4 delay stamp and window              | P0   | unit  | tests/unit/guest-profiles/incidents.test.ts |
| 4   | GI-6 one type per reservation            | P0   | unit  | tests/unit/guest-profiles/incidents.test.ts |
| 5   | GI-2 no-show versus confirmed            | P1   | unit  | tests/unit/guest-profiles/incidents.test.ts |
| 6   | GI-5 reload, fan-out, and isolation      | P1   | unit  | tests/unit/guest-profiles/incidents.test.ts |

## Docs Sync

Execution-start todo: `start-linear` — first, before Criterion GI-1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before GI-1 Red.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`).

## Docs sync packet

- plan_slug: res-107_guest_incidents_b8d2
- spec: docs/specs/guest-incident-history.md
- mode: FIX
- linear_issue: RES-107
- criteria_shipped: [GI-1, GI-2, GI-3, GI-4, GI-5, GI-6]
- criteria_manual_uat: none
- req_ids: [GI-1, GI-2, GI-3, GI-4, GI-5, GI-6]
- source_paths: [lib/guest-profiles.ts, app/actions/guest-profiles.ts, app/actions/reservations.ts, components/staff/guest-profile-panel.tsx, supabase/migrations/00000000000000_baseline.sql]
- test_paths: [tests/unit/guest-profiles/incidents.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-107_guest_incidents_b8d2.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

Design already deferred these. Do not re-file them.

| Finding                       | Where (file:line/area)               | Why it matters        | Severity | Relation                |
| ----------------------------- | ------------------------------------ | --------------------- | -------- | ----------------------- |
| Separate incident table       | docs/specs/guest-incident-history.md | v1 derives the list   | low      | already on product-gaps |
| Guest-facing incident history | docs/specs/guest-incident-history.md | v1 is the staff ficha | low      | already on product-gaps |
| Other late-cancel window      | docs/specs/guest-incident-history.md | v1 is 24 hours        | low      | already on product-gaps |
| Other delay threshold         | docs/specs/guest-incident-history.md | v1 is 15 minutes      | low      | already on product-gaps |

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-107 (plan: `res-107_guest_incidents_b8d2`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before GI-1 Red.
- **Close-out (FIX):** delegate `linear-resolver` to post the resolution comment only. No workflow-state write.
- **Findings registration:** if the run file has open lines, merge them, then persist without auto-confirming net-new issues. Design deferrals above are already ledgered — do not create new issues for them.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- auth and stamp → `app/actions/guest-profiles.ts`, `app/actions/reservations.ts`
- classification → `lib/guest-profiles.ts`
- schema → `supabase/migrations/00000000000000_baseline.sql`
- ficha render → `components/staff/guest-profile-panel.tsx`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-107_guest_incidents_b8d2`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-107_guest_incidents_b8d2.plan.md`. Launch START (`run_in_background: true`; do not wait). No spec edit. Delegate Criterion GI-1 Red.

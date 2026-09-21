# RES-67 — Fix reservation completion and no-show status transitions

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
- Work-order: `.cursor/plans/res-67_no_show_status_check_a8e1c4d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, status Planned / nonterminal). Discovery: V-0.1 terminal (excluded); V-0.2 Planned; V-0.5 Backlog; no duplicate `V-X.X` keys. Precedence 2 — issue already on this project.
- Work type: implementation (FIX — schema/state-machine persist)
- Milestone: M4 — Code Complete (Feature Freeze) (`16362bfa-203f-40e7-9f16-23b45e00c278`) — already assigned; matches implementation
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: [RES-67](https://linear.app/realized/issue/RES-67/fix-reservation-completion-and-no-show-status-transitions) — Staff `/admin/reservations` transitions to `no_show` (and historically `completed`) fail with `Could not update reservation status.` Expected: `confirmed → no_show` and `seated → completed` persist after refresh; completion stamps `completed_at`; other valid/invalid edges unchanged.
- Missing constraint (root cause): booking-rules names `no_show` as a non-occupying / staff-closed status (BW-10) and the app already allows `confirmed → no_show`, but no acceptance criterion requires `public.reservations.status` CHECK to include `no_show` or requires that staff transition to persist. PV-13 already owns `completed_at` on a fresh reset; remotes that recorded an older baseline still need a dated last-writer.
- Spec update proposed: `docs/specs/booking-rules.md` → add **RES-STATUS-NOSHOW** and **RES-STATUS-FORWARD** (FIRST execution write after START).

**Evidence (STEP 1B):**

- `supabase/migrations/00000000000000_baseline.sql:98` — `CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled'))` — no `no_show`.
- `app/actions/reservations.ts:265-303` — `RESERVATION_TRANSITIONS.confirmed` includes `no_show`; UPDATE failure returns exactly `Could not update reservation status.`; `completed` stamps `completed_at`.
- Baseline already has `completed_at` CREATE + `ADD COLUMN IF NOT EXISTS` (`:109`, `:119`) and CHECK already allows `completed`. Local `seated → completed` is not the live defect; the issue's completed screenshots match remotes that applied an older baseline without that column.
- Sibling comment in `tests/integration/analytics/read-only.integ.test.ts:114`: `// RES-67: reservations.status CHECK excludes no_show; do not insert it.`
- `docs/specs/reservation-analytics.md:23-25` depends on RES-67 before `no_show` rows can persist.
- Linear comments: no human clarification; only GitHub sync + triage priority note.

**Hypothesis (one):** Postgres CHECK rejects `status = 'no_show'`, so `transitionReservationStatus` UPDATE fails. Application transition matrix is already correct.

**Pre-mortem:** Staff marks no-show; row stays `confirmed`; BW-10 occupancy still holds the table; analytics RA-5 stays 0. The missing spec rule is “CHECK + staff persist must accept `no_show`.”

**Inversion:** Grepping `'no_show'` in `reservations.ts` or BW-10 comments can pass while the CHECK still excludes it. C1 MUST execute a real staff transition against local Postgres. C2 MUST require a dated last-writer (not a comment hit in baseline).

## Spec

- Source: extend existing `docs/specs/booking-rules.md` (hub: `docs/specs/README.md` → this file; no `docs/specs/domains/` tree). `scheduling.md` FP-5 and `post-visit-review-email.md` PV-13 stay owners of table-sync and the completion clock; this FIX does not rewrite them.
- Summary: Guest booking + staff reservation list/mutations. This FIX adds the schema contract that `no_show` is a legal persisted status and that remotes already on baseline receive an idempotent last-writer (CHECK + `completed_at`).
- Clarifications needed: none.

### Spec edit to apply (exact)

Set **Last updated** to `2026-09-20`. After criterion 32 (BW-22), append:

33. **RES-STATUS-NOSHOW — Staff no-show persists.** `public.reservations.status` MUST allow `no_show` in addition to `confirmed`, `seated`, `completed`, and `cancelled`. Baseline `00000000000000_baseline.sql` CREATE TABLE CHECK MUST include `'no_show'` in that five-value list. Staff `transitionReservationStatus` for `confirmed → no_show` MUST persist `status = 'no_show'` and MUST NOT return `Could not update reservation status.` A subsequent staff/service-role read of that row MUST still show `no_show`. Existing allowed transitions (`confirmed → seated`, `confirmed → cancelled`, `seated → completed`) and rejected transitions stay as specified by the in-app matrix; this criterion does not add or remove edges other than making the already-allowed `no_show` edge persist. Guest INSERT still cannot write `status` (AC-5). Completing a reservation still stamps `completed_at` (PV-13).

34. **RES-STATUS-FORWARD — Remotes receive the five-value CHECK.** Because `CREATE TABLE IF NOT EXISTS` is a no-op on databases that already recorded baseline, a dated last-writer MUST idempotently `DROP CONSTRAINT IF EXISTS reservations_status_check` and `ADD CONSTRAINT reservations_status_check CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled', 'no_show'))`, and MUST `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ` (PV-13 clock for remotes that applied an older baseline). Those last-writer statements MUST also appear in baseline so a fresh reset converges.

## Acceptance Criteria → Tests

| #   | Criterion                                          | Risk | Layer       | Test file                                                         | New or existing | Test name                                                                                 | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                         | Command                                                                                                                              | Depends on                                                                                     |
| --- | -------------------------------------------------- | ---- | ----------- | ----------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| C1  | RES-STATUS-NOSHOW staff confirmed→no_show persists | P0   | integration | `tests/integration/reservations/status-transitions.integ.test.ts` | new file        | `staff confirmed to no_show persists after refresh`                                       | Mock `requireStaffUser`; insert `confirmed` reservation; `transitionReservationStatus(id, "no_show")` returns no `error` (must not be `Could not update reservation status.`); service-role re-read `status === "no_show"`. RES-ISO zero-arg pin on `beforeAll` / write cleanup. Distinct date `2028-01-12`.                                                                                                                      | `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/reservations/status-transitions.integ.test.ts` | none                                                                                           |
| C2  | RES-STATUS-FORWARD dated last-writer               | P0   | unit        | `tests/unit/reservations/status-check-forward.test.ts`            | new file        | `dated last-writer replaces reservations status check with no_show and adds completed_at` | Some `supabase/migrations/20*.sql` (not baseline) contains `DROP CONSTRAINT IF EXISTS reservations_status_check` and `ADD CONSTRAINT reservations_status_check` whose CHECK list includes `'no_show'` plus the four existing values; same dated file contains `ADD COLUMN IF NOT EXISTS completed_at`; baseline CREATE TABLE CHECK also includes `'no_show'`. A comment-only `no_show` hit is not enough — assert the CHECK list. | `pnpm test:unit tests/unit/reservations/status-check-forward.test.ts`                                                                | C1 (baseline CHECK may already list `no_show`; this Red still fails on the missing dated file) |

C1 is integration because only live Postgres after reset can prove the CHECK. C2 is unit because remotes are healed by SQL that must exist in-repo; a second live persist would be pre-empted after C1 Green. No e2e: the failure is the staff action + CHECK, not multi-page UX. `seated → completed` live persist is already green locally (CHECK includes `completed`; PV-13 column exists; occupancy-window already UPDATEs `completed`) — do not invent a Red for it. Invalid/other valid edges stay the existing in-app matrix; do not add a vacuous already-green matrix test.

## Traceability Matrix

| Criterion | Spec ref                         | Test file::name                                                                                                       | Source file(s)                                                                                                  | Risk | Status  |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| C1        | booking-rules RES-STATUS-NOSHOW  | status-transitions.integ.test.ts::staff confirmed to no_show persists after refresh                                   | supabase/migrations/00000000000000_baseline.sql (CHECK); app/actions/reservations.ts (already writes `no_show`) | P0   | planned |
| C2        | booking-rules RES-STATUS-FORWARD | status-check-forward.test.ts::dated last-writer replaces reservations status check with no_show and adds completed_at | dated `supabase/migrations/20*_reservation_status_no_show.sql` (name chosen in Green) + baseline copy           | P0   | planned |

## Execution Preconditions

- Infra needed: C1 — local Supabase up + seeded (`npx supabase start && npx supabase db reset --local`); integration phases run with `pnpm test:integration` (fail-closed). C2 — none (unit file scan).
- If Supabase cannot be brought up, C1 STOPS (`BLOCKED (infra)`). A skipped suite is never Red/Green.
- Bring Supabase up **before** C1 Red (orchestrator Shell; not a source write).
- Migrations: C1 Green folds `'no_show'` into the baseline CREATE TABLE CHECK only (minimal local persist). Do **not** add the dated last-writer in C1 — C2 owns remotes. C2 Green adds the dated forward and copies DROP/ADD + `completed_at` IF NOT EXISTS into baseline. After each Green that touches SQL, `npx supabase db reset --local` then `npx supabase db lint --local --fail-on error`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — add RES-STATUS-NOSHOW and RES-STATUS-FORWARD; bump Last updated to 2026-09-20.
- Existing-test edit: none (new tests / new files). Do **not** edit `tests/integration/analytics/read-only.integ.test.ts` (RA-5 fixture stays out of scope).

Managed Cloud one-shot: the initiating RES-67 task pre-authorizes **only** this spec path.

## TDD Execution Loop

### Criterion C1 — RES-STATUS-NOSHOW staff confirmed→no_show persists (layer: integration)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1. Work-order: `.cursor/plans/res-67_no_show_status_check_a8e1c4d2.plan.md` (read C1 + RES-STATUS-NOSHOW only). File: `tests/integration/reservations/status-transitions.integ.test.ts`. Name: `staff confirmed to no_show persists after refresh`. Reuse `authEnvReady`, `assertIsolatedHoursMutationTarget()` (zero-arg, first statement of `beforeAll` and every write cleanup hook), `createServiceClient`, and the `requireStaffUser` mock pattern from `tests/integration/inquiries/event-inquiries.integ.test.ts`. Also mock `next/cache` `revalidatePath`. Insert a `confirmed` reservation on date `2028-01-12` (open Wednesday; unused by sibling integ suites). Call `transitionReservationStatus(id, "no_show")`. Assert `error` is undefined / not `Could not update reservation status.`; re-select `status === "no_show"`. Command: `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/reservations/status-transitions.integ.test.ts`. Exit: RED because CHECK rejects `no_show` (23514 / action error string). Must execute, not skip.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass. Minimal: add `'no_show'` to the `reservations.status` CREATE TABLE CHECK in `00000000000000_baseline.sql` (consult supabase + supabase-postgres-best-practices skills). Do **not** add a dated migration yet (C2). Do not change `RESERVATION_TRANSITIONS` (already correct). Reset local DB so the CHECK is live. Exit: target test GREEN (executed), typecheck clean, no regressions. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C1 and re-verify. Exit: target test GREEN (executed) + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source. Return adversarial `## Residual findings`, `Suggested review order:`, `Reusable pattern:`.

### Criterion C2 — RES-STATUS-FORWARD dated last-writer (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2. Work-order path + C2 / RES-STATUS-FORWARD only. File: `tests/unit/reservations/status-check-forward.test.ts`. Name: `dated last-writer replaces reservations status check with no_show and adds completed_at`. Scan `supabase/migrations/20*.sql` (exclude `00000000000000_baseline.sql`) for `DROP CONSTRAINT IF EXISTS reservations_status_check` and `ADD CONSTRAINT reservations_status_check` whose CHECK IN-list contains `'confirmed'`, `'seated'`, `'completed'`, `'cancelled'`, and `'no_show'`; same dated file must contain `ADD COLUMN IF NOT EXISTS completed_at`. Also assert baseline CREATE TABLE CHECK includes `'no_show'`. A bare `no_show` comment/string elsewhere MUST NOT satisfy the CHECK-list assertion. Command: `pnpm test:unit tests/unit/reservations/status-check-forward.test.ts`. Exit: RED because no dated last-writer exists (baseline `no_show` after C1 is not enough). Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C2 pass. Minimal: add one dated `YYYYMMDDHHMMSS_reservation_status_no_show.sql` with the idempotent DROP/ADD CHECK and `ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`; copy those statements into baseline after the reservations table (`.cursor/rules/supabase-migrations.mdc` — remotes already applied baseline). Reset + `db lint` if SQL changed. Exit: target test GREEN. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C2 and re-verify. Re-run C1 integration (no regression). Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none — both ACs are automatable. Live `/admin/reservations` click-through is the issue screenshot, not an inherently-manual criterion.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-67_no_show_status_check_a8e1c4d2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-67_no_show_status_check_a8e1c4d2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/booking-rules.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/booking-rules.md` | existing-test edit none
Infra: local Supabase (fail-closed integration) for C1; C2 unit
Full plan: not posted to Linear (size-bounded digest) · local copy `res-67_no_show_status_check_a8e1c4d2.plan.md`

Problem: Staff Mark no-show fails with Could not update reservation status. The app already allows confirmed → no_show, but reservations.status CHECK omits no_show so the UPDATE never persists.
Approach: Add RES-STATUS-NOSHOW and RES-STATUS-FORWARD. Drive a live staff-transition regression, then a dated last-writer that replaces reservations_status_check and ADD COLUMN IF NOT EXISTS completed_at for remotes. Do not change the in-app transition matrix.
Out-of-scope findings: none

| #   | Criterion                       | Risk | Layer       | Test file                        |
| --- | ------------------------------- | ---- | ----------- | -------------------------------- |
| C1  | confirmed → no_show persists    | P0   | integration | status-transitions.integ.test.ts |
| C2  | dated CHECK last-writer + clock | P0   | unit        | status-check-forward.test.ts     |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-67 (plan: res-67_no_show_status_check_a8e1c4d2), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Phase todos (one per phase; do not bundle):

- `c1-red` — Invoke the `tdd-red` subagent to write the failing test for C1
- `c1-green` — Invoke the `tdd-green` subagent to make the C1 test pass
- `c1-refactor` — Invoke the `tdd-refactor` subagent to clean up C1 and re-verify
- `c2-red` — Invoke the `tdd-red` subagent to write the failing test for C2
- `c2-green` — Invoke the `tdd-green` subagent to make the C2 test pass
- `c2-refactor` — Invoke the `tdd-refactor` subagent to clean up C2 and re-verify

Close-out todos:

- `4d-review-trail` — Collate **Suggested Review Order (collated)** into `docs/verifier-reports/tdd/res-67_no_show_status_check_a8e1c4d2.md`. INPUT: that log’s per-criterion Refactor sections. OUTPUT: `## Suggested Review Order (collated)`.
- `4e-traceability` — Finalize **Traceability (final)** + **Run metrics** in the same tdd log. INPUT: `docs/verifier-reports/tdd/res-67_no_show_status_check_a8e1c4d2.md`. OUTPUT: those two headings. Then `node .cursor/checks/harness-lint.mjs res-67_no_show_status_check_a8e1c4d2`.
- `4-docs-packet` — Assemble the Docs sync packet in-thread from the tdd log.
- `4-docs-updater` — Invoke the `docs-updater` subagent with that packet (`run_in_background: true`); wait for its report before 4C.
- `4c-findings` — Merge INPUT `docs/findings/runs/res-67_no_show_status_check_a8e1c4d2.md` into `docs/findings/<category>.md`, then invoke `linear-resolver` to register findings (Cloud: persist + STOP before net-new issues).
- `4b-linear` — Invoke the `linear-resolver` subagent to post the RES-67 resolution comment only (no state write).
- `4-format` — INPUT: this run’s dirty paths from `git status --porcelain`. OUTPUT: `pnpm exec prettier --write <path> …` (never `.`). Then STEP 4G (advisory CodeRabbit), then STEP 4F (`/commit` then `/push` on PASS).

```markdown
## Docs sync packet

- plan_slug: res-67_no_show_status_check_a8e1c4d2
- spec: docs/specs/booking-rules.md
- mode: FIX
- linear_issue: RES-67
- criteria_shipped: [C1, C2]
- criteria_manual_uat: none
- req_ids: [RES-STATUS-NOSHOW, RES-STATUS-FORWARD]
- source_paths: [supabase/migrations/00000000000000_baseline.sql]
- test_paths: [tests/integration/reservations/status-transitions.integ.test.ts, tests/unit/reservations/status-check-forward.test.ts]
- architecture_touch: [Reservation-Flow]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-67_no_show_status_check_a8e1c4d2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none at plan time. Analytics RA-5 still cannot insert `no_show` until C1 ships; do not edit that suite here. The `Until RES-67` sentence in `reservation-analytics.md` is docs-updater work after Green, not a finding.

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-67 (plan: res-67_no_show_status_check_a8e1c4d2), posting this plan's `## Linear Plan Digest` (bounded to `START_SUMMARY_MAX_CHARS`) as the single `Work started:` comment. Task `run_in_background: true`; do not wait before spec/C1.
- **Close-out:** After 4C, invoke `linear-resolver` for RES-67: post structured resolution comment only. Managed Cloud: then commit.md; on PASS push.md.
- **Findings registration:** Skip if run file + category files + this table stay empty of **new** open lines from this run. Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

Placeholder — collated after Refactor phases into the tdd log.

- [schema] baseline `reservations.status` CHECK includes `no_show`
- [schema] dated last-writer DROP/ADD `reservations_status_check` + `completed_at` IF NOT EXISTS
- [public-api] `transitionReservationStatus` persist path (already writes `no_show`)

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (pending Refactor lines)
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-67_no_show_status_check_a8e1c4d2`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Do not wait for a second accept. Arm `tdd-guard`. Launch START (Task `run_in_background: true`; do not wait). Apply the spec edit listed in `## Permissions Requested`. Bring local Supabase up. Then delegate C1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Bound by every non-waived STOP.

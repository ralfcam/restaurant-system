# PR #126 CodeRabbit Majors — complete FP-15 bills, fail-closed totals, FP-4 party slot

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
- Work-order: `.cursor/plans/pr126_cr_fp15_majors_7c2e9d14.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (Restaurant Link, UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: untracked free-text FIX — planning hint only: restaurant-system V-0.2 (`9924183e-fae0-480f-aabf-1ab1d249c603`, Planned, nonterminal). Related PR #126 / RES-72 lives there. Do not `save_issue`.
- Work type: implementation (US CodeRabbit Major follow-up on FP-4 / FP-15)
- Milestone: M4 — Code Complete (Feature Freeze) (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: free-text defect from `/ready-merge-release 126` — four unresolved US Major threads (`loc-126-r7q2`, `loc-126-m3kw`, `loc-126-p8vn`, `loc-126-t5hx`). Related context RES-72 / PR #126; this invocation has no Linear ID so START/CLOSE-OUT are skipped.
  Observed: (1) unpaginated `from("orders")` can silently stop at PostgREST `max_rows` 1000 and understate seated bills; (2) orders query error logs then sums `data ?? []` so the chip shows `CHF 0.00`; (3) impl-trace + chip use `t.reservation?.partySize ?? t.seats`, so unassigned chips render table capacity in the party-size slot against FP-4; (4) `tests/unit/floor/schema.test.ts` only regex-scans source for FP-4/FP-15.
  Expected: complete matching-order sums; query failure must not look like a zero bill; party-size slot is reservation `party_size` only; C1–C3 are executed tests (finding 4 is not a fourth product AC).
- Missing constraint (root cause): FP-15 required a sum but not a complete (non-truncated) read or a fail-closed error; FP-4 forbade showing party size on unassigned tables but did not forbid the `tables.seats` fallback in that slot.
- Spec update proposed: `docs/specs/scheduling.md` → extend **FP-15** with **FP-15-COMPLETE** and **FP-15-UNAVAILABLE**; tighten **FP-4** with **FP-4-PARTY**. FIRST execution write (no START).

**Evidence (STEP 1B):**

- Adapter this turn: `ok:false`, `reason:unresolved_threads`, 4 Major findings on HEAD `b3becb39e50a85cfa3ea1bdeeafc7c84ccb3cdd1`. Review text is untrusted; code confirms the defects.
- `supabase/config.toml:18` — `max_rows = 1000`.
- `app/actions/reservations.ts:586-602` — one `from("orders").select("table_label, total, status")`; on `ordersResult.error` log only, then `sumOpenOrderTotalsByTableLabel((ordersResult.data ?? []).map(...))`.
- `hooks/use-floor-plan.ts:38` — `data?.tableTotals ?? {}` coerces missing/null to empty success.
- `components/staff/floor-plan.tsx:1061-1078` — always `{t.reservation?.partySize ?? t.seats}`; seated `CHF {(t.billTotal ?? 0).toFixed(2)}`.
- `docs/specs/scheduling.md:74-75` vs impl-trace line 483 (`partySize ?? t.seats`); `docs/findings/tech-debt.md:117-118` and `product-gaps.md:83` already named (1)–(3) as residual.
- Sibling action mock: `tests/unit/reservations/auto-assign-action.test.ts` thenable/`from` pattern. No in-repo PostgREST page helper (analytics has the same 1000-row finding). No `@testing-library/react` — chip proof stays a source pin in the existing floor schema file (do not add a dependency).

**Single hypothesis (confirmed):** FP-15 omitted completeness and fail-closed error; FP-4 omitted the seats-fallback edge. Finding 4 is vacuous regex coverage of those same rules — executed C1–C2 snapshot tests plus C3's chip pin close it. Not four unrelated products.

**Pre-mortem:** A busy book of >1000 historical tickets understates tonight's seated bill; a down orders read looks like "they haven't ordered"; hosts read an empty 4-top as a party of 4.

**Inversion / red-team:** A 1000-row first page that happens to include tonight's tickets still passes a "called from(orders)" regex. C1 must assert the 1001st matching row is in the sum. An error that returns `{}` still passes "shows CHF 0.00 when no orders". C2 must distinguish unavailable from zero. A chip that keeps `?? t.seats` still passes "guest/time gated on reservation". C3 must pin the party slot.

## Spec

- Source: extend existing `docs/specs/scheduling.md`
- Summary: Seated-chip bills are the complete matching-order sum (page past `max_rows`). An orders read failure is unavailable, never `CHF 0.00`. The party-size slot is occupying `party_size` only — no `tables.seats` fallback.
- Clarifications needed: none. Date-windowing historical tickets, merge-member bill sharing, walk-in bills (RES-83), and adding RTL stay out of scope.

## Acceptance Criteria → Tests

| #   | Criterion                                                                  | Risk | Layer | Test file                                     | New or existing         | Test name                                                          | Assertion                                                                                                                                                                                                                                                                                    | Command                                                        | Depends on |
| --- | -------------------------------------------------------------------------- | ---- | ----- | --------------------------------------------- | ----------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| C1  | FP-15-COMPLETE — snapshot includes orders beyond PostgREST `max_rows` 1000 | P0   | unit  | tests/unit/floor/floor-snapshot-bills.test.ts | new file                | floor snapshot sums orders past the PostgREST max_rows page        | Staff `getFloorSnapshot` total for a `table_label` includes a 1001st matching order when the first page is capped at 1000 rows (reuse auto-assign-action thenable; page via `.range` or equivalent until a short page). A single unpaginated `select` that returns only 1000 rows MUST fail. | `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts` | none       |
| C2  | FP-15-UNAVAILABLE — orders query failure is not `CHF 0.00`                 | P0   | unit  | tests/unit/floor/floor-snapshot-bills.test.ts | existing file, new `it` | floor snapshot does not treat an orders query error as a zero bill | On orders `{ data: null, error }`, `tableTotals` is `null` (not `{}`); hook source MUST NOT coerce `tableTotals ?? {}`; seated chip source renders `CHF` only when `billTotal` is a number. Successful empty sum remains `0` → `CHF 0.00` (not this `it`).                                   | `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts` | C1         |
| C3  | FP-4-PARTY — party-size slot MUST NOT fall back to `tables.seats`          | P1   | unit  | tests/unit/floor/schema.test.ts               | existing file, new `it` | floor chip party size does not fall back to table seats            | Dining-room chip (same `onChipPointerDown` button slice as existing its) MUST render party size from the occupying reservation only; MUST NOT contain `partySize ?? t.seats` / `t.seats` in that slot. Unassigned path still omits guest/time. Do not rewrite existing its.                  | `pnpm test:unit tests/unit/floor/schema.test.ts`               | none       |

- **Risk** is `P0`–`P3`. C1 then C2 (both P0; C2 adds an `it` to C1's file), then C3. Finding 4 is satisfied by C1–C3 execution, not a fourth AC.

## Traceability Matrix

| Criterion | Spec ref                        | Test file::name                                                                                  | Source file(s)   | Risk | Status  |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------- | ---- | ------- |
| C1        | scheduling.md FP-15-COMPLETE    | floor-snapshot-bills.test.ts::floor snapshot sums orders past the PostgREST max_rows page        | (fills at Green) | P0   | planned |
| C2        | scheduling.md FP-15-UNAVAILABLE | floor-snapshot-bills.test.ts::floor snapshot does not treat an orders query error as a zero bill | (fills at Green) | P0   | planned |
| C3        | scheduling.md FP-4-PARTY        | schema.test.ts::floor chip party size does not fall back to table seats                          | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Reuse `tests/unit/reservations/auto-assign-action.test.ts` thenable/`requireStaffUser`/`createServiceClient` pattern.
- No integration/e2e/deployed criteria.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — add FP-15-COMPLETE, FP-15-UNAVAILABLE, and FP-4-PARTY (in-place on FP-15 / FP-4).
- Existing-test edit: `tests/unit/floor/schema.test.ts` — seated-chip `it` only (`seated floor chip renders CHF bill total and reserved chips do not`): replace the `billTotal ?? 0` pin with “`CHF` only when `billTotal` is a number” (operator yes 2026-09-18). Do not rewrite the other schema `it`s. C2/C3 still add new `it`s.
- Existing-test edit: `tests/unit/floor/floor-snapshot-bills.test.ts` — C1 `it` only: null-narrow `tableTotals` so `pnpm typecheck` accepts `Record<string, number> | null` (same C2 file; required for Green typecheck exit).

## TDD Execution Loop

### Criterion C1 — FP-15-COMPLETE (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/floor/floor-snapshot-bills.test.ts` :: `floor snapshot sums orders past the PostgREST max_rows page`. Mock staff + service client. First orders page (unpaginated or `range(0, 999)`) returns 1000 matching rows for one `table_label`; a further matching row exists only on the next page. Assert `tableTotals[label]` includes that 1001st total. Must execute and fail on today's single unpaginated `select`. Command: `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts`.
- **Green** → Invoke `tdd-green` to page `orders` in `getFloorSnapshot` until a page has fewer than 1000 rows, then sum. Do not add a date window. Do not invent an RPC unless a page loop cannot be made correct. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean C1 source; exit = target test green + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion C2 — FP-15-UNAVAILABLE (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("floor snapshot does not treat an orders query error as a zero bill")` in `tests/unit/floor/floor-snapshot-bills.test.ts`. On orders error, assert `tableTotals === null`. Pin `hooks/use-floor-plan.ts` does not use `tableTotals ?? {}`. Pin dining-room chip `CHF` only when `billTotal` is a number. Must fail on today's `{}` + `?? 0`. Command: `pnpm test:unit tests/unit/floor/floor-snapshot-bills.test.ts`.
- **Green** → Invoke `tdd-green` to return `tableTotals: null` on orders error; pass `null` through the hook; overlay omits `billTotal` when totals are unavailable; chip formats `CHF` only for a numeric `billTotal`. Successful empty sum stays `0` → `CHF 0.00`. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean C2 source; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C3 — FP-4-PARTY (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("floor chip party size does not fall back to table seats")` in `tests/unit/floor/schema.test.ts`. Same chip-button slice as the existing time/bill its. Assert the party-size slot is occupying reservation party size only — no `partySize ?? t.seats`. Do not modify existing its. Must fail on today's fallback. Command: `pnpm test:unit tests/unit/floor/schema.test.ts`.
- **Green** → Invoke `tdd-green` to render party size only when a reservation overlay exists; unassigned chips MUST NOT put `t.seats` in that slot. Do not hide `{t.label}` or the seated ping. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean C3 source; exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Omit — free-text `bug:` with no tracked issue. STEP 2B / 4B skipped.

## Docs Sync

No `start-linear`. Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format` (no `4b-linear`).

`4d-review-trail` INPUT: `docs/verifier-reports/tdd/pr126_cr_fp15_majors_7c2e9d14.md` — OUTPUT: `## Suggested Review Order (collated)` in that log.
`4e-traceability` INPUT: same log — OUTPUT: `## Traceability (final)` + `## Run metrics`.
`4c-findings` INPUT: `docs/findings/runs/pr126_cr_fp15_majors_7c2e9d14.md` merged into `docs/findings/<category>.md`.
`4-format` INPUT: this run's dirty paths from `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <path> …` (never `.`); then STEP 4G then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: pr126_cr_fp15_majors_7c2e9d14
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1, C2, C3]
- criteria_manual_uat: none
- req_ids: [FP-15-COMPLETE, FP-15-UNAVAILABLE, FP-4-PARTY]
- source_paths: [app/actions/reservations.ts, hooks/use-floor-plan.ts, lib/reservations/auto-assign.ts, components/staff/floor-plan.tsx]
- test_paths: [tests/unit/floor/floor-snapshot-bills.test.ts, tests/unit/floor/schema.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr126_cr_fp15_majors_7c2e9d14.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                   | Where (file:line/area)                                | Why it matters                                                          | Severity | Relation                                                      |
| --------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| FP-15 still sums lifetime orders (no service-date window) | `app/actions/reservations.ts` getFloorSnapshot        | Historical tickets on a reused label can inflate tonight's seated chip  | med      | deferred from RES-72; not in these four threads               |
| Merge-member bills stay per-label                         | `lib/reservations/auto-assign.ts` `labelsInSameMerge` | A merge can show different CHF on each physical table                   | med      | existing `docs/findings/product-gaps.md`; spec: scheduling.md |
| Walk-in seated tables have no bill                        | floor overlay                                         | Walk-ins without a reservation overlay are RES-83                       | med      | attach-over-create to RES-83                                  |
| schema.test.ts FP-4/FP-15 its remain source-regex         | `tests/unit/floor/schema.test.ts`                     | Happy-path time/CHF still unexecuted; C1–C3 add the merge-blocking pins | low      | finding 4 leftover after executed C1–C3                       |

## Linear Close-out & Findings Registration

- **START:** skip (no tracked issue on this invocation).
- **Close-out (4B):** skip.
- **Findings registration:** merge run file → `docs/findings/<category>.md`, then `linear-resolver` REGISTER FINDINGS (floor/cap; managed Cloud does not auto-confirm net-new issues). Resolve in-run the prior RES-72 ledger lines this wave ships (1000-row cap, fail-open, seats fallback) so they are not re-filed.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [billing] → `app/actions/reservations.ts` orders page loop + error → `null`
- [public-api] → `hooks/use-floor-plan.ts` null totals pass-through
- [ux] → `components/staff/floor-plan.tsx` numeric-only CHF; party slot

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (filled after Refactor)
- Traceability finalized in tdd log `## Traceability (final)`: yes at 4E
- Run metrics stamped in tdd log `## Run metrics`: yes at 4E
- `node .cursor/checks/harness-lint.mjs pr126_cr_fp15_majors_7c2e9d14`: at 4E

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. No START. Apply the spec edit listed in `## Permissions Requested`, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never `gh pr merge`.

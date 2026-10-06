# res-131_pos_table_required_4489

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
- Work-order: `.cursor/plans/res-131_pos_table_required_4489.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link, informational)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, status Backlog → available). Precedence #2 (issue's existing nonterminal RES version project). Discovery set: V-0.5 Backlog (available). V-0.1 and V-0.2 Completed excluded as terminal. No allocation tie.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Issue already on that milestone. Matches FIX implementation.
- Mixed design + implementation: no
- Clarification: resolved by human comment (`clarify:RES-131:scheduling:FP-13`, decision 2026-10-05: amend FP-13, then /sdd-to-tdd)

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-131 — `/pos` can fire a kitchen ticket with no real table. `createKitchenOrder` looks the label up in `tables` and inserts `table_id: table?.id ?? null`, so an unmatched or empty label still creates an `orders` row with a null `table_id`. The Send button is disabled only for an empty cart. Expected: the send is rejected, no null `table_id` is stored, and Send stays disabled until a real table is selected.
- Missing constraint (root cause): FP-13 requires the Table `Select` to list live `tables` rows and to disable when there are none. It says nothing about the send itself, so neither the server action nor the Send button was required to refuse a send with no matching table. Evidence: `app/actions/operations.ts` `createKitchenOrder` (`table_id: table?.id ?? null`); `components/staff/pos-terminal.tsx` Send `disabled={cart.length === 0 || sending}` and `sendToKitchen` guard `cart.length === 0 || sending`. Existing `tests/unit/floor/pos-table-picker.test.ts` covers only the picker source and the disabled empty `Select`.
- Spec update proposed: `docs/specs/scheduling.md` FP-13 — a kitchen send MUST reference a persisted `tables` row: `createKitchenOrder` MUST reject with `errors.floor.tableNotFound` when the submitted label is empty or matches no row, before inserting any `orders` / `order_items` row, and MUST never store a null `table_id`; `PosTerminal`'s Send MUST stay disabled and `sendToKitchen` MUST no-op while no table is selected. Update the FP-13 trace row to name the two new tests. This edit is the first spec action and is listed in `## Permissions Requested`.

## Spec

- Source: existing `docs/specs/scheduling.md` (FP-13)
- Summary: `/pos` Table `Select` lists live `tables` rows from `getTables()` and disables with a placeholder when none exist. This fix adds the send-side invariant: every kitchen order references a real `tables` row, enforced server-side in `createKitchenOrder` and mirrored by a disabled Send button until a table is selected.
- Clarifications needed: none. Ready brief Decisions: missing table → reject the send, store no null `table_id`, keep Send disabled until a real table is selected (decision comment 2026-10-05); where to land: staging. Out of scope: KDS layout, floor plan, table schema.
- Error key: reuse the existing catalog key `errors.floor.tableNotFound` ("Table not found." / FR present). No new catalog key, so `messages/*.json` stays untouched (not in Allowed edits).
- Query-order constraint: keep the existing order in `createKitchenOrder` (staff gate → line count → `menu_items` → `tables` → `orders` → `order_items`). `tests/unit/floor/message-keys.test.ts` scripts the service queue in that order; it must stay green unedited.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                                  | Risk | Layer | Test file                                 | New or existing         | Test name                                                                     | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Command                                                    | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ----------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| C1  | FP-13 send: `createKitchenOrder` rejects with `errors.floor.tableNotFound` when the table label is empty or matches no `tables` row, inserts no `orders`/`order_items` row, and a matched label inserts the matched row's id as `table_id` | P0   | unit  | tests/unit/floor/pos-table-picker.test.ts | existing file, new test | `createKitchenOrder rejects a kitchen send whose table matches no tables row` | Mock `@/lib/supabase/service` (pattern of `pos-menu-availability.test.ts`) with a `tables` lookup that returns the row whose `label` equals the `.eq("label", …)` value, else `null`; staff gate resolves a user; one available menu item. (a) table `"99"` (no row) → rejects `errors.floor.tableNotFound`; orders and order_items inserts not called. (b) table `""` → same rejection, no inserts. (c) table `"1"` with row `{ id: "t1", label: "1" }` → resolves and the orders insert receives `table_id: "t1"`. | `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts` | none       |
| C2  | FP-13 send: `PosTerminal` Send button is disabled and `sendToKitchen` no-ops while no table is selected                                                                                                                                    | P1   | unit  | tests/unit/floor/pos-table-picker.test.ts | existing file, new test | `Send stays disabled until a live table is selected`                          | Source-scoped on `components/staff/pos-terminal.tsx`: slice the `<Button` element whose props contain `onClick={sendToKitchen}`; its `disabled={…}` expression contains `!table`. Slice the `sendToKitchen` function body up to its `try`; the early-return guard contains `!table`. The existing cart/sending conditions stay in both.                                                                                                                                                                              | `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts` | C1         |

- Inversion (C1): a mock whose `tables` lookup always returns a row would pass today. The lookup must honor the label, and case (a) must observe that today's code inserts with `table_id: null` (so the test fails on the resolve, not on a harness error). Case (c) prevents a "reject everything" Green.
- Inversion (C2): a file-wide `!table` search could match unrelated code. Scope to the Send `<Button` slice and the `sendToKitchen` guard.

## Traceability Matrix

| Criterion | Spec ref            | Test file::name                                                                                       | Source file(s)   | Risk | Status  |
| --------- | ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | scheduling.md FP-13 | pos-table-picker.test.ts::createKitchenOrder rejects a kitchen send whose table matches no tables row | (fills at Green) | P0   | planned |
| C2        | scheduling.md FP-13 | pos-table-picker.test.ts::Send stays disabled until a live table is selected                          | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration, e2e, or deployed criterion.
- If that infra cannot be brought up at execution time, the affected criteria STOP (a skipped suite is never accepted as Red/Green).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — amend FP-13 with the send-side table invariant and update the FP-13 trace row. Ready brief Allowed edits pre-grant `app/actions/operations.ts` and `components/staff/pos-terminal.tsx` for Green, and `tests/unit/floor/pos-table-picker.test.ts` for Red.
- Existing-test edit: none. C1 and C2 each add one new `it` to `tests/unit/floor/pos-table-picker.test.ts` (plus the module-level `vi.mock` setup C1 needs). Do not modify, rename, or delete the two existing FP-13 tests. `tests/unit/floor/message-keys.test.ts` and `tests/unit/floor/pos-menu-availability.test.ts` stay unedited and must stay green.

## TDD Execution Loop

### Criterion C1 — server rejects a send with no matching table (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1. Work-order `.cursor/plans/res-131_pos_table_required_4489.plan.md`, criterion C1 / FP-13 only. Add one `it` named `createKitchenOrder rejects a kitchen send whose table matches no tables row` to `tests/unit/floor/pos-table-picker.test.ts`, in a new `describe` block. Add the hoisted mocks it needs (`@/lib/supabase/require-staff`, `next/cache`, `@/lib/supabase/service`) following `tests/unit/floor/pos-menu-availability.test.ts`, but the `tables` `.select().eq(column, value).maybeSingle()` must return the row whose `label` equals `value`, else `null`. Cover cases (a) `"99"`, (b) `""`, and (c) `"1"` → `table_id: "t1"` from the Acceptance table. Do not edit the two existing tests. Command: `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts`. Exit: the new test RED because today's code resolves and inserts `table_id: null` for case (a) (assertion failure, suite executed, not skipped). Existing tests stay green.
- **Green** → Invoke `tdd-green` to make C1 pass. Minimal change in `app/actions/operations.ts` `createKitchenOrder` only: keep the query order; after the `tables` lookup, throw `new Error("errors.floor.tableNotFound")` when no row matched (this also covers an empty label), and insert `table_id: table.id`. Do not edit tests or the spec. Exit: `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts tests/unit/floor/message-keys.test.ts tests/unit/floor/pos-menu-availability.test.ts` GREEN, executed, not skipped.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Keep one rejection path and no null `table_id` fallback. Exit: `pnpm test:unit tests/unit/floor` GREEN (executed), `pnpm lint` (0 warnings), `pnpm typecheck` clean, and `pnpm exec prettier --check app/actions/operations.ts` clean.

### Criterion C2 — Send disabled until a table is selected (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C2. Work-order `.cursor/plans/res-131_pos_table_required_4489.plan.md`, criterion C2 / FP-13 only. Add one `it` named `Send stays disabled until a live table is selected` to `tests/unit/floor/pos-table-picker.test.ts` (source-scoped on `components/staff/pos-terminal.tsx`, like the existing tests). Slice the `<Button` whose props include `onClick={sendToKitchen}` and assert its `disabled={…}` contains `!table`; slice `function sendToKitchen` up to its `try` and assert the early-return guard contains `!table`. Do not edit existing tests. Command: `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts`. Exit: the new test RED because neither expression references `table` today (assertion failure, executed, not skipped).
- **Green** → Invoke `tdd-green` to make C2 pass. Minimal change in `components/staff/pos-terminal.tsx` only: add `!table` to the Send button's `disabled` expression and to `sendToKitchen`'s early-return guard. Keep the existing cart/sending conditions. Do not edit tests or the spec. Exit: `pnpm test:unit tests/unit/floor/pos-table-picker.test.ts` GREEN, executed, not skipped.
- **Refactor** → Invoke `tdd-refactor` to clean up C2 and re-verify. Exit: `pnpm test:unit tests/unit/floor` GREEN (executed), `pnpm lint` (0 warnings), `pnpm typecheck` clean, and `pnpm exec prettier --check components/staff/pos-terminal.tsx` clean.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-131_pos_table_required_4489`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-131_pos_table_required_4489.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-131_pos_table_required_4489.plan.md`

Problem: On `/pos`, a kitchen order can be sent with a table label that matches no `tables` row. `createKitchenOrder` then stores the order with a null `table_id`, and the Send button only checks for an empty cart. FP-13 covered the table picker but said nothing about the send itself.
Approach: Amend FP-13 (per the 2026-10-05 decision) so every kitchen send must reference a real `tables` row. `createKitchenOrder` rejects an empty or unmatched label with the existing `errors.floor.tableNotFound` key before inserting anything, and never stores a null `table_id`. `PosTerminal` keeps Send disabled, and the send handler a no-op, until a table is selected. Prove both with unit tests in `tests/unit/floor/pos-table-picker.test.ts`.
Out-of-scope findings: none

| #   | Criterion                                                     | Risk | Layer | Test file                                 |
| --- | ------------------------------------------------------------- | ---- | ----- | ----------------------------------------- |
| 1   | createKitchenOrder rejects a send with no matching tables row | P0   | unit  | tests/unit/floor/pos-table-picker.test.ts |
| 2   | Send stays disabled until a live table is selected            | P1   | unit  | tests/unit/floor/pos-table-picker.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1. Plan slug: `res-131_pos_table_required_4489`.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-131_pos_table_required_4489
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-131
- criteria_shipped: [FP-13]
- criteria_manual_uat: none
- req_ids: [FP-13]
- source_paths: [app/actions/operations.ts, components/staff/pos-terminal.tsx]
- test_paths: [tests/unit/floor/pos-table-picker.test.ts]
- architecture_touch: [POS]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-131_pos_table_required_4489.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-131 (plan: `res-131_pos_table_required_4489`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before the spec edit.
- **Close-out (FIX):** delegate `linear-resolver` to post the structured resolution comment only. No workflow-state write.
- **Findings registration:** omit if the run file stays empty. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Collate at close-out from the Refactor reports.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-131_pos_table_required_4489`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-131_pos_table_required_4489.plan.md`. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). Apply the FP-13 edit in `docs/specs/scheduling.md`, prettier that file, set phase red, then delegate Criterion C1 Red.

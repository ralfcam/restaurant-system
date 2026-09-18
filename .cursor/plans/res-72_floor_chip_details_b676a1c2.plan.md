# res-72_floor_chip_details_b676a1c2

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
- Work-order: `.cursor/plans/res-72_floor_chip_details_b676a1c2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`; issue prefix `RES-###`)
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, `versionKey` `V-0.2`, status Planned/nonterminal). Precedence: issue already on this project. Terminal `V-0.1` excluded; `V-0.5` Backlog unused.
- Work type: implementation (spec-first FIX: tighten FP-4 + add FP-15, then TDD)
- Milestone: M4 (Code Complete). Issue currently sits on M3 from a dispatch park; `/design` hub walk found owner `scheduling.md` so this is not greenfield design. ACs in RES-72 are testable. Do not split; do not mutate Linear milestone.
- Mixed design + implementation: no — bill/time contracts are written into the owning spec in this run before Red.
- Clarification: resolved by human `@cursor /design` after `clarify:RES-72:scheduling.md:FP-4`. Hub walk routed that `/design` to `/sdd-to-tdd @docs/specs/scheduling.md`. Keep the mixed RES-72 ACs (time-on-card is an FP-4 implementation gap; seated bill is the missing FP-15 rule).

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: [RES-72](https://linear.app/realized/issue/RES-72/show-reservation-details-and-seated-bill-total-directly-on-floor-plan) — Floor Plan chips show guest + party size; reservation time lives only in the inspector; seated chips never show the current bill. Staff must open the inspector or POS.
- Missing constraint (root cause): FP-4 says the chip “shows … time” but does not require the chip to render the assigned reservation’s `time`, and no criterion requires a live seated bill total from `orders`.
- Spec update proposed: `docs/specs/scheduling.md` — tighten FP-4 (chip MUST render guest, party size, and the assigned reservation’s time; unassigned tables MUST NOT) and add **FP-15** (seated bill = sum of non-cancelled/voided `orders.total` for that `table_label`, CHF two-decimal POS format, live via the existing 5s snapshot).

## Spec

- Source: extend existing `docs/specs/scheduling.md`
- Summary: `/admin/floor` chips already overlay occupying reservations (FP-4). This run makes the chip render guest, party, and time from that overlay, and adds a seated-only live bill total from POS orders on the same SWR snapshot.
- Clarifications needed: none (POS already uses `CHF {n.toFixed(2)}`; walk-ins stay RES-83).

## Acceptance Criteria → Tests

| #   | Criterion                              | Risk | Layer | Test file                                     | New or existing           | Test name                                                                         | Assertion                                                                                                                                                      | Command                                                      | Depends on |
| --- | -------------------------------------- | ---- | ----- | --------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| C1  | Sum open order totals by table label   | P0   | unit  | `tests/unit/floor/table-bills.test.ts`        | new file                  | `sums non-cancelled order totals by table_label and ignores cancelled or voided`  | Multiple open orders on one label sum; `cancelled`/`voided` excluded; empty input yields empty map                                                             | `pnpm test:unit tests/unit/floor/table-bills.test.ts`        | none       |
| C2  | Overlay attaches bill only when seated | P0   | unit  | `tests/unit/reservations/auto-assign.test.ts` | new `it` in existing file | `attaches billTotal only for seated overlays from the table totals map`           | Seated overlay `billTotal` matches map; confirmed overlay `billTotal` is null; unassigned `reservation` is null; guest/party/time still match the assigned row | `pnpm test:unit tests/unit/reservations/auto-assign.test.ts` | C1         |
| C3  | Live snapshot carries table bills      | P1   | unit  | `tests/unit/floor/schema.test.ts`             | new `it` in existing file | `floor snapshot and live hook carry table bill totals on the 5s refresh`          | `getFloorSnapshot` source loads `orders` totals; `useFloorPlan` still `refreshInterval` 5000 and overlays bills onto tables                                    | `pnpm test:unit tests/unit/floor/schema.test.ts`             | C1         |
| C4  | Chip renders reservation time          | P1   | unit  | `tests/unit/floor/schema.test.ts`             | new `it` in existing file | `floor chip renders the assigned reservation time without hiding the table label` | Chip block renders `t.reservation.time` (and guest/party) when overlay present; `t.label` remains the heading; unassigned path has no guest/time               | `pnpm test:unit tests/unit/floor/schema.test.ts`             | none       |
| C5  | Chip renders seated CHF bill           | P1   | unit  | `tests/unit/floor/schema.test.ts`             | new `it` in existing file | `seated floor chip renders CHF bill total and reserved chips do not`              | Seated chip formats `CHF` + two decimals from overlay bill; confirmed overlay path does not render a bill; `t.label` and seated ping still present             | `pnpm test:unit tests/unit/floor/schema.test.ts`             | C2         |

Layer above unit is not required: money math, overlay attach, snapshot wiring, and chip copy are all decidable in unit/source-regex tests already used for FP-4/FP-11.

## Traceability Matrix

| Criterion | Spec ref                   | Test file::name                                                                                                          | Source file(s) | Risk | Status  |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | ---- | ------- |
| C1        | scheduling.md FP-15        | `tests/unit/floor/table-bills.test.ts`::`sums non-cancelled order totals by table_label and ignores cancelled or voided` | (Green fills)  | P0   | planned |
| C2        | scheduling.md FP-15 + FP-4 | `tests/unit/reservations/auto-assign.test.ts`::`attaches billTotal only for seated overlays from the table totals map`   | (Green fills)  | P0   | planned |
| C3        | scheduling.md FP-15        | `tests/unit/floor/schema.test.ts`::`floor snapshot and live hook carry table bill totals on the 5s refresh`              | (Green fills)  | P1   | planned |
| C4        | scheduling.md FP-4         | `tests/unit/floor/schema.test.ts`::`floor chip renders the assigned reservation time without hiding the table label`     | (Green fills)  | P1   | planned |
| C5        | scheduling.md FP-15 + FP-4 | `tests/unit/floor/schema.test.ts`::`seated floor chip renders CHF bill total and reserved chips do not`                  | (Green fills)  | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- If that infra cannot be brought up at execution time, the affected criteria STOP (a skipped suite is never accepted as Red/Green).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — tighten FP-4 chip time/guest/party contract; add FP-15 seated live bill total.
- Existing-test edit: none (new `it` blocks / new file only).

## TDD Execution Loop

### Criterion C1 — Sum open order totals by table label (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/floor/table-bills.test.ts` test `sums non-cancelled order totals by table_label and ignores cancelled or voided`. Import the helper the spec needs (name may be `sumOpenOrderTotalsByTableLabel`). Assert two `new`/`ready` rows on label `3` sum; a `cancelled` and a `voided` row on the same label are ignored; a different label is a separate key; `[]` returns `{}` or empty Map. Must fail on missing export / wrong sum. Command: `pnpm test:unit tests/unit/floor/table-bills.test.ts`.
- **Green** → Invoke `tdd-green` to add the smallest helper (prefer `lib/floor/table-bills.ts` or next to overlay) that sums `total` for statuses other than `cancelled`/`voided` by `table_label`. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C1; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C2 — Overlay attaches bill only when seated (layer: unit)

- **Red** → Invoke `tdd-red` to add one new `it` in `tests/unit/reservations/auto-assign.test.ts` named `attaches billTotal only for seated overlays from the table totals map`. Do not edit the existing overlay `it`. Pass a totals map into `overlayReservationsOnTables` (or a documented wrapper). Seated table 3 gets `billTotal` from the map; confirmed table 1 has `billTotal` null; table 8 unassigned `reservation` null; seated/confirmed still match guest/party/time of their assigned rows. Command: `pnpm test:unit tests/unit/reservations/auto-assign.test.ts`.
- **Green** → Invoke `tdd-green` to thread optional table totals into the overlay and set `billTotal` only for `seated`. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C2; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C3 — Live snapshot carries table bills (layer: unit)

- **Red** → Invoke `tdd-red` to add one new `it` in `tests/unit/floor/schema.test.ts` named `floor snapshot and live hook carry table bill totals on the 5s refresh`. Assert `getFloorSnapshot` (or its helper) selects `orders` `table_label,total,status`; `useFloorPlan` keeps `refreshInterval` 5000 / `FLOOR_REFRESH_MS = 5000` and applies the bill helper onto overlay. Must fail today (snapshot returns only tables/reservations/assigned/merges). Command: `pnpm test:unit tests/unit/floor/schema.test.ts`.
- **Green** → Invoke `tdd-green` to load order totals in `getFloorSnapshot` (staff + service client, same privilege model as tables) and wire them through `useFloorPlan` into overlay. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C3; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C4 — Chip renders reservation time (layer: unit)

- **Red** → Invoke `tdd-red` to add one new `it` in `tests/unit/floor/schema.test.ts` named `floor chip renders the assigned reservation time without hiding the table label`. Scope the dining-room chip button (not the inspector). Must render `t.reservation.time` when overlay exists, keep `t.label` as the heading, and not render guest/time on the unassigned path. Fails today because the chip omits time. Command: `pnpm test:unit tests/unit/floor/schema.test.ts`.
- **Green** → Invoke `tdd-green` to render time on the chip from the overlay without replacing `t.label` or status chrome. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C4; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C5 — Chip renders seated CHF bill (layer: unit)

- **Red** → Invoke `tdd-red` to add one new `it` in `tests/unit/floor/schema.test.ts` named `seated floor chip renders CHF bill total and reserved chips do not`. Chip must format seated `billTotal` like POS (`CHF` + two decimals); confirmed overlay must not show a bill; `t.label` and seated ping remain. Command: `pnpm test:unit tests/unit/floor/schema.test.ts`.
- **Green** → Invoke `tdd-green` to render the seated bill on the chip only. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C5; exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- Visual density / “readable without obscuring status” on a busy live floor — human judgment of the reference photo. Chip identity and ping are locked by C4/C5 unit tests; aesthetic spacing is not.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-72_floor_chip_details_b676a1c2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-72_floor_chip_details_b676a1c2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 5 automatable · 1 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-72_floor_chip_details_b676a1c2`

Problem: Floor Plan chips already overlay guest and party size, but reservation time stays in the inspector and seated tables never show a bill. Staff cannot run service from the canvas alone. FP-4 mentioned time on the chip without requiring that render, and no rule defined a live seated bill.
Approach: Tighten FP-4 so the chip must render the assigned reservation’s guest, party, and time, and add FP-15: seated bill is the sum of non-cancelled/voided `orders.total` for that table label, formatted like POS (CHF, two decimals), refreshed on the existing 5s `useFloorPlan` snapshot. Unassigned tables stay bare. Walk-in seating stays RES-83.
Out-of-scope findings: none

| #   | Criterion                              | Risk | Layer | Test file                                   |
| --- | -------------------------------------- | ---- | ----- | ------------------------------------------- |
| 1   | Sum open order totals by table label   | P0   | unit  | tests/unit/floor/table-bills.test.ts        |
| 2   | Overlay attaches bill only when seated | P0   | unit  | tests/unit/reservations/auto-assign.test.ts |
| 3   | Live snapshot carries table bills      | P1   | unit  | tests/unit/floor/schema.test.ts             |
| 4   | Chip renders reservation time          | P1   | unit  | tests/unit/floor/schema.test.ts             |
| 5   | Chip renders seated CHF bill           | P1   | unit  | tests/unit/floor/schema.test.ts             |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-72_floor_chip_details_b676a1c2
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-72
- criteria_shipped: [C1, C2, C3, C4, C5]
- criteria_manual_uat: [visual-density-on-busy-floor]
- req_ids: [FP-4, FP-15]
- source_paths: [...]
- test_paths: [tests/unit/floor/table-bills.test.ts, tests/unit/reservations/auto-assign.test.ts, tests/unit/floor/schema.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-72_floor_chip_details_b676a1c2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                                                     | Where (file:line/area)        | Why it matters                                      | Severity | Relation       |
| ------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------- | -------- | -------------- |
| Walk-in seated tables have no reservation overlay, so they will not show a bill under FP-15 | `/admin/floor` chips · RES-83 | Service may still need a walk-in bill on the canvas | med      | related RES-83 |

Planning-time seed only if we treat walk-ins as a product-gap reminder. RES-83 already tracks walk-ins — do not file a duplicate at close-out unless a phase finds a distinct defect.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on `RES-72` (plan: `res-72_floor_chip_details_b676a1c2`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait.
- **Close-out (FIX):** after the loop, delegate `linear-resolver` to post the structured resolution comment only (no workflow-state write).
- **Findings registration:** merge run file if any open lines exist; managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- (filled after Refactor phases)

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-72_floor_chip_details_b676a1c2`: pending

## First Execution Action

- **Managed Cloud one-shot:** after this work-order exists, launch START (`run_in_background: true`; do not wait), apply the spec edit to `docs/specs/scheduling.md`, then delegate Criterion C1 Red.

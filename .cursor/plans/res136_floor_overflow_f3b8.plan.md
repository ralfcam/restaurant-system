# /sdd-to-tdd RES-136 — floor page does not overflow horizontally

Managed Cloud one-shot. `agent/runtime` = `managed`. Branch
`cursor/res-136-f3b8` from `origin/staging`. Ready brief Queue 4
(dispatch 2026-10-07) pre-authorizes the paths in Permissions Requested.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/scheduling.md`, (2) the findings revision pass on
  `docs/findings/runs/res136_floor_overflow_f3b8.md` after every phase
  (and, at close-out, the merge of its open lines into
  `docs/findings/<category>.md` + prune to `archive.md` via `docs-updater`),
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res136_floor_overflow_f3b8.md` after each
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
  `pnpm test:unit tests/unit/floor/schema.test.ts`.
- A skipped suite or `0 tests` is `BLOCKED`, never Red or Green.
- Out-of-scope findings stay on the run-file ledger. Managed Cloud does not
  auto-confirm new Linear finding issues.
- Allowed source edits: `components/staff/floor-plan.tsx`,
  `app/admin/floor/page.tsx`. Do not edit `components/staff/staff-shell.tsx`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res136_floor_overflow_f3b8.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: `restaurant-system V-0.5` (`P-RES-12`), status Backlog
  (nonterminal). Canonical `V-0.5` is the only nonterminal RES version key
  (V-0.1 and V-0.2 are Completed). Precedence: the issue already sits on
  that project.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). The issue is already on
  M4. No move.
- Mixed design + implementation: no. The Ready brief `Decisions:` name the
  rule. RES-137 (mobile Sheet) stays out of scope.
- Clarification: none. No `Clarification required` comment on RES-136.

## Issue & Root Cause (FIX mode only)

- Issue: RES-136 — on `/admin/floor`, the page scrolls sideways at 375px,
  390px, and 1280px. The sidebar and side inspector clip on desktop. The
  sticky "Plan de salle" header covers the inspector, and table chips paint
  over that header.
- Missing constraint (root cause): FP-12 requires the `lg` side inspector
  and the below-`lg` Sheet. It does not require the fixed-pixel canvas
  (`canvas.cols * FLOOR_CELL_PX`, cell 120) to scroll inside the floor grid.
  The canvas wrapper is already `overflow-auto`
  (`components/staff/floor-plan.tsx` around the canvas `ref`), but the grid
  `lg:grid-cols-[1fr_300px]` and its `space-y-6` column use the default
  `min-width: auto`, so the track grows to the canvas min-content and the
  page widens. The canvas is `relative` without `isolate`, so chip `z-10` /
  `z-20` compete with the staff header `md:z-10`. The `lg:block` inspector
  is not sticky, so the header covers it when the page scrolls.
- Spec update proposed: `docs/specs/scheduling.md` FP-12 — add the
  containment and stacking rules below. Do not change the mobile Sheet
  unmount or handler rules. This edit is the first spec action and is
  listed in `## Permissions Requested`.

## Spec

- Source: existing `docs/specs/scheduling.md` (FP-12). No domain hub under
  `docs/specs/domains/`; the Ready brief names this file.
- Summary: FP-12 keeps the mobile-only Sheet. It also requires the floor
  grid to shrink (`min-w-0`) so the canvas scrolls inside `overflow-auto`,
  the canvas wrapper to be `isolate`, and the `lg` inspector to stick below
  the staff header and scroll in its own box.
- Clarifications needed: none. Ready brief decisions resolve them.
- Pre-mortem / inversion: a test that only asserts the existing
  `overflow-auto` class passes while the page still overflows. The
  regression must fail on the missing `min-w-0`. A test that only adds
  `isolate` leaves the inspector scrolling under the header. C2 must fail
  on the missing `lg:sticky` inspector classes.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                                                              | Risk | Layer | Test file                       | New or existing         | Test name                                                                             | Assertion                                                                | Command                                          | Depends on |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------ | ---------- |
| C1  | FP-12 containment: the `lg:grid-cols-[1fr_300px]` element and the main column that wraps the canvas both include `min-w-0`, and the wrapper around the fixed-pixel canvas includes `overflow-auto`, so the canvas scrolls inside the grid instead of widening the page | P1   | unit  | tests/unit/floor/schema.test.ts | existing file, new test | `floor grid shrinks so the fixed canvas scrolls inside the page`                      | See C1 Red. Must fail today because `min-w-0` is absent on that grid     | `pnpm test:unit tests/unit/floor/schema.test.ts` | none       |
| C2  | FP-12 stacking: that same canvas wrapper includes `isolate`, and the desktop side inspector (`lg:block`, the one that renders `staff.floor.selected`) includes `lg:sticky`, an `lg:top-` offset, `lg:max-h-`, `lg:overflow-y-auto`, and `lg:self-start`                | P1   | unit  | tests/unit/floor/schema.test.ts | existing file, new test | `floor canvas stacking stays under the header and the side inspector sticks below it` | See C2 Red. Must fail today because `isolate` and `lg:sticky` are absent | `pnpm test:unit tests/unit/floor/schema.test.ts` | C1         |

Layer is unit source-scan, the same proof FP-12 already uses in this file.
A browser `scrollWidth` check is not in the Ready brief verification command
or allowed test paths. The class contract is what this spec already treats
as the automatable rule.

## Traceability Matrix

| Criterion | Spec ref                        | Test file::name                                                                                     | Source file(s)                  | Risk | Status  |
| --------- | ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------- | ---- | ------- |
| C1        | scheduling.md FP-12 containment | schema.test.ts::floor grid shrinks so the fixed canvas scrolls inside the page                      | components/staff/floor-plan.tsx | P1   | planned |
| C2        | scheduling.md FP-12 stacking    | schema.test.ts::floor canvas stacking stays under the header and the side inspector sticks below it | components/staff/floor-plan.tsx | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Phase command: `pnpm test:unit tests/unit/floor/schema.test.ts`.

## Permissions Requested (before execution)

- Spec edit: `docs/specs/scheduling.md` — add the FP-12 containment and
  stacking sentences. Leave the Sheet unmount and handler sentences intact.
  Align the non-normative FP-12 implementation-trace row with the new
  classes after Green (docs-updater owns the trace refresh if the
  orchestrator spec edit only adds the normative sentences).
- Existing-test edit: `tests/unit/floor/schema.test.ts` — add C1 and C2.
  Do not rewrite the existing FP-12 Sheet tests.
- Allowed source (Green/Refactor only): `components/staff/floor-plan.tsx`,
  `app/admin/floor/page.tsx`.

## TDD Execution Loop

### Criterion C1 — floor grid shrinks so the fixed canvas scrolls inside the page (layer: unit)

- **Red** → Invoke `tdd-red` to add one test named `floor grid shrinks so the fixed canvas scrolls inside the page` in `tests/unit/floor/schema.test.ts`. Read `components/staff/floor-plan.tsx`. Locate `lg:grid-cols-[1fr_300px]` and take that element's `className`. It must include `min-w-0`. From that element, the next `className` (the main column, today `space-y-6`) must also include `min-w-0`. Locate `canvas.cols * FLOOR_CELL_PX` and the parent wrapper's `className`; that wrapper must include `overflow-auto`. Do not edit existing tests. The new test must fail on missing `min-w-0` (the `overflow-auto` class is already present and must not be the only assertion). Run `pnpm test:unit tests/unit/floor/schema.test.ts` and stop on that assertion failure.
- **Green** → Invoke `tdd-green` to add `min-w-0` to the `lg:grid-cols-[1fr_300px]` element and to the main column that wraps the canvas, keeping `overflow-auto` on the canvas wrapper. Stay inside `components/staff/floor-plan.tsx` unless `app/admin/floor/page.tsx` is required for the same containment. Do not edit tests or the spec. Do not restyle the mobile Sheet. Exit: the C1 test passes, executed, and the rest of `tests/unit/floor/schema.test.ts` stays green.
- **Refactor** → Invoke `tdd-refactor` to clean the C1 markup without changing behavior. Exit: `pnpm test:unit tests/unit/floor/schema.test.ts` green, `pnpm lint` 0 warnings, `pnpm typecheck` clean, `pnpm exec prettier --check` on the touched source. Return Suggested review order, Reusable pattern, and Residual findings.

### Criterion C2 — floor canvas stacking stays under the header and the side inspector sticks below it (layer: unit)

- **Red** → Invoke `tdd-red` to add one test named `floor canvas stacking stays under the header and the side inspector sticks below it` in `tests/unit/floor/schema.test.ts`. The canvas wrapper from C1 (the `className` that contains `overflow-auto` and wraps `canvas.cols * FLOOR_CELL_PX`) must also include `isolate`. The desktop inspector is the element whose class contains `lg:block` and whose body renders `staff.floor.selected` (not the mobile Sheet). That element's `className` must include `lg:sticky`, a token matching `lg:top-`, a token matching `lg:max-h-`, `lg:overflow-y-auto`, and `lg:self-start`. Do not edit the C1 test or the Sheet tests. Run `pnpm test:unit tests/unit/floor/schema.test.ts`. The new test must fail because `isolate` and `lg:sticky` are absent.
- **Green** → Invoke `tdd-green` to add `isolate` on that canvas wrapper and `lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:self-start` on the desktop inspector, keeping `hidden` and `lg:block`. Do not edit `components/staff/staff-shell.tsx`, tests, or the spec. Do not change Sheet open/unmount behavior. Exit: C2 and the rest of `tests/unit/floor/schema.test.ts` green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean the C2 markup without changing behavior. Same exit as C1 Refactor.

## Manual-UAT (deferred, not automated)

- none. Viewport `scrollWidth` measurement stays out of this wave because
  the Ready brief verification command is the unit file above.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res136_floor_overflow_f3b8`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res136_floor_overflow_f3b8.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec edit `docs/specs/scheduling.md` | existing-test edit `tests/unit/floor/schema.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res136_floor_overflow_f3b8.plan.md`

Problem: On /admin/floor the page scrolls sideways at 375, 390, and 1280 px, so the sidebar and side inspector clip. The sticky staff header covers the inspector, and table chips paint over the header. FP-12 requires the mobile Sheet and the lg inspector, but it does not require the fixed-pixel canvas to scroll inside the grid or to stay under the header.
Approach: Add those two rules to FP-12 without changing the Sheet unmount or handler contract. One unit scan fails while the floor grid lacks min-w-0. A second fails while the canvas wrapper lacks isolate and the lg inspector lacks lg:sticky. Green adds those classes in floor-plan.tsx. The mobile Sheet and the cover-ceiling field stay out of this wave.
Out-of-scope findings: none

| #   | Criterion                                                                     | Risk | Layer | Test file                       |
| --- | ----------------------------------------------------------------------------- | ---- | ----- | ------------------------------- |
| 1   | Floor grid shrinks so the fixed canvas scrolls inside the page                | P1   | unit  | tests/unit/floor/schema.test.ts |
| 2   | Canvas stacking stays under the header and the side inspector sticks below it | P1   | unit  | tests/unit/floor/schema.test.ts |
```

## Docs Sync

- `start-linear` — first. INPUT: this plan's `## Linear Plan Digest`.
  Task `run_in_background: true`. Do not wait before the spec edit or C1 Red.
- Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
  `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then 4G and 4F.

## Docs sync packet

Filled at close-out (Step 4E). Seed:

```markdown
## Docs sync packet

- plan_slug: res136_floor_overflow_f3b8
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-136
- criteria_shipped: [FP-12 containment, FP-12 stacking]
- criteria_manual_uat: none
- req_ids: []
- source_paths: [components/staff/floor-plan.tsx]
- test_paths: [tests/unit/floor/schema.test.ts]
- architecture_touch: [Floor-Plan]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res136_floor_overflow_f3b8.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none at planning time. The mobile Sheet overlay is RES-137 (Done) and the
cover-ceiling field is RES-141. Both are named out of scope by the Ready
brief. Do not re-file them. `components/staff/staff-shell.tsx` is outside
Allowed edits; the header stays as it is.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-136 (plan:
  `res136_floor_overflow_f3b8`), posting the digest above. Task
  `run_in_background: true`.
- **Close-out:** delegate `linear-resolver` to post the resolution comment
  only. No workflow-state write.
- **Findings:** if the run file is empty at close-out, skip registration.
  Otherwise merge, attach-only, leave new issues on the ledger.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Collated at 4D from the per-criterion Refactor lines.

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res136_floor_overflow_f3b8`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm the guard, launch
  START (`run_in_background: true`; do not wait), apply the FP-12 spec
  sentences, then delegate C1 Red.

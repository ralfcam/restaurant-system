# /sdd-to-tdd RES-137 — mobile inspector overlay unmounts at lg

Managed Cloud one-shot. `agent/runtime` = `managed`. Branch
`cursor/res-137-05b2` from `origin/staging`. Ready brief Queue 3
(dispatch 2026-10-06) pre-authorizes the paths in Permissions Requested.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/scheduling.md`, (2) the findings revision pass on
  `docs/findings/runs/res-137_overlay_unmount_05b2.md` after every phase
  (and, at close-out, the merge of its open lines into
  `docs/findings/<category>.md` + prune to `archive.md` via `docs-updater`),
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-137_overlay_unmount_05b2.md` after each
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
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-137_overlay_unmount_05b2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. Only nonterminal RES version
  project. Team key confirmed `RES`.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Issue already on that
  milestone. No move.
- Mixed design + implementation: no
- Clarification: none. Ready brief Decisions resolve the overlay rule.

## Issue & Root Cause (FIX mode only)

- Issue: RES-137 — at 1023px, open the mobile inspector, close it with Esc,
  then widen to 1024px. Observed: `data-slot="sheet-overlay"` stays in its
  ending style and blocks clicks until reload. Expected: the overlay is gone
  and the floor is interactive. A jump from 375px to 1280px often closes
  cleanly. Intermittent when the close animation meets the breakpoint.
- Missing constraint (root cause): FP-12 forbids an open Sheet and any
  covering `SheetOverlay` at `lg`, including after a resize from below `lg`,
  and says `lg:hidden` on `SheetContent` alone does not satisfy that. It does
  not require the mobile Sheet to leave the React tree. The page always
  mounts `<Sheet>` and puts `lg:hidden` on `SheetContent`, which becomes
  `display: none` on the Base UI popup. That cancels the exit `transitionend`,
  so the sibling overlay (no `lg:hidden`) stays mounted. The resize listener
  only calls `setMobileInspectorOpen(false)`.
- Evidence: `components/staff/floor-plan.tsx` resize effect (~471–480) and
  `<Sheet>` at ~1653 with `className="... lg:hidden"`. `SheetContent` in
  `components/ui/sheet.tsx` applies that class to the popup; `SheetOverlay`
  is a portal sibling. `shouldOpenMobileInspector` in `lib/floor/layout.ts`
  is already `< 1024`. The unit test
  "selecting a table at lg does not open the mobile inspector Sheet" requires
  `lg:hidden` to be present, so it stays green while the overlay can stick.
- Spec update proposed: `docs/specs/scheduling.md` FP-12 — at `lg` and above
  the mobile Sheet is not mounted, including during a close that started
  below `lg`. `lg:hidden` on the mobile `SheetContent` is forbidden.

## Spec

- Source: existing `docs/specs/scheduling.md` criterion FP-12 (hub owner for
  the floor canvas; Ready brief names this path).
- Summary: Desktop (`lg`, 1024px) uses the side inspector. Below `lg`,
  selecting a table opens a bottom Sheet with the same management actions.
  The Sheet must not stay open or cover the page at `lg`, including after a
  resize. This run adds: unmount the Sheet (and therefore
  `data-slot="sheet-overlay"`) whenever the viewport is `lg` or wider.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                                                                                                                                           | Risk | Layer | Test file                         | New or existing                          | Test name                                                 | Assertion                                                                                                                                                           | Command                                          | Depends on |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | --------------------------------- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| C1  | At `lg` and above, including after Esc then a resize across `lg`, the mobile Sheet is not in the tree, so `sheet-overlay` cannot remain mounted. `lg:hidden` on mobile `SheetContent` is forbidden. The Sheet renders only when `shouldOpenMobileInspector(viewportWidth)` is true. | P1   | unit  | `tests/unit/floor/schema.test.ts` | new test; one existing assertion deleted | `mobile Sheet unmounts at lg so the overlay cannot stick` | The `<Sheet`…`</Sheet>` block does not match `lg:hidden`. The source immediately gates that `<Sheet` with `shouldOpenMobileInspector(<ident>)` via `&& (` or `? (`. | `pnpm test:unit tests/unit/floor/schema.test.ts` | none       |

Unit source pin is enough: the defect is which nodes are mounted, and the
Ready brief verification command is this file. No integration or e2e. Shared
`components/ui/sheet.tsx` stays unchanged (not in Allowed edits).

## Traceability Matrix

| Criterion | Spec ref                         | Test file::name                                                                              | Source file(s)                                                                                   | Risk | Status  |
| --------- | -------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---- | ------- |
| C1        | `docs/specs/scheduling.md` FP-12 | `tests/unit/floor/schema.test.ts`::`mobile Sheet unmounts at lg so the overlay cannot stick` | `components/staff/floor-plan.tsx` (reuse `shouldOpenMobileInspector` from `lib/floor/layout.ts`) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Phase command: `pnpm test:unit tests/unit/floor/schema.test.ts`.

## Permissions Requested (before execution)

- Spec edit: `docs/specs/scheduling.md` — add the unmount rule to FP-12 and
  align the FP-12 implementation-trace row with that rule.
- Existing-test edit: `tests/unit/floor/schema.test.ts` — delete only the
  assertion (and its inversion comment) in
  "selecting a table at lg does not open the mobile inspector Sheet" that
  requires `SheetContent` to contain `lg:hidden`. That lock-in keeps the bug
  green. Do not change the other assertions in that test. The new C1 test
  owns the unmount rule.

Ready brief Allowed edits also names `lib/floor/layout.ts` and
`hooks/use-floor-plan.ts`. Do not edit them unless C1 cannot go green by
reusing `shouldOpenMobileInspector` inside `components/staff/floor-plan.tsx`.

## TDD Execution Loop

### Criterion C1 — mobile Sheet unmounts at lg (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `mobile Sheet unmounts at lg so the overlay cannot stick` in
  `tests/unit/floor/schema.test.ts`. It must fail on today's source because
  the Sheet block contains `lg:hidden` and is not gated by
  `shouldOpenMobileInspector`. In the same phase, delete the pre-authorized
  `lg:hidden` presence assertion in the existing lg test so that test still
  passes. Command: `pnpm test:unit tests/unit/floor/schema.test.ts`. Exit:
  the new test fails on an assertion; the suite executes; the old lg test
  still passes.
- **Green** → Invoke `tdd-green` to make that test pass with the smallest
  change in `components/staff/floor-plan.tsx`: track viewport width, render
  the mobile `<Sheet>` only when `shouldOpenMobileInspector(width)` is true,
  remove `lg:hidden` from that `SheetContent`, and keep
  `setMobileInspectorOpen(false)` when the width is `lg` or wider so the
  existing lg test stays green. Do not edit `components/ui/sheet.tsx` or
  tests. Exit: `pnpm test:unit tests/unit/floor/schema.test.ts` green and
  executed.
- **Refactor** → Invoke `tdd-refactor` to clean the viewport/unmount code
  without behavior change and re-verify. Exit: same unit file green,
  `pnpm lint` (0 warnings), `pnpm typecheck`, and
  `pnpm exec prettier --check` on the source files this criterion touched.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-137_overlay_unmount_05b2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-137_overlay_unmount_05b2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec edit `docs/specs/scheduling.md` | existing-test edit `tests/unit/floor/schema.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy res-137_overlay_unmount_05b2.plan.md

Problem: On /admin/floor, closing the mobile inspector with Esc and then widening across lg (1024px) can leave data-slot="sheet-overlay" mounted in its ending style, blocking every click. FP-12 already forbids an open Sheet at lg, but the page still mounts the Sheet at every width and puts lg:hidden on SheetContent. That display:none aborts the Base UI exit transition, so the overlay never unmounts. The missing constraint is that the mobile Sheet must leave the React tree at lg and above, including mid-close.

Approach: Tighten FP-12 so the mobile Sheet renders only when shouldOpenMobileInspector(viewportWidth) is true, and lg:hidden on that SheetContent is forbidden. One unit regression in tests/unit/floor/schema.test.ts fails while the Sheet stays mounted with lg:hidden. Green removes that class and gates the Sheet on the helper. The existing lg test's lock-in of lg:hidden is deleted so it does not require the bug.

Out-of-scope findings: none new (horizontal overflow is RES-136; icon-only steppers already on docs/findings/product-gaps.md)

| #   | Criterion                                               | Risk | Layer | Test file                       |
| --- | ------------------------------------------------------- | ---- | ----- | ------------------------------- |
| 1   | Mobile Sheet unmounts at lg so the overlay cannot stick | P1   | unit  | tests/unit/floor/schema.test.ts |
```

## Docs Sync

- `start-linear` first, background, before the spec edit. INPUT: the digest
  above. Plan slug `res-137_overlay_unmount_05b2`. Do not wait.
- Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
  `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then 4G and 4F.
- `4d-review-trail` INPUT: `docs/verifier-reports/tdd/res-137_overlay_unmount_05b2.md`
  OUTPUT: `## Suggested Review Order (collated)` in that log.
- `4e-traceability` INPUT: the same log. OUTPUT: `## Traceability (final)` and
  `## Run metrics`.
- `4c-findings` INPUT: `docs/findings/runs/res-137_overlay_unmount_05b2.md`.
  If the run file has no open lines, skip merge/register and do not create an
  empty run file.
- `4-format` INPUT: `git status --porcelain` dirty paths. OUTPUT:
  `pnpm exec prettier --write` on those paths (never `.`).

## Out-of-scope findings

- RES-136 horizontal page overflow — already a Todo issue. Do not chase.
- Icon-only seat and expected steppers — already an open line in
  `docs/findings/product-gaps.md`. Do not duplicate.

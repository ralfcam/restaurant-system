# RES-118 standalone reservation widget

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (none this run), (2) the findings revision pass on
  `docs/findings/runs/res-118_standalone_widget_2491.md` after every phase
  (and, at close-out, the merge of its open lines into
  `docs/findings/<category>.md` + prune to `archive.md`), (3) appending
  Refactor close-out sections to
  `docs/verifier-reports/tdd/res-118_standalone_widget_2491.md` after each
  `tdd-refactor` phase, and (4) at close-out, **`## Suggested Review Order (collated)`**,
  **`## Traceability (final)`**, and **`## Run metrics`** in the same tdd log.
  After a spec or living-findings write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees are prettierignored.
- **Every test change** comes from a `tdd-red` Task. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. One
  phase at a time. Do not mark a phase done on subagent assertion alone. The
  target test's pass/fail must be visible in the returned report.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- START is the first execution Task, `run_in_background: true`. Do not wait
  before Criterion 1 Red. FEATURE close-out omits `4b-linear`.
- Arm `node .cursor/hooks/tdd-guard.mjs on` before the first phase Task. Set
  `phase red|green|refactor` before each phase Task and `phase clear` after
  each Refactor. Disarm `off` as the last action.
- Managed Cloud: after close-out, execute `.cursor/commands/commit.md`; on
  PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never
  `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-118_standalone_widget_2491.plan.md`
- Workflow mode: FEATURE
- linear_issue: RES-118

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`d355ac92-faa0-4866-b501-32880e087b91`) — issue already on this nonterminal version project (status Backlog). V-0.1 and V-0.2 are completed and excluded. One canonical `V-0.5` token.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off. This run does not `save_issue` the milestone.
- Mixed design + implementation: no. Governing spec `docs/specs/standalone-reservation-widget.md` is already testable (SW-1–SW-6).
- Clarification: none. Ready brief `Decisions:` is `where to land: staging`.

## Spec

- Source: existing `docs/specs/standalone-reservation-widget.md`
- Summary: Guests open `/[locale]/reserve`. The page centers the existing reservation widget (BW-6/BW-7 stay). Super-admins save nullable editorial text and `show_reservation_phone` (default false) on `restaurant_settings` id 1, the same gate as the hero image. Blank editorial fields and a blank name are omitted. The product name "Restaurant Link" is not that name. Hours come from `operating_windows`. Address and hero image are reused. The phone line renders only when the flag is true and `phone` is non-blank.
- Clarifications needed: none. Pre-mortem: a phone leak when the flag is false is SW-6; rendering `RESTAURANT.name` ("Restaurant Link") is SW-4; hard-coded example sentences are SW-3. No spec edit.

## Acceptance Criteria → Tests

All six criteria are unit tests in one new file. The Ready brief verification command is `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`. Follow the source-reading plus mocked-action style in `tests/unit/floor/cover-capacity.test.ts` and `tests/unit/restaurant-info/actions.test.ts`. Do not edit those existing tests.

Schema columns fold into `supabase/migrations/00000000000000_baseline.sql` only (`ADD COLUMN IF NOT EXISTS`). No new dated migration: there is no production deployment, and the baseline owns `restaurant_settings`.

The public page must not call `getRestaurantInfoBar`. That loader falls back to `RESTAURANT.address` and `RESTAURANT.phone`. This page omits a null address and hides the phone unless `show_reservation_phone` is true and `phone` is non-blank.

| #   | Criterion                 | Risk | Layer | Test file                                             | New or existing | Test name                                   | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Command                                                              | Depends on |
| --- | ------------------------- | ---- | ----- | ----------------------------------------------------- | --------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| 1   | SW-3 Editorial fields     | P0   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-3 super-admin saves editorial fields     | Baseline adds nullable text `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, `closing_message` and `show_reservation_phone BOOLEAN NOT NULL DEFAULT false` on `restaurant_settings`. Guest `GRANT` has no INSERT/UPDATE/DELETE. `updateStandaloneWidgetCopy` calls `requireSuperAdminUser` then `createServiceClient` and upserts `id = 1`. Null user does not upsert. Proxy still sends unauthenticated `/admin` to `/auth/login`. Settings source has `data-testid="widget-page-editor"`. Saved non-blank text is what the page view shows; a blank value omits that block. The three example sentences are absent from `app/`, `components/`, and `lib/`. | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | none       |
| 2   | SW-6 Phone visibility     | P0   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-6 phone hidden unless flag and number    | Default in baseline is false. Render with flag false, or phone null/blank, contains no phone number, phone label, phone icon, or empty phone placeholder. Flag true plus non-blank phone shows that phone. Hours and address nodes stay.                                                                                                                                                                                                                                                                                                                                                                                                                                              | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | SW-3       |
| 3   | SW-4 Name                 | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-4 name is display name or nothing        | Non-blank `restaurant_display_name` renders trimmed. Null or blank renders no restaurant-name node and the string `Restaurant Link` is absent from that place and from the page render.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | SW-3       |
| 4   | SW-1 Public page          | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-1 public reserve page centers the widget | `app/[locale]/reserve/page.tsx` exists and renders `data-testid="standalone-reserve"` around `<ReservationWidget`. The page file does not define a slot generator. Markup is a single column without `md:grid-cols-2`, and a centered `max-w-` column from `md`. The route is not under `/admin`.                                                                                                                                                                                                                                                                                                                                                                                     | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | none       |
| 5   | SW-5 Hero, hours, address | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-5 hero hours and address                 | A set `hero_image_url` renders an image with that src. Null renders no `img` for the hero. Listed hours match the `operating_windows` rows passed in (not a copy field). Non-blank address is shown. Null address omits the address line.                                                                                                                                                                                                                                                                                                                                                                                                                                             | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | SW-3       |
| 6   | SW-2 Booking flow stays   | P2   | unit  | tests/unit/site/standalone-reservation-widget.test.ts | new             | SW-2 existing widget accordions stay        | The reserve page renders `ReservationWidget` and does not reimplement guests/date/time. `components/site/reservation-widget.tsx` still has accordion order guests, then date, then time, plus `data-testid="slot-card"` and `data-testid="slot-group"`.                                                                                                                                                                                                                                                                                                                                                                                                                               | pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts | SW-1       |

## Traceability Matrix

| Criterion | Spec ref                              | Test file::name                                                                                    | Source file(s)                                                                                                                                    | Risk | Status  |
| --------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| SW-3      | standalone-reservation-widget.md SW-3 | tests/unit/site/standalone-reservation-widget.test.ts::SW-3 super-admin saves editorial fields     | app/actions/widget-page.ts, components/staff/widget-page-editor.tsx, app/admin/settings/page.tsx, supabase/migrations/00000000000000_baseline.sql | P0   | planned |
| SW-6      | standalone-reservation-widget.md SW-6 | tests/unit/site/standalone-reservation-widget.test.ts::SW-6 phone hidden unless flag and number    | components/site/standalone-reserve-page.tsx                                                                                                       | P0   | planned |
| SW-4      | standalone-reservation-widget.md SW-4 | tests/unit/site/standalone-reservation-widget.test.ts::SW-4 name is display name or nothing        | components/site/standalone-reserve-page.tsx                                                                                                       | P1   | planned |
| SW-1      | standalone-reservation-widget.md SW-1 | tests/unit/site/standalone-reservation-widget.test.ts::SW-1 public reserve page centers the widget | app/[locale]/reserve/page.tsx, components/site/standalone-reserve-page.tsx                                                                        | P1   | planned |
| SW-5      | standalone-reservation-widget.md SW-5 | tests/unit/site/standalone-reservation-widget.test.ts::SW-5 hero hours and address                 | components/site/standalone-reserve-page.tsx, app/[locale]/reserve/page.tsx                                                                        | P1   | planned |
| SW-2      | standalone-reservation-widget.md SW-2 | tests/unit/site/standalone-reservation-widget.test.ts::SW-2 existing widget accordions stay        | app/[locale]/reserve/page.tsx, components/site/reservation-widget.tsx                                                                             | P2   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: none. The spec already states SW-1–SW-6. Ready brief `Allowed edits` names `docs/specs/standalone-reservation-widget.md`; this run does not change it.
- Existing-test edit: none. The new file is `tests/unit/site/standalone-reservation-widget.test.ts`.

## TDD Execution Loop

### Criterion SW-3 — Editorial fields (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-3 super-admin saves editorial fields` in `tests/unit/site/standalone-reservation-widget.test.ts`. It must fail because `updateStandaloneWidgetCopy` and the editor test id are absent. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to add the baseline columns, `updateStandaloneWidgetCopy` in `app/actions/widget-page.ts` (`requireSuperAdminUser`, `createServiceClient`, upsert `id = 1`, blank text stored as null), `data-testid="widget-page-editor"` on `/admin/settings`, and the minimum page view that shows saved non-blank editorial text and omits blanks. Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-3 without behavior change. Exit: test green, `pnpm lint`, `pnpm typecheck`, and `pnpm exec prettier --check` on touched source.

### Criterion SW-6 — Phone visibility (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-6 phone hidden unless flag and number` in the same file. It must fail because the phone line is missing or always shown. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to render the phone only when `show_reservation_phone` is true and `phone` is non-blank, with no label, icon, or placeholder otherwise, leaving hours and address in place. Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-6. Exit: test green, lint, typecheck, prettier --check on touched source.

### Criterion SW-4 — Name (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-4 name is display name or nothing` in the same file. It must fail because the name is missing or falls back to `Restaurant Link`. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to show the trimmed `restaurant_display_name` and render no restaurant-name node when it is null or blank. Do not use `RESTAURANT.name`. Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-4. Exit: test green, lint, typecheck, prettier --check on touched source.

### Criterion SW-1 — Public page (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-1 public reserve page centers the widget` in the same file. It must fail because `app/[locale]/reserve/page.tsx` is absent. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to add the locale route that renders the existing `ReservationWidget` inside `data-testid="standalone-reserve"`, single column, centered from `md`, with no second slot generator. Unauthenticated guests can open it (no `/admin` gate). Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-1. Exit: test green, lint, typecheck, prettier --check on touched source.

### Criterion SW-5 — Hero, hours, address (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-5 hero hours and address` in the same file. It must fail because hero, hours, or address omission is wrong. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to show `hero_image_url` when set, no broken image when null, hours from the passed `operating_windows` rows, and the address only when non-blank. Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-5. Exit: test green, lint, typecheck, prettier --check on touched source.

### Criterion SW-2 — Booking flow stays (layer: unit)

- **Red** → Use the `tdd-red` subagent to write the failing test `SW-2 existing widget accordions stay` in the same file. It must fail if the page does not render `ReservationWidget` or the widget source loses guests/date/time order or slot cards. Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`.
- **Green** → Use the `tdd-green` subagent to keep the existing widget embed only. Do not add a second slot generator. Exit: that test green and executed.
- **Refactor** → Use the `tdd-refactor` subagent to clean up SW-2. Exit: test green, lint, typecheck, prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-118_standalone_widget_2491`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-118_standalone_widget_2491.md` at close-out.

Mode: FEATURE
Owning spec: `docs/specs/standalone-reservation-widget.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy res-118_standalone_widget_2491.plan.md

Problem: Guests have no standalone `/[locale]/reserve` page, and staff cannot save the restaurant display name, tagline, welcome copy, or closing message. The product name is still the only name, and the reservation phone cannot be hidden independently of hours and address.
Approach: Keep BW-6 and BW-7 on the existing reservation widget. Store the editorial fields and `show_reservation_phone` (default false) on `restaurant_settings` id 1 behind `requireSuperAdminUser` and the service-role client. Omit blank blocks. Never use `RESTAURANT.name` as the restaurant name. Prove SW-1–SW-6 with one unit file.
Out-of-scope findings: none

| #   | Criterion                                   | Risk | Layer | Test file                                             |
| --- | ------------------------------------------- | ---- | ----- | ----------------------------------------------------- |
| 1   | SW-3 super-admin saves editorial fields     | P0   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
| 2   | SW-6 phone hidden unless flag and number    | P0   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
| 3   | SW-4 name is display name or nothing        | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
| 4   | SW-1 public reserve page centers the widget | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
| 5   | SW-5 hero hours and address                 | P1   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
| 6   | SW-2 existing widget accordions stay        | P2   | unit  | tests/unit/site/standalone-reservation-widget.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-118 (plan: `res-118_standalone_widget_2491`), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before SW-3 Red. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos:

- `4d-review-trail` — INPUT: `docs/verifier-reports/tdd/res-118_standalone_widget_2491.md`. OUTPUT: `## Suggested Review Order (collated)` in that log.
- `4e-traceability` — INPUT: the same log. OUTPUT: `## Traceability (final)` and `## Run metrics`.
- `4-docs-packet` — assemble the Docs sync packet in thread.
- `4-docs-updater` — Use the `docs-updater` subagent to sync docs using that packet.
- `4c-findings` — INPUT: `docs/findings/runs/res-118_standalone_widget_2491.md`. Merge open lines, then register. Skip register only if the ledger is empty.
- `4-format` — INPUT: dirty paths from `git status --porcelain`. OUTPUT: `pnpm exec prettier --write` on those paths (never `.`). Then STEP 4G, then STEP 4F.

## Docs sync packet

- plan_slug: res-118_standalone_widget_2491
- spec: docs/specs/standalone-reservation-widget.md
- mode: FEATURE
- linear_issue: RES-118
- criteria_shipped: [SW-3, SW-6, SW-4, SW-1, SW-5, SW-2]
- criteria_manual_uat: none
- req_ids: [SW-1, SW-2, SW-3, SW-4, SW-5, SW-6]
- source_paths: [app/actions/widget-page.ts, app/[locale]/reserve/page.tsx, components/site/standalone-reserve-page.tsx, components/staff/widget-page-editor.tsx, app/admin/settings/page.tsx, supabase/migrations/00000000000000_baseline.sql]
- test_paths: [tests/unit/site/standalone-reservation-widget.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-118_standalone_widget_2491.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |
| none    |                        |                |          |          |

Homepage hero copy replacement, a second hero upload, and a booking-flow rewrite stay out of this spec (already written in the design plan). They are not new findings.

## Linear Close-out & Findings Registration

- **START:** Invoke `linear-resolver` to start work on RES-118 (plan: `res-118_standalone_widget_2491`), posting the digest above. Task `run_in_background: true`. Do not wait before SW-3 Red.
- **Close-out:** omit (`FEATURE`).
- **Findings registration:** only if the run file or active ledger has open lines.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- filled at close-out from the tdd log

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-118_standalone_widget_2491`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Launch START (`run_in_background: true`; do not wait). No spec edit. Delegate SW-3 Red.

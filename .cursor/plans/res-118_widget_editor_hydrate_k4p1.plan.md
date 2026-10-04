# FIX res-118_widget_editor_hydrate_k4p1

Mode: FIX (free-text). Invocation: `/sdd-to-tdd all` = the two `/ready-merge-release 159` routes. No Linear ID, so skip START and CLOSE-OUT. Stay on `cursor/res-118-2491`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under `docs/specs/**` (the exact path in `## Permissions Requested`), (2) the findings revision pass on `docs/findings/runs/<plan-slug>.md` after every phase, (3) appending Refactor close-out sections to `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase, and (4) at close-out, `## Suggested Review Order (collated)`, `## Traceability (final)`, and `## Run metrics`. After a spec write, `pnpm exec prettier --write` that file. Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change** from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. One phase at a time.
- **Never pass `model` on Task.**
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`, `src/**`, or `supabase/**` yourself.

## Rejected route

`loc-159-m8q2` (Major, `cr-comment:v1:ad7739db4a8c93d991543ced`) asks for a dated forward migration. Rejected. `supabase/migrations/00000000000000_baseline.sql` already adds the six columns with `ADD COLUMN IF NOT EXISTS`. `.cursor/rules/supabase-migrations.mdc` allows a dated file only when the change cannot be idempotent and must run on an already-deployed environment. `.cursor/rules/pre-production-status.mdc` says there is no production deployment. Do not add a dated migration and do not add a spec rule that requires one.

## Hypothesis

`components/staff/widget-page-editor.tsx` renders uncontrolled inputs with no `defaultValue` or `defaultChecked`. `app/admin/settings/page.tsx` mounts `<WidgetPageEditor />` without loading `restaurant_settings`. Submit always sends the current (empty) fields, and `updateStandaloneWidgetCopy` stores blank text as null and a missing checkbox as `show_reservation_phone: false`. An unedited save clears row `id = 1`.

## Spec rule to add

Owning spec: `docs/specs/standalone-reservation-widget.md`. New criterion **SW-7**. The settings editor must show the saved row and an unedited save must write those same values back.

## Permissions Requested

- `docs/specs/standalone-reservation-widget.md` — add SW-7 only. Do not rewrite SW-1–SW-6.
- No existing-test edits. One new `it` in `tests/unit/site/standalone-reservation-widget.test.ts`.

## Linear Plan Digest

Problem: Reloading `/admin/settings` shows an empty widget editor. Saving again clears stored editorial copy and turns the phone flag off.
Approach: Load `restaurant_settings` id 1 on the settings page and pass those values as the editor's initial input and checkbox state.
Out-of-scope findings: dated forward migration (rejected by migration and pre-production rules).
Owning spec: `docs/specs/standalone-reservation-widget.md`
Full plan: not posted to Linear (size-bounded digest) · local copy res-118_widget_editor_hydrate_k4p1.plan.md

## Criterion SW-7 — P0

The `/admin/settings` editor shows the saved `restaurant_settings` id 1 values. Null text is an empty input. `show_reservation_phone` true checks the box; false leaves it unchecked. Those initial values are what a submit would send, so an unedited save does not clear copy or the flag.

Test file: `tests/unit/site/standalone-reservation-widget.test.ts`
Test name: `SW-7 settings editor shows saved copy and the phone flag`
Command: `pnpm test:unit tests/unit/site/standalone-reservation-widget.test.ts`

Assertions (one new `it`; do not edit the existing tests):

- `app/admin/settings/page.tsx` reads `restaurant_settings` and passes `restaurant_display_name`, `tagline`, `welcome_title`, `welcome_message`, `closing_message`, and `show_reservation_phone` into `WidgetPageEditor`.
- Render `WidgetPageEditor` with `restaurant_display_name: "Chez Camille"`, `tagline: "Seasonal table"`, `welcome_title: null`, `welcome_message: ""`, `closing_message: "See you"`, `show_reservation_phone: true`. The display-name input's value is `Chez Camille`. The welcome-title and welcome-message inputs are empty. The closing-message input's value is `See you`. The `show_reservation_phone` checkbox is checked.
- The same render with `show_reservation_phone: false` leaves that checkbox unchecked.

Layer: unit. No integration.

## TDD loop

1. Invoke `tdd-red` for SW-7. Exit: the new test fails on an assertion; the existing tests still pass.
2. Invoke `tdd-green` for SW-7. Exit: all tests in the file pass; typecheck passes. Do not add a dated migration. Do not change `updateStandaloneWidgetCopy`'s blank-to-null behavior.
3. Invoke `tdd-refactor` for SW-7. Exit: same tests, lint, and typecheck pass.

## Close-out

Skip START and 4B. After refactor: tdd log, docs sync, ledger-apply to archive the open product-gap "Blank form wipes saved widget copy and the phone flag" as resolved if the editor now hydrates. Then format, advisory CodeRabbit, commit, push. Never `gh pr ready` or `gh pr merge`.

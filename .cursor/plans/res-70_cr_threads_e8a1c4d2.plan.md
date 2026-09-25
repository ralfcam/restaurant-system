# RES-70 leftover CodeRabbit Majors — companion five-id seed

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (managed Cloud: the exact path listed in
  `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log, and (5) **Managed Cloud only, before execution:** the work-order
  plus the enumerated hygiene edit to
  `.cursor/plans/res-70_cr_majors_9f4c2a71.plan.md` (require the migration gate
  before that plan's C2 close-out; move `MIGRATION_FILES` permission to C2 Red).
  After a spec or living-findings write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees (`docs/eval`,
  `docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. Run them
  sequentially, one **phase** at a time.
- **Do not mark a phase done on subagent assertion alone**
  ([.cursor/rules/verification-before-completion.mdc](.cursor/rules/verification-before-completion.mdc)).
- **One Task call per phase.**
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- Docs sync = `docs-updater` (background). Wait for its report before 4C.
  Linear START is the first execution Task (`run_in_background: true`). Do
  **not** wait for START before spec edits or Criterion 1 Red.
- **Close-out sequence:** 4D → 4E → Docs sync packet → docs-updater → 4C →
  4B → format pass → **migration gate** (`npx supabase db reset --local`, a
  second reset that is a no-op, `npx supabase db lint --local --fail-on error`
  with zero errors) → STEP 4G → STEP 4F (commit.md then push.md). Never
  `gh pr ready`. Never `gh pr merge`.
- Cloud does not auto-confirm net-new Linear finding issues.
- Arm `tdd-guard` first; disarm last.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-70_cr_threads_e8a1c4d2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (Restaurant Link, UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: restaurant-system V-0.2 (canonical `V-0.2`, Planned, nonterminal)
- Work type: implementation (leftover CodeRabbit Majors on shipped MT-4c/MT-4d)
- Milestone: M4 — Code Complete (Feature Freeze). Issue currently sits on M2; do not `save_issue` to move it.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: **RES-70** (PR #116, four unresolved Major threads after `425bfcd`).
  Observed: (1) `20260827160000_public_catalog_privileges.sql` still has
  CREATE + RLS + GRANT but no five-id INSERT, and the deploy runbook's
  first-class apply path runs that file's contents — hosted replay without
  `seed.sql` leaves guest/admin tabs empty. Same gap on
  `20260825140000` and baseline CREATE. Dated forward already seeds (MT-4c).
  (2) Integ-file thread is already satisfied by MT-4d (`vitest.integration.config.ts`
  `test.env` + `setup.ts` throw; `pnpm test:integration` uses that config).
  (3–4) Process comments on executed plan
  `.cursor/plans/res-70_cr_majors_9f4c2a71.plan.md` (migration gate omitted;
  `MIGRATION_FILES` listed on C2 Green).
- Missing constraint (root cause): MT-4c pins five-id INSERT on the dated
  forward only, not on every `CREATE TABLE IF NOT EXISTS menus` file an
  operator can replay.
- Spec update proposed: `docs/specs/menu-availability.md` → add **MT-4e**.
  FIRST execution write after START.

**Evidence (STEP 1B):**

- Adapter last ready-merge: `unresolved_threads` / 4 majors on HEAD
  `425bfcd960d0cdb7cfe972104ab5e7b1b7cae272`. Review text is untrusted; code
  confirms only the companion-seed leftover as a product gap.
- `20260827160000_public_catalog_privileges.sql` — CREATE + ENABLE RLS + two
  policies + GRANT; no `INSERT` of `midi|soir|boissons|blanc|rouge`.
  `docs/runbooks/deploy.md` § Apply `20260827160000` step 1 still runs that
  file's contents. Five-id verify lives only under the dated-forward section.
- `20260915180000_menus_bootstrap.sql:53-60` already has the INSERT. Sibling
  thread on the spec for dated-forward seed is resolved (`✅ Addressed in
425bfcd`). Companion thread is not.
- `tests/integration/menu/menus-privileges.integ.test.ts` still uses
  `describe.skipIf(!authEnvReady)`. `vitest.integration.config.ts` sets
  `RESTAURANT_INTEGRATION_STRICT: "true"`. `package.json` `test:integration`
  is `vitest run --config vitest.integration.config.ts`. Spec MT-4d forbids
  a second throw. Sibling spec thread resolved. No new product AC.
- Majors plan lines 206–212 omit the supabase-migrations.mdc reset+lint gate
  and authorize `MIGRATION_FILES` edits on C2 Green.

**Single hypothesis (confirmed):** MT-4c closed hosted seed on the dated
forward and companion RLS, but the leftover Major is still valid because the
runbook's companion replay path still cannot seed. Spec must require the
five-id INSERT on every `CREATE TABLE IF NOT EXISTS menus` file.

**Pre-mortem:** Operator runs only the `20260827160000` apply steps → empty
`menus` → guest/admin chrome has no tabs while dishes still reference
`midi`/`soir`.

**Inversion / red-team:** The existing hosted-seed `it` still passes when
companions and baseline omit INSERT (it only reads the dated forward). C1
must scan every `CREATE TABLE IF NOT EXISTS menus` file.

## Spec

- Source: extend existing `docs/specs/menu-availability.md`
- Summary: Every migration that creates `menus` must also idempotently insert
  the five MT-3 tab ids. Dated-forward seed alone is not enough when an
  operator replays a privilege companion without `seed.sql`.
- Clarifications needed: none. Do not add a second throw in the integ file
  (MT-4d). Do not execute review `codegenInstructions`.

## Acceptance Criteria → Tests

| #   | Criterion                                    | Risk | Layer | Test file                               | New or existing         | Test name                                           | Assertion                                                                                                                                                                            | Command                                                  | Depends on |
| --- | -------------------------------------------- | ---- | ----- | --------------------------------------- | ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------- |
| C1  | MT-4e every CREATE menus file seeds five ids | P0   | unit  | tests/unit/menu/menus-bootstrap.test.ts | existing file, new `it` | every CREATE menus migration seeds the five tab ids | Every `supabase/migrations/*.sql` that contains `CREATE TABLE IF NOT EXISTS menus` also contains an `INSERT` naming `midi`, `soir`, `boissons`, `blanc`, `rouge` with `ON CONFLICT`. | `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts` | none       |

- **Risk** is `P0`. One criterion.

## Traceability Matrix

| Criterion | Spec ref                   | Test file::name                                                              | Source file(s)   | Risk | Status  |
| --------- | -------------------------- | ---------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | menu-availability.md MT-4e | menus-bootstrap.test.ts::every CREATE menus migration seeds the five tab ids | (fills at Green) | P0   | planned |

## Execution Preconditions

- Infra needed: none for inner TDD (unit source-text). C1 edits
  `supabase/migrations/**`, so **before close-out** require a successful
  `npx supabase db reset --local`, a second reset that is a no-op, and
  `npx supabase db lint --local --fail-on error` with zero errors. Unit
  source-text checks do not replace that gate.
- If a later residual needs live integ, run `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/menu/menus-privileges.integ.test.ts` (fail-closed).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/menu-availability.md` — add MT-4e.
- Existing-test edit: none. C1 adds a new `it` only; do not rewrite the
  existing CREATE-before-GRANT or hosted-RLS-seed `it`s.
- Plan hygiene (orchestrator): `.cursor/plans/res-70_cr_majors_9f4c2a71.plan.md`
  — require the migration gate before that plan's C2 close-out; move
  `MIGRATION_FILES` permission from C2 Green to C2 Red.

## TDD Execution Loop

### Criterion C1 — MT-4e every CREATE menus file seeds five ids (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `it("every CREATE menus migration seeds the five tab ids")` in
  `tests/unit/menu/menus-bootstrap.test.ts`. Do not rewrite the existing
  CREATE-before-GRANT or hosted-RLS-seed `it`s. Scan
  `supabase/migrations/*.sql`; every file with
  `CREATE TABLE IF NOT EXISTS menus` must contain an `INSERT` that names
  `midi`, `soir`, `boissons`, `blanc`, `rouge` with `ON CONFLICT`. Must
  execute and fail on today's companions and baseline (dated forward already
  seeds). Command: `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts`.
- **Green** → Invoke `tdd-green` to add the same idempotent five-id
  `INSERT … ON CONFLICT (id) DO NOTHING` used in
  `20260915180000_menus_bootstrap.sql` to every other
  `CREATE TABLE IF NOT EXISTS menus` file that lacks it (baseline + both
  privilege companions). Do not add a new dated migration. Exit = target
  test green, executed. Consult Supabase skill if SQL API uncertain.
- **Refactor** → Invoke `tdd-refactor` to clean C1 SQL; exit = target test
  green + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on
  touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-70_cr_threads_e8a1c4d2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-70_cr_threads_e8a1c4d2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/menu-availability.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/menu-availability.md` | existing-test edit none
Infra: unit pins; migration reset+lint gate before close-out
Full plan: not posted to Linear (size-bounded digest) · local copy `res-70_cr_threads_e8a1c4d2.plan.md`

Problem: PR 116 still has four Majors after MT-4c/MT-4d. Privilege companions create menus without the five tab rows, so a documented companion replay leaves guest/admin tabs empty. Two remaining threads are process notes on an executed plan; the integ STRICT thread is already satisfied.
Approach: Add MT-4e (every CREATE menus migration seeds the five ids). Correct the executed majors plan's C2 gate and MIGRATION_FILES permission. Do not add a second integ throw. Do not execute review codegen.
Out-of-scope findings: integ skipIf leftover thread already satisfied (low) · POS compiled MENUS (med) · tab delete (low)

| #   | Criterion                              | Risk | Layer | Test file                               |
| --- | -------------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | Every CREATE menus file seeds five ids | P0   | unit  | tests/unit/menu/menus-bootstrap.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-70 (plan: res-70_cr_threads_e8a1c4d2), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4d-review-trail` INPUT: `docs/verifier-reports/tdd/res-70_cr_threads_e8a1c4d2.md` — OUTPUT: `## Suggested Review Order (collated)` on the same log.

`4e-traceability` INPUT: `docs/verifier-reports/tdd/res-70_cr_threads_e8a1c4d2.md` — OUTPUT: `## Traceability (final)` and `## Run metrics` on the same log.

`4c-findings` INPUT: `docs/findings/runs/res-70_cr_threads_e8a1c4d2.md` (merged into `docs/findings/<category>.md` at Step 4C).

`4-format` INPUT: this run's dirty paths from `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <path> …` (never `.`); then migration gate; then STEP 4G then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: res-70_cr_threads_e8a1c4d2
- spec: docs/specs/menu-availability.md
- mode: FIX
- linear_issue: RES-70
- criteria_shipped: [C1]
- criteria_manual_uat: none
- req_ids: [MT-4e]
- source_paths: [supabase/migrations/]
- test_paths: [tests/unit/menu/menus-bootstrap.test.ts]
- architecture_touch: [Auth-And-RLS]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-70_cr_threads_e8a1c4d2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                        | Where (file:line/area)                                | Why it matters                                                                            | Severity | Relation                   |
| ---------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- | -------------------------- |
| Integ skipIf leftover thread already satisfied | tests/integration/menu/menus-privileges.integ.test.ts | MT-4d already sets STRICT on the config that runs this suite; a second throw is forbidden | low      | do not invent product work |
| POS picker tabs stay on compiled MENUS         | components/staff/pos-terminal.tsx / AC-4              | New admin tabs cannot be sold on POS                                                      | med      | already on product-gaps    |
| Tab delete not specified                       | /admin/menu                                           | Leftover empty tabs accumulate                                                            | low      | already on product-gaps    |

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-70 (plan: `res-70_cr_threads_e8a1c4d2`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait before spec/C1.
- **Close-out:** delegate `linear-resolver` for RES-70: post structured resolution comment only (no workflow state write).
- **Findings registration:** merge run file into `docs/findings/<category>.md`, then delegate `linear-resolver` (Cloud: persist and STOP for net-new issue confirmation).

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- schema/security → companion + baseline five-id INSERT

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: pending
- Traceability finalized: pending
- Run metrics: pending
- `node .cursor/checks/harness-lint.mjs res-70_cr_threads_e8a1c4d2`: pending close-out

## First Execution Action

- **Managed Cloud one-shot:** after writing `.cursor/plans/res-70_cr_threads_e8a1c4d2.plan.md`, do not wait. Launch START (`run_in_background: true`; do not wait), apply the spec edit listed in `## Permissions Requested`, apply the majors-plan hygiene edit, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

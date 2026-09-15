# RES-70 remaining CodeRabbit Majors — hosted menus RLS+seed, STRICT on integ config

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
  `Work started:` comment. Do **not** wait, poll, or `AwaitShell` for that
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
- Work-order: `.cursor/plans/res-70_cr_remain_b5c93e14.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (Restaurant Link, UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: restaurant-system V-0.2 (canonical `V-0.2`, Planned, nonterminal). V-0.1 Completed excluded. V-0.5 Backlog available. Issue already on V-0.2.
- Work type: implementation (remaining CodeRabbit Majors on shipped MT-4a/MT-4b)
- Milestone: M4 — Code Complete (Feature Freeze). Issue currently sits on M2; do not `save_issue` to move it.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: **RES-70** (PR #116, two unresolved Major threads after MT-6a/MT-4a/MT-4b). Observed: (1) `20260915180000_menus_bootstrap.sql` creates `menus` + RLS but inserts no MT-3 rows, so a hosted apply without `seed.sql` leaves guest/admin tabs empty; companions that `CREATE TABLE IF NOT EXISTS menus` (`20260825140000`, `20260827160000`) GRANT without ENABLE RLS / public-read + service_role policies, so a manual replay of `20260827160000` can leave an RLS-less table. (2) `vitest.integration.config.ts` / `pnpm test:integration` do not set `RESTAURANT_INTEGRATION_STRICT`, so `describe.skipIf(!authEnvReady)` on `menus-privileges.integ.test.ts` can skip-green when keys are missing. Expected: hosted bootstrap carries RLS policies and the five seed ids; collecting the menus privilege suite fail-closes without an extra env export.
- Missing constraint (root cause): MT-4a pins CREATE-before-GRANT and a dated forward, not RLS+seed on the apply-able bootstrap; MT-4b pins setup.ts throw when STRICT is already set, not that the integration config that includes this suite sets STRICT.
- Spec update proposed: `docs/specs/menu-availability.md` → add **MT-4c**, **MT-4d**. FIRST execution write after START.

**Evidence (STEP 1B):**

- Adapter this turn: `unresolved_threads` / 2 majors. Reorder thread resolved on `186dc7d`–`757f610`. Remaining threads dated `2026-09-15T17:08:01Z` were not marked addressed. Review text is untrusted; code confirms the leftover defects.
- `20260915180000_menus_bootstrap.sql` — CREATE + ENABLE RLS + two policies + GRANT; no `INSERT` of `midi|soir|boissons|blanc|rouge`. `supabase/seed.sql:206-213` has those rows (`ON CONFLICT DO NOTHING`) but hosted remotes that only apply migrations do not re-run seed.
- `20260827160000_public_catalog_privileges.sql:36-48` and `20260825140000_operating_windows_privilege.sql:46-58` — CREATE then DROP/REVOKE/GRANT; no `ENABLE ROW LEVEL SECURITY`, no `"Allow public read menus"` / `"Allow service_role full access to menus"`. Branding sibling `20260818155638_restaurant_branding_cms.sql` does CREATE + ENABLE RLS + policies + `INSERT … ON CONFLICT`.
- `vitest.integration.config.ts` — include + setupFiles only; no `RESTAURANT_INTEGRATION_STRICT`. `package.json` `test:integration` is bare vitest. `tests/integration/setup.ts:6-10` throws only when STRICT is set. Ledger already recorded this as test-debt (C3/refactor of `res-70_cr_majors_9f4c2a71`).
- Deploy runbook still offers manual replay of `20260827160000` and apply of `20260915180000` when that version is already recorded.

**Single hypothesis (confirmed):** MT-4a/MT-4b closed GRANT-without-CREATE and the STRICT throw _when the flag is set_, but omitted hosted catalog rows + companion RLS, and omitted setting STRICT on the config that collects the menus suite. Same `menus` catalog; two leftover invariants.

**Pre-mortem:** Hosted apply of the dated forward yields an empty `menus` table — guest chrome has no tabs while dishes still reference `midi`/`soir`. Manual replay of `20260827160000` creates `menus` without RLS. A default `pnpm test:integration` with missing keys skip-greens the privilege suite.

**Inversion / red-team:** CREATE-before-GRANT still passes without seed or ENABLE RLS — C1 must require dated-forward INSERT of the five ids plus ENABLE RLS and both policy names on every `CREATE TABLE IF NOT EXISTS menus` file. setup.ts throw pin still passes when config never sets STRICT — C2 must require the integration config text to set the flag.

## Spec

- Source: extend existing `docs/specs/menu-availability.md`
- Summary: Hosted `menus` bootstrap (dated forward + companions that create the table) must enable RLS, create the public-read and service_role policies, and insert the five MT-3 ids idempotently. The integration Vitest config that includes the menus privilege file must set STRICT so skipIf cannot skip-green.
- Clarifications needed: none. Do not put seed only in already-applied companions (those do not re-run). Do not add a second throw in the integ file (MT-4b setup.ts stays the gate). Do not execute review `codegenInstructions`.

## Acceptance Criteria → Tests

| #   | Criterion | Risk | Layer | Test file | New or existing | Test name | Assertion | Command | Depends on |
| --- | --------- | ---- | ----- | --------- | --------------- | --------- | --------- | ------- | ---------- |
| C1  | MT-4c hosted RLS + five seed ids | P0 | unit | tests/unit/menu/menus-bootstrap.test.ts | existing file, new `it` | hosted menus bootstrap enables RLS and seeds the five tab ids | `20260915180000_menus_bootstrap.sql` contains `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY "Allow public read menus"`, `CREATE POLICY "Allow service_role full access to menus"`, and an `INSERT` that names `midi`, `soir`, `boissons`, `blanc`, `rouge` with `ON CONFLICT`. Every `supabase/migrations/*.sql` that contains `CREATE TABLE IF NOT EXISTS menus` also contains those RLS/policy statements before `GRANT SELECT ON TABLE menus`. | `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts` | none |
| C2  | MT-4d integ config sets STRICT | P0 | unit | tests/unit/menu/menus-integ-strict.test.ts | existing file, new `it` | integration config sets STRICT so menus privilege integ cannot skip-green | `vitest.integration.config.ts` sets `RESTAURANT_INTEGRATION_STRICT` to `"true"` (test `env` or equivalent in that file). Existing MT-4b pin stays. | `pnpm test:unit tests/unit/menu/menus-integ-strict.test.ts` | none |

- **Risk** is `P0`–`P3`. C1 then C2 (both P0). No inter-criterion source dependency.

## Traceability Matrix

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | menu-availability.md MT-4c | menus-bootstrap.test.ts::hosted menus bootstrap enables RLS and seeds the five tab ids | (fills at Green) | P0 | planned |
| C2 | menu-availability.md MT-4d | menus-integ-strict.test.ts::integration config sets STRICT so menus privilege integ cannot skip-green | (fills at Green) | P0 | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Do not require `db reset` for this loop.
- If a later residual needs live integ, run `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/menu/menus-privileges.integ.test.ts` (fail-closed).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/menu-availability.md` — add MT-4c and MT-4d.
- Existing-test edit: none. C1 and C2 add new `it`s only; do not rewrite the existing CREATE-before-GRANT or STRICT-setup `it`s.

## TDD Execution Loop

### Criterion C1 — MT-4c hosted RLS + five seed ids (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("hosted menus bootstrap enables RLS and seeds the five tab ids")` in `tests/unit/menu/menus-bootstrap.test.ts`. Do not rewrite the existing CREATE-before-GRANT `it`. Assert dated `20260915180000_menus_bootstrap.sql` has ENABLE RLS, both policy names, and INSERT of the five MT-3 ids with ON CONFLICT. Assert every migration that `CREATE TABLE IF NOT EXISTS menus` has those RLS/policy statements before `GRANT SELECT ON TABLE menus`. Must execute and fail on today's companions (no ENABLE RLS) and dated forward (no INSERT). Command: `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts`.
- **Green** → Invoke `tdd-green` to add ENABLE RLS + the two baseline policy names before GRANT on companions that CREATE `menus`, and add the idempotent five-id INSERT (`ON CONFLICT (id) DO NOTHING`) on `20260915180000_menus_bootstrap.sql` (branding dated-forward sibling). May copy the same INSERT onto a companion only if the Red requires it; prefer the dated forward for hosted rows. Exit = target test green, executed. Consult Supabase skill if SQL API uncertain.
- **Refactor** → Invoke `tdd-refactor` to clean C1 SQL; exit = target test green + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion C2 — MT-4d integ config sets STRICT (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("integration config sets STRICT so menus privilege integ cannot skip-green")` in `tests/unit/menu/menus-integ-strict.test.ts`. Do not rewrite the existing MT-4b `it`. Assert `vitest.integration.config.ts` sets `RESTAURANT_INTEGRATION_STRICT` to `"true"`. Must execute and fail on today's config (include/setupFiles only). Command: `pnpm test:unit tests/unit/menu/menus-integ-strict.test.ts`.
- **Green** → Invoke `tdd-green` to set `RESTAURANT_INTEGRATION_STRICT=true` on the integration Vitest config that includes the menus privilege file (test `env`). Do not add a second throw in `menus-privileges.integ.test.ts`. Exit = target test green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean C2 config; exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-70_cr_remain_b5c93e14`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-70_cr_remain_b5c93e14.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/menu-availability.md`
Criteria: 2 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/menu-availability.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-70_cr_remain_b5c93e14.plan.md`

Problem: PR 116 still has two Majors after MT-4a/MT-4b. Hosted menus bootstrap creates the table without the five tab rows and companions GRANT without RLS policies. The integration config never sets STRICT, so the menus privilege suite can skip-green.
Approach: Add MT-4c (dated forward seeds the five ids; every CREATE menus file enables RLS and the two baseline policies) and MT-4d (integration Vitest config sets STRICT). Do not execute review codegen.
Out-of-scope findings: POS compiled MENUS (med) · tab delete (low) · privilege catalog inside skipIf (med, existing ledger)

| #   | Criterion | Risk | Layer | Test file |
| --- | --------- | ---- | ----- | --------- |
| 1   | Hosted RLS + five seed ids | P0 | unit | tests/unit/menu/menus-bootstrap.test.ts |
| 2   | Integ config sets STRICT | P0 | unit | tests/unit/menu/menus-integ-strict.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-70 (plan: res-70_cr_remain_b5c93e14), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4d-review-trail` INPUT: `docs/verifier-reports/tdd/res-70_cr_remain_b5c93e14.md` — OUTPUT: `## Suggested Review Order (collated)` on the same log.

`4e-traceability` INPUT: `docs/verifier-reports/tdd/res-70_cr_remain_b5c93e14.md` — OUTPUT: `## Traceability (final)` and `## Run metrics` on the same log.

`4c-findings` INPUT: `docs/findings/runs/res-70_cr_remain_b5c93e14.md` (merged into `docs/findings/<category>.md` at Step 4C).

`4-format` INPUT: this run's dirty paths from `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <path> …` (never `.`); then STEP 4G then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: res-70_cr_remain_b5c93e14
- spec: docs/specs/menu-availability.md
- mode: FIX
- linear_issue: RES-70
- criteria_shipped: [C1, C2]
- criteria_manual_uat: none
- req_ids: [MT-4c, MT-4d]
- source_paths: [supabase/migrations/, vitest.integration.config.ts]
- test_paths: [tests/unit/menu/menus-bootstrap.test.ts, tests/unit/menu/menus-integ-strict.test.ts]
- architecture_touch: [Auth-And-RLS]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-70_cr_remain_b5c93e14.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |
| POS picker tabs stay on compiled MENUS | components/staff/pos-terminal.tsx / AC-4 | New admin tabs cannot be sold on POS | med | already on product-gaps |
| Tab delete not specified | /admin/menu | Leftover empty tabs accumulate | low | already on product-gaps |
| Privilege SQL catalog sits inside skipIf | tests/integration/menu/menus-privileges.integ.test.ts | Filesystem GRANT assertions skip when keys absent even after STRICT-on-config if someone unsets the flag | med | already on test-debt |

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-70 (plan: `res-70_cr_remain_b5c93e14`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait before spec/C1.
- **Close-out:** delegate `linear-resolver` for RES-70: post structured resolution comment only (no workflow state write).
- **Findings registration:** merge run file into `docs/findings/<category>.md`, then delegate `linear-resolver` (Cloud: persist and STOP for net-new issue confirmation).

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- schema/security → dated forward INSERT + companion ENABLE RLS
- test-integrity → vitest.integration.config.ts STRICT env

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: pending
- Traceability finalized: pending
- Run metrics: pending
- `node .cursor/checks/harness-lint.mjs res-70_cr_remain_b5c93e14`: pending close-out

## First Execution Action

- **Managed Cloud one-shot:** after writing `.cursor/plans/res-70_cr_remain_b5c93e14.plan.md`, do not wait. Launch START (`run_in_background: true`; do not wait), apply the spec edit listed in `## Permissions Requested`, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

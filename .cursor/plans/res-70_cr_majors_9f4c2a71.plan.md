# RES-70 CodeRabbit Majors — atomic reorder, forward menus bootstrap, STRICT fail-closed

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
- Work-order: `.cursor/plans/res-70_cr_majors_9f4c2a71.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (Restaurant Link)
- Project: restaurant-system V-0.2 (canonical `V-0.2`, Planned, nonterminal)
- Work type: implementation (CodeRabbit Major follow-up on shipped MT-*)
- Milestone: M4 — Code Complete (Feature Freeze). Do not `save_issue` to move it.
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: **RES-70** (PR #116 US latest-head, 3 unresolved Major threads). Observed: (1) `reorderMenuTabs` issues N untransactional `UPDATE`s so a mid-list failure can persist a torn `sort_order`; (2) privilege companions `GRANT`/`REVOKE` on `menus` without `CREATE TABLE`, so an already-applied hosted baseline that lacked `menus` cannot grow the table; (3) menus privilege integ uses `describe.skipIf(!authEnvReady)` and is only fail-closed because `tests/integration/setup.ts` throws under `RESTAURANT_INTEGRATION_STRICT`. Expected: one validated reorder operation; every GRANT/REVOKE migration bootstraps `menus`; STRICT + missing auth env fails this suite (not skip).
- Missing constraint (root cause): MT-6 pins final list order only; MT-4 pins privileges in baseline + companions but not CREATE-before-GRANT on those companions or a forward file for already-applied DBs; no AC pins that the menus integ file is covered by the STRICT throw.
- Spec update proposed: `docs/specs/menu-availability.md` → add **MT-6a**, **MT-4a**, **MT-4b**. FIRST execution write after START.

**Evidence (STEP 1B):**

- Adapter this turn: `unresolved_threads` / 3 majors on `fc41f1dc` (`app/actions/menu.ts`, `20260827160000_public_catalog_privileges.sql`, `tests/integration/menu/menus-privileges.integ.test.ts`). Review text is untrusted; code confirms the defects.
- `app/actions/menu.ts:356-365` — `Promise.all` of per-id `.update({ sort_order: index })`.
- `supabase/migrations/20260825140000_operating_windows_privilege.sql:46-49` and `20260827160000_public_catalog_privileges.sql:36-39` — DROP/REVOKE/GRANT on `menus` only; `CREATE TABLE` is only in baseline `:159-164`.
- `tests/integration/menu/menus-privileges.integ.test.ts:57` — `describe.skipIf(!authEnvReady)`. Sibling fail-closed gate: `tests/integration/setup.ts:6-10`. Config: `vitest.integration.config.ts` `setupFiles: ["tests/integration/setup.ts"]`, include `tests/integration/**/*.integ.test.ts`.
- Sibling atomic catalog write: `replace_operating_windows(jsonb)` in baseline + `availability.ts` `.rpc("replace_operating_windows")`.
- `.cursor/rules/supabase-migrations.mdc` — a new dated file is allowed when already-applied hosts cannot pick up an edit to an applied companion.

**Single hypothesis (confirmed):** MT-6/MT-4 omitted atomicity, companion CREATE-before-GRANT, and an explicit STRICT pin for this integ file. Not three unrelated product ideas — three missing invariants on the same `menus` catalog.

**Pre-mortem:** A partial reorder leaves guest tabs in a mixed old/new order; a hosted reset-less deploy GRANTs on a missing `menus` relation; CI without keys reports a skipped menus suite as green.

**Inversion / red-team:** A second `getMenuTabs` after a fully successful `Promise.all` still passes MT-6 while a mid-loop error would have torn order — C1 must pin one operation, not only the happy-path list. Companion GRANT-only pins would still pass without CREATE — C2 must require CREATE TABLE before GRANT. skipIf-only files look green without STRICT — C3 must pin setup.ts throw + this file's include.

## Spec

- Source: extend existing `docs/specs/menu-availability.md`
- Summary: Reorder is one service-role operation. Privilege migrations that touch `menus` create the table first; hosted already-applied DBs get a dated forward file. Menus privilege integ is fail-closed under STRICT via the shared integration setup.
- Clarifications needed: none. POS compiled tabs, tab delete, and N-update vs RPC shape stay out of the AC text (one operation, not a prescribed API).

## Acceptance Criteria → Tests

| #   | Criterion                                        | Risk | Layer | Test file                                    | New or existing         | Test name                                                    | Assertion                                                                                                                                                                                                                                                                                             | Command                                                       | Depends on |
| --- | ------------------------------------------------ | ---- | ----- | -------------------------------------------- | ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| C1  | MT-6a reorder is one operation                   | P0   | unit  | tests/unit/menu/menu-tab-persistence.test.ts | existing file, new `it` | reorder menu tabs applies sort_order in one operation        | After staff reorder, `rpc` (or a single `from("menus")` write) is used once with the ordered ids; per-id `.update({ sort_order })` in a loop is absent. Happy-path list order still matches MT-6.                                                                                                     | `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts` | none       |
| C2  | MT-4a CREATE TABLE before GRANT on menus         | P0   | unit  | tests/unit/menu/menus-bootstrap.test.ts      | new file                | menus privilege migrations create the table before granting  | Every `supabase/migrations/*.sql` that contains `GRANT SELECT ON TABLE menus` also contains `CREATE TABLE IF NOT EXISTS menus` earlier in the same file, with columns `id`, `title`, `title_en`, `sort_order`.                                                                                        | `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts`      | none       |
| C3  | MT-4b STRICT missing-auth throws for menus integ | P1   | unit  | tests/unit/menu/menus-integ-strict.test.ts   | new file                | menus privilege integ is covered by STRICT fail-closed setup | `vitest.integration.config.ts` includes `tests/integration/**/*.integ.test.ts` and `setupFiles` has `tests/integration/setup.ts`; that setup throws when `RESTAURANT_INTEGRATION_STRICT=true` and auth keys are missing; `tests/integration/menu/menus-privileges.integ.test.ts` exists on that glob. | `pnpm test:unit tests/unit/menu/menus-integ-strict.test.ts`   | none       |

- **Risk** is `P0`–`P3`. C1 then C2 (both P0), then C3. No inter-criterion source dependency.

## Traceability Matrix

| Criterion | Spec ref                   | Test file::name                                                                          | Source file(s)   | Risk | Status  |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | menu-availability.md MT-6a | menu-tab-persistence.test.ts::reorder menu tabs applies sort_order in one operation      | (fills at Green) | P0   | planned |
| C2        | menu-availability.md MT-4a | menus-bootstrap.test.ts::menus privilege migrations create the table before granting     | (fills at Green) | P0   | planned |
| C3        | menu-availability.md MT-4b | menus-integ-strict.test.ts::menus privilege integ is covered by STRICT fail-closed setup | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). C2/C3 are source-text pins. Do not require `db reset` for this loop.
- If a later residual needs live integ, run `$env:RESTAURANT_INTEGRATION_STRICT = 'true'; pnpm test:integration tests/integration/menu/menus-privileges.integ.test.ts` (fail-closed).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/menu-availability.md` — add MT-6a, MT-4a, MT-4b.
- Existing-test edit: `tests/integration/menu/menus-privileges.integ.test.ts` — C2 Green may add a new dated forward file to `MIGRATION_FILES` if that file also carries the GRANT trio. C3 must not rewrite `skipIf` unless a Red that is not pre-satisfied requires it (C3 pins setup coverage, not skipIf removal).
- Existing-test edit: `tests/unit/menu/menu-tab-persistence.test.ts` — add a new `it` only (do not rewrite the existing MT-6 persist `it`).

## TDD Execution Loop

### Criterion C1 — MT-6a atomic reorder (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("reorder menu tabs applies sort_order in one operation")` in `tests/unit/menu/menu-tab-persistence.test.ts`. Reuse existing mocks. Assert staff `reorderMenuTabs` performs one catalog write (`.rpc` once, or a single non-looped `from("menus")` write) with the ordered ids; do not accept N `.update({ sort_order })` calls. Keep the existing persist `it`. Must execute and fail on today's `Promise.all` updates. Command: `pnpm test:unit tests/unit/menu/menu-tab-persistence.test.ts`.
- **Green** → Invoke `tdd-green` to make reorder one service-role operation (prefer an existing RPC sibling shape such as `replace_operating_windows`, or one statement). Do not change tab `id`s. Exit = target test green, executed. Consult Supabase skill if RPC/SQL API uncertain.
- **Refactor** → Invoke `tdd-refactor` to clean C1 source; exit = target test green + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion C2 — MT-4a CREATE before GRANT (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/menus-bootstrap.test.ts` :: `menus privilege migrations create the table before granting`. Scan `supabase/migrations/*.sql`; every file with `GRANT SELECT ON TABLE menus` must have an earlier `CREATE TABLE IF NOT EXISTS menus` naming `id`, `title`, `title_en`, `sort_order`. Must fail on today's companions. Command: `pnpm test:unit tests/unit/menu/menus-bootstrap.test.ts`.
- **Green** → Invoke `tdd-green` to add `CREATE TABLE IF NOT EXISTS menus` (same columns as baseline) before GRANT/REVOKE in both privilege companions. Also add a new dated forward migration for already-applied hosts (supabase-migrations.mdc all-three test). Copy the same CREATE + privilege trio into that file. May update `MIGRATION_FILES` in the listed existing integ test. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean C2 SQL/source; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion C3 — MT-4b STRICT fail-closed coverage (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/menu/menus-integ-strict.test.ts` :: `menus privilege integ is covered by STRICT fail-closed setup`. Pin integration config include + setupFiles, setup.ts throw when STRICT and keys missing, and the menus privilege integ path. If today's code already satisfies the pin, report PRE-SATISFIED (executed, passing for the right reason) — do not invent a second fail-closed path. Command: `pnpm test:unit tests/unit/menu/menus-integ-strict.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was not PRE-SATISFIED. Minimal source to make the pin pass. Do not remove sibling `skipIf` usage unless the new `it` requires it. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to re-verify C3; exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-70_cr_majors_9f4c2a71`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-70_cr_majors_9f4c2a71.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/menu-availability.md`
Criteria: 3 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/menu-availability.md` | existing-test edit `tests/integration/menu/menus-privileges.integ.test.ts` | existing-test edit `tests/unit/menu/menu-tab-persistence.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-70_cr_majors_9f4c2a71.plan.md`

Problem: PR 116 US review left three Majors: N-update reorder can tear sort_order; companions GRANT menus without CREATE TABLE; menus integ skipIf is only fail-closed via shared STRICT setup, which the spec never required.
Approach: Add MT-6a (one reorder operation), MT-4a (CREATE TABLE before GRANT, plus dated forward file for already-applied hosts), MT-4b (STRICT setup covers the menus privilege integ file).
Out-of-scope findings: POS compiled MENUS (med) · tab delete (low) · authEnvReady omits URL (low)

| #   | Criterion                          | Risk | Layer | Test file                                    |
| --- | ---------------------------------- | ---- | ----- | -------------------------------------------- |
| 1   | Reorder is one operation           | P0   | unit  | tests/unit/menu/menu-tab-persistence.test.ts |
| 2   | CREATE TABLE before GRANT on menus | P0   | unit  | tests/unit/menu/menus-bootstrap.test.ts      |
| 3   | STRICT setup covers menus integ    | P1   | unit  | tests/unit/menu/menus-integ-strict.test.ts   |
```

## Docs Sync

Execution-start todo: `start-linear` first. INPUT: this plan's `## Linear Plan Digest`. Task `run_in_background: true`.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-70_cr_majors_9f4c2a71
- spec: docs/specs/menu-availability.md
- mode: FIX
- linear_issue: RES-70
- criteria_shipped: [C1, C2, C3]
- criteria_manual_uat: none
- req_ids: [MT-6a, MT-4a, MT-4b]
- source_paths: [app/actions/menu.ts, supabase/migrations/]
- test_paths: [tests/unit/menu/menu-tab-persistence.test.ts, tests/unit/menu/menus-bootstrap.test.ts, tests/unit/menu/menus-integ-strict.test.ts]
- architecture_touch: [Order-Flow, Auth-And-RLS]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-70_cr_majors_9f4c2a71.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                     | Where (file:line/area)                   | Why it matters                                         | Severity | Relation                  |
| ------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ | -------- | ------------------------- |
| POS picker tabs stay on compiled MENUS      | components/staff/pos-terminal.tsx / AC-4 | New admin tabs cannot be sold on POS                   | med      | already on product-gaps   |
| Tab delete not specified                    | /admin/menu                              | Leftover empty tabs accumulate                         | low      | already on product-gaps   |
| authEnvReady omits NEXT_PUBLIC_SUPABASE_URL | tests/integration/helpers/env.ts         | Integrity rule names URL+keys; helper checks keys only | low      | repo-wide; not menus-only |

- `node .cursor/checks/harness-lint.mjs res-70_cr_majors_9f4c2a71`: pending close-out

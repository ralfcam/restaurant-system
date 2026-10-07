# RES-135 staging migrations apply on merge

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/res-135_staging_migrations_a7c2e1f4.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-135_staging_migrations_a7c2e1f4.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-135_staging_migrations_a7c2e1f4.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/res-135_staging_migrations_a7c2e1f4.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/res-135_staging_migrations_a7c2e1f4.md`** (matching `## <category>`
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
  `.cursor/plans/res-135_staging_migrations_a7c2e1f4.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-135_staging_migrations_a7c2e1f4.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name informational)
- Project: issue payload allocates **restaurant-system V-0.5** (canonical `V-0.5`). Live Linear MCP is unauthenticated in this Cloud VM (`cannot verify` the live project/milestone set). Precedence used: existing issue project from the launching payload.
- Work type: implementation (CI apply of pending migrations on merge to `staging`)
- Milestone: M4 — Code Complete (Feature Freeze)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: `RES-135` — observed: schema merged to `staging` is not applied to the shared staging Supabase database; UAT guest bookings failed with "Could not save your reservation" after `reservations.allergens` landed in the repo but not on staging. Expected: pending files in `supabase/migrations` apply automatically on merge to `staging`, and a failed apply is a visible red job.
- Missing constraint (root cause): `docs/specs/dev-toolchain.md` has no G-MIG rule requiring a fail-closed GitHub Actions apply of pending migrations on push to `staging`, a pre-merge check when those files change, secrets-only credentials, and no automatic apply on `main`.
- Spec update proposed: `docs/specs/dev-toolchain.md` → add **G-MIG1–G-MIG5** (criteria 23–27) plus a Scope mention. First execution write after START launch.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md`
- Summary: On push (merge) to `staging`, CI applies pending `supabase/migrations` with `supabase db push` to the staging project. The apply job fails closed. PRs that touch those files get a pre-merge validation check that does not apply. Credentials come from GitHub `secrets.*`. No workflow applies migrations on `main`. Production stays an operator-approved runbook step.
- Clarifications needed: none. Optional remote-vs-repo drift check is deferred (findings). Hand-apply of currently pending staging SQL is explicitly out of this ticket.

## Acceptance Criteria → Tests

Layer = `unit` for every criterion: the contract is workflow YAML (and any helper it calls). A live GitHub/Supabase apply cannot be proven in this loop without hosted secrets; asserting the fail-closed job shape is the lowest layer that can actually run here. Sibling pattern: G-CR3 / G-ENV1 file-scan tests.

| #   | Criterion                                      | Risk | Layer | Test file                                                | New or existing         | Test name                                                  | Assertion                                                                                                                                                                                                     | Command                                                                 | Depends on |
| --- | ---------------------------------------------- | ---- | ----- | -------------------------------------------------------- | ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 1   | G-MIG1 push to staging runs `supabase db push` | P1   | unit  | `tests/unit/dev-toolchain/staging-migrations-ci.test.ts` | new                     | `push to staging runs supabase db push`                    | `.github/workflows/staging-migrations.yml` exists; `on.push` includes `staging`; apply job/step contains `supabase db push` (or `npx supabase db push`); does not contain `db reset`                          | `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts` | none       |
| 2   | G-MIG2 apply job fails closed                  | P0   | unit  | same                                                     | existing file, new `it` | `staging apply job fails closed`                           | apply job and `db push` step have no `continue-on-error: true` and no `\|\| true` / `\|\| exit 0`                                                                                                             | same                                                                    | 1          |
| 3   | G-MIG3 PR check for `supabase/migrations`      | P1   | unit  | same                                                     | existing file, new `it` | `PRs that touch supabase/migrations run a pre-merge check` | `on.pull_request` targets `staging`, `paths` includes `supabase/migrations/**`; a job validates non-empty `*.sql` files and states merge will apply to staging; that job does not run `db push` or `db reset` | same                                                                    | 1          |
| 4   | G-MIG4 credentials from GitHub secrets         | P0   | unit  | same                                                     | existing file, new `it` | `staging apply credentials come from GitHub secrets`       | apply job references `${{ secrets.SUPABASE_ACCESS_TOKEN }}` and `${{ secrets.SUPABASE_DB_PASSWORD }}`; workflow has no literal token/JWT/password                                                             | same                                                                    | 1          |
| 5   | G-MIG5 production not automatic                | P0   | unit  | same                                                     | existing file, new `it` | `no workflow applies migrations on main`                   | staging apply `on.push.branches` includes `staging` and excludes `main`; no `.github/workflows/*.yml` runs `db push` on push to `main` or PR base `main`                                                      | same                                                                    | 1          |

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                         | Source file(s)                                           | Risk | Status  |
| --------- | ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---- | ------- |
| G-MIG1    | dev-toolchain.md G-MIG1 | staging-migrations-ci.test.ts::push to staging runs supabase db push                    | `.github/workflows/staging-migrations.yml` (Green fills) | P1   | planned |
| G-MIG2    | dev-toolchain.md G-MIG2 | staging-migrations-ci.test.ts::staging apply job fails closed                           | same                                                     | P0   | planned |
| G-MIG3    | dev-toolchain.md G-MIG3 | staging-migrations-ci.test.ts::PRs that touch supabase/migrations run a pre-merge check | same                                                     | P1   | planned |
| G-MIG4    | dev-toolchain.md G-MIG4 | staging-migrations-ci.test.ts::staging apply credentials come from GitHub secrets       | same                                                     | P0   | planned |
| G-MIG5    | dev-toolchain.md G-MIG5 | staging-migrations-ci.test.ts::no workflow applies migrations on main                   | same                                                     | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked file-scan). No local Supabase, no e2e, no deployed pack.
- Command for every phase: `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`
- If that command collects 0 tests, STOP (`BLOCKED`), never treat as Red/Green.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — add G-MIG1–G-MIG5 (criteria 23–27) and mention them in Scope. Encodes the missing CI contract that allowed staging schema drift.
- Existing-test edit: none. New tests only, in a new file.

## TDD Execution Loop

### Criterion 1 — G-MIG1 push to staging runs `supabase db push` (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test `push to staging runs supabase db push` in `tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. It must read `.github/workflows/staging-migrations.yml` and fail because the file is missing (or lacks `on.push` → `staging` plus `supabase db push` / `npx supabase db push`, and must reject `db reset`). Run `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. Exit = RED for the missing workflow, not a harness error.
- **Green** → Invoke the `tdd-green` subagent to add the minimal `.github/workflows/staging-migrations.yml` so that test passes: `on.push.branches: [staging]`, an apply job that runs `npx supabase db push` (not `db reset`). Do not add PR validation, secrets assertions, or main exclusions beyond what this one test requires. Exit = target test GREEN (executed).
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up G-MIG1 and re-verify. Exit = target test GREEN + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion 2 — G-MIG2 apply job fails closed (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write `staging apply job fails closed` in the same file. Assert the apply job and the `db push` step have no `continue-on-error: true` and the apply `run` does not swallow failure with `|| true` or `|| exit 0`. Run `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. Exit = RED if today's workflow omits that fail-closed pin, or GREEN-blocked-back-to-tighten if Green already over-built — then require an assertion that still fails on a vacuous pass (e.g. an apply step that could `continue-on-error`).
- **Green** → Invoke the `tdd-green` subagent to make that test pass with the minimal workflow change (omit `continue-on-error`; do not add `|| true`). Exit = target test GREEN (executed).
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up G-MIG2 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion 3 — G-MIG3 PR check for `supabase/migrations` (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write `PRs that touch supabase/migrations run a pre-merge check` in the same file. Assert `on.pull_request` (branches `staging`, paths `supabase/migrations/**`), a job that validates every file under `supabase/migrations` is a non-empty `*.sql` and prints that merge to staging will apply them, and that this job's steps do not contain `db push` or `db reset`. Run `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. Exit = RED (PR job missing).
- **Green** → Invoke the `tdd-green` subagent to add the PR job/trigger only. Exit = target test GREEN (executed).
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up G-MIG3 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion 4 — G-MIG4 credentials from GitHub secrets (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write `staging apply credentials come from GitHub secrets` in the same file. Assert the apply job contains `${{ secrets.SUPABASE_ACCESS_TOKEN }}` and `${{ secrets.SUPABASE_DB_PASSWORD }}`, and the workflow file has no `eyJ` JWT, no `sbp_` token, and no `postgresql://` password URL. Run `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. Exit = RED if secrets are missing.
- **Green** → Invoke the `tdd-green` subagent to wire those two `secrets.*` expressions into the apply job env (no literal credentials). Exit = target test GREEN (executed).
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up G-MIG4 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion 5 — G-MIG5 production not automatic (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write `no workflow applies migrations on main` in the same file. Assert the staging workflow `on.push.branches` includes `staging` and does not include `main`; scan every `.github/workflows/*.yml` and fail if any `db push` job is gated on push to `main` or `pull_request` base `main`. Run `pnpm test:unit tests/unit/dev-toolchain/staging-migrations-ci.test.ts`. Exit = RED if the pin is missing.
- **Green** → Invoke the `tdd-green` subagent to keep apply triggers off `main` (minimal YAML). Exit = target test GREEN (executed).
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up G-MIG5 and re-verify. Exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- None. Installing GitHub secrets on the repo and the first live apply against the hosted staging project are operator repo-settings steps, not a `manual-UAT` product criterion. The immediate hand-apply of already-pending staging SQL is out of this ticket (findings).

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-135_staging_migrations_a7c2e1f4`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-135_staging_migrations_a7c2e1f4.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 5 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-135_staging_migrations_a7c2e1f4.plan.md`

Problem: Schema changes merged to staging are not applied to the shared staging Supabase database. Guest bookings failed in UAT because pending columns never reached staging. The toolchain spec has no rule that CI must apply `supabase/migrations` on push to staging.
Approach: Add G-MIG1–G-MIG5. A GitHub Actions workflow applies pending migrations with `supabase db push` on push to staging, fails the job on a non-zero apply, validates migration files on PRs that touch `supabase/migrations`, reads credentials from GitHub secrets, and never applies on `main`. Production stays an operator-approved runbook step.
Out-of-scope findings: optional remote-vs-repo drift check (med); hand-apply of currently pending staging migrations (high, separate unblock); first db push may fail on forked remote history (med)

| #   | Criterion                    | Risk | Layer | Test file                                              |
| --- | ---------------------------- | ---- | ----- | ------------------------------------------------------ |
| 1   | Push to staging runs db push | P1   | unit  | tests/unit/dev-toolchain/staging-migrations-ci.test.ts |
| 2   | Apply job fails closed       | P0   | unit  | tests/unit/dev-toolchain/staging-migrations-ci.test.ts |
| 3   | PR migration check           | P1   | unit  | tests/unit/dev-toolchain/staging-migrations-ci.test.ts |
| 4   | Credentials from secrets     | P0   | unit  | tests/unit/dev-toolchain/staging-migrations-ci.test.ts |
| 5   | Production not automatic     | P0   | unit  | tests/unit/dev-toolchain/staging-migrations-ci.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`, and on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-135_staging_migrations_a7c2e1f4
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-135
- criteria_shipped: [G-MIG1, G-MIG2, G-MIG3, G-MIG4, G-MIG5]
- criteria_manual_uat: none
- req_ids: [G-MIG1, G-MIG2, G-MIG3, G-MIG4, G-MIG5]
- source_paths: [.github/workflows/staging-migrations.yml]
- test_paths: [tests/unit/dev-toolchain/staging-migrations-ci.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-135_staging_migrations_a7c2e1f4.md
- drift_flagged: none
- skip_reason: none
```

Docs-updater must also describe the new CI step in `docs/runbooks/deploy.md` (staging apply on push; required GitHub secrets; production stays manual).

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                               | Where (file:line/area)                              | Why it matters                                                                                                                                                        | Severity | Relation                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------- |
| Optional post-deploy drift check (repo vs remote `schema_migrations`) | `.github/workflows/` / staging project              | Proposal listed it as optional; a silent leftover or extra remote version would not fail CI after this wave                                                           | med      | deferred from RES-135 optional bullet                     |
| Hand-apply currently pending staging migrations                       | hosted staging Supabase (`tilcqrudqxznnpepxjqq`)    | UAT bookings still fail until `allergens` and other pending files exist on staging; issue marks this as a separate unblock                                            | high     | explicit "Immediate unblock (separate from this ticket)"  |
| First `db push` may fail on forked remote history                     | `docs/runbooks/deploy.md` linked remote vs repo SQL | Runbook still warns a full `db push` is unsafe on the forked `schema_migrations` history; a red apply job is correct, but an operator repair/reset may be needed once | med      | known archived finding; not solved by adding the workflow |

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-135 (plan: res-135_staging_migrations_a7c2e1f4), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.
- **Close-out:** delegate `linear-resolver` for RES-135 after 4C: resolution comment only (no workflow-state write).
- **Findings registration:** merge `docs/findings/runs/res-135_staging_migrations_a7c2e1f4.md` into category files, then `linear-resolver` attach-only on managed Cloud (leave net-new on the ledger). Then ledger-apply prune + delete the run file.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

Concern-ordered `path:line` stops for the whole change, highest-risk first.
Collated into **`## Suggested Review Order (collated)`** in
`docs/verifier-reports/tdd/res-135_staging_migrations_a7c2e1f4.md`.

- (filled after Refactor phases)

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none (seed)
- Traceability finalized in tdd log `## Traceability (final)`: n/a until close-out
- Run metrics stamped in tdd log `## Run metrics`: n/a until close-out
- `node .cursor/checks/harness-lint.mjs res-135_staging_migrations_a7c2e1f4`: n/a until close-out

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Do not wait for a second accept. Arm `tdd-guard`. Launch START (`run_in_background: true`; do not wait). Apply the spec edit listed in `## Permissions Requested`, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

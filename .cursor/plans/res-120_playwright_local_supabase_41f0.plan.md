# RES-120 Playwright local Supabase guard

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
- Work-order: `.cursor/plans/res-120_playwright_local_supabase_41f0.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link, informational)
- Project: `restaurant-system V-0.5` (`P-RES-12`, uuid `d355ac92-faa0-4866-b501-32880e087b91`). `list_projects` team `RES` returned three projects; V-0.1 and V-0.2 are Completed (terminal). V-0.5 is the only nonterminal version project (status Backlog). No duplicate `versionKey`.
- Work type: implementation (security fix of a mutating e2e fixture)
- Milestone: issue is on M1 — Project Kickoff. Canonical route for a security fix is M8; this card was operator-confirmed as `/sdd-to-tdd` while remaining on M1. No milestone write.
- Mixed design + implementation: no
- Clarification: none. `list_comments` has only the GitHub sync notice. The confirmed daily card is the execution order.

## Issue & Root Cause (FIX mode only)

- Issue: RES-120 — `tests/e2e/admin/guest-profile-overlay.spec.ts` calls `loadEnvConfig` and then inserts reservations with the service role. A default `.env.local` whose `NEXT_PUBLIC_SUPABASE_URL` is hosted (`tilcqrudqxznnpepxjqq`) sends that insert at a project that lacks `email_normalized`, and `reuseExistingServer` is not the insert path.
- Missing constraint (root cause): `docs/specs/guest-profiles.md` never requires the default Playwright run to reject a non-local Supabase URL before that fixture insert. Integration suites already fail closed through `assertIsolatedHoursMutationTarget`; this e2e does not.
- Spec update proposed: `docs/specs/guest-profiles.md` → GP-16 (first execution spec action; listed in `## Permissions Requested`).

## Spec

- Source: extend existing `docs/specs/guest-profiles.md`
- Summary: GP-13's Playwright spec loads `.env.local` and inserts a reservation group. GP-16 requires `playwright.config.ts` `globalSetup` → `playwright.global-setup.ts` to load that env and call `assertPlaywrightSupabaseUrlIsLocalOrUnset()` before any e2e test. Omitted or empty URL does not throw (other e2e specs do not need Supabase). A non-loopback host throws. Loopback hosts pass on any port, reusing `assertIsolatedHoursMutationTarget`.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #     | Criterion                                                                                                                                                    | Risk | Layer | Test file                                                     | New or existing | Test name                                                                            | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                      | Command                                                                      | Depends on |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| GP-16 | Default Playwright global setup loads env and rejects a hosted Supabase URL before the guest-profile fixture insert; omitted/empty and loopback do not throw | P0   | unit  | `tests/unit/guest-profiles/playwright-local-supabase.test.ts` | new             | `playwright global setup rejects a hosted Supabase URL and allows loopback or unset` | Import `assertPlaywrightSupabaseUrlIsLocalOrUnset` from `playwright.global-setup.ts`. Hosted `https://tilcqrudqxznnpepxjqq.supabase.co` throws. `http://127.0.0.1:45321`, `http://localhost:45321`, `http://[::1]:45321`, omitted `undefined`, and `""` do not. `playwright.config.ts` sets `globalSetup` to `./playwright.global-setup.ts`. That file calls `loadEnvConfig` and `assertPlaywrightSupabaseUrlIsLocalOrUnset` with no argument. | `pnpm test:unit tests/unit/guest-profiles/playwright-local-supabase.test.ts` | none       |

Pre-mortem: a helper that exists but is not wired as `globalSetup` still lets `pnpm test:e2e` insert into hosted Supabase. The test must fail that wiring, not only the helper. Inversion: an explicit local URL argument must not be the config's call (zero-arg, so the loaded env wins).

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                                                       | Source file(s)                                       | Risk | Status  |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---- | ------- |
| GP-16     | guest-profiles.md GP-16 | playwright-local-supabase.test.ts::playwright global setup rejects a hosted Supabase URL and allows loopback or unset | `playwright.global-setup.ts`, `playwright.config.ts` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). Do not run the guest-profile Playwright spec in this loop.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/guest-profiles.md` — add GP-16
- Existing-test edit: none

## TDD Execution Loop

### Criterion GP-16 — Playwright guest-profile env is local or unset (layer: unit)

- **Red** → Invoke `tdd-red` to add `tests/unit/guest-profiles/playwright-local-supabase.test.ts` with the test name above. It must fail on today's tree because `playwright.global-setup.ts` and the `globalSetup` wiring do not exist. Command: `pnpm test:unit tests/unit/guest-profiles/playwright-local-supabase.test.ts`. The failure must be an assertion or missing-behavior failure, not a skip. Do not edit `playwright.config.ts` or add the setup module.
- **Green** → Invoke `tdd-green` to add `playwright.global-setup.ts` exporting `assertPlaywrightSupabaseUrlIsLocalOrUnset` (reuse `assertIsolatedHoursMutationTarget` for the host check; return when the resolved URL is omitted or empty) and a default export that `loadEnvConfig(process.cwd())` via the same `@next/env` resolve the e2e spec uses, then calls the guard with no argument. Set `playwright.config.ts` `globalSetup` to `./playwright.global-setup.ts`. Exit: the target test executed and passed. Do not edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean the setup module and config wiring without changing behavior. Exit: target test still executed and green, `pnpm lint` 0 warnings, `pnpm typecheck` clean, `pnpm exec prettier --check` clean on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-120_playwright_local_supabase_41f0`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-120_playwright_local_supabase_41f0.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-profiles.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/guest-profiles.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-120_playwright_local_supabase_41f0.plan.md`

Problem: The guest-profile Playwright spec loads `.env.local` and inserts reservations with the service role. When that file's `NEXT_PUBLIC_SUPABASE_URL` is the hosted project, the insert targets a database that lacks `email_normalized`. Guest-profiles never required the default Playwright run to reject a non-local URL before that insert. Integration suites already fail closed; this fixture does not.
Approach: Add GP-16. A Playwright `globalSetup` loads env, then `assertPlaywrightSupabaseUrlIsLocalOrUnset()` reuses the loopback host check. Omitted or empty URL does not throw, so unrelated e2e specs still run. A hosted host throws before any test, including the guest-profile insert. One unit test pins both the helper and the config wiring.
Out-of-scope findings: reuseExistingServer can still attach to an already-running hosted dev server (low); guest-profile spec does not itself call the guard if globalSetup is bypassed (low)

| #   | Criterion                                                                          | Risk | Layer | Test file                                                   |
| --- | ---------------------------------------------------------------------------------- | ---- | ----- | ----------------------------------------------------------- |
| 1   | Playwright global setup rejects a hosted Supabase URL and allows loopback or unset | P0   | unit  | tests/unit/guest-profiles/playwright-local-supabase.test.ts |
```

## Docs Sync

```markdown
## Docs sync packet

- plan_slug: res-120_playwright_local_supabase_41f0
- spec: docs/specs/guest-profiles.md
- mode: FIX
- linear_issue: RES-120
- criteria_shipped: [GP-16]
- criteria_manual_uat: none
- req_ids: [GP-16]
- source_paths: [playwright.global-setup.ts, playwright.config.ts]
- test_paths: [tests/unit/guest-profiles/playwright-local-supabase.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-120_playwright_local_supabase_41f0.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                                                             | Where (file:line/area)                          | Why it matters                                                                           | Severity | Relation                                     |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| `reuseExistingServer` can attach Playwright to a dev server already started against hosted Supabase | `playwright.config.ts` webServer                | The UI under test can still talk to hosted data even after the fixture insert is blocked | low      | out of scope for GP-16                       |
| Guest-profile spec does not call the guard itself                                                   | `tests/e2e/admin/guest-profile-overlay.spec.ts` | A run that bypasses `playwright.config.ts` `globalSetup` can still insert                | low      | out of scope; config wiring is the criterion |

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-120 (plan: `res-120_playwright_local_supabase_41f0`), posting this plan's `## Linear Plan Digest`. Task `run_in_background: true`; do not wait before the spec edit or GP-16 Red.
- **Close-out:** delegate `linear-resolver` for RES-120 after 4C: resolution comment only.
- **Findings registration:** merge the run file at close-out. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- security → `playwright.global-setup.ts` guard, `playwright.config.ts` `globalSetup`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none until Refactor names one
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-120_playwright_local_supabase_41f0`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). Apply the GP-16 spec edit. Set phase red. Delegate GP-16 Red.

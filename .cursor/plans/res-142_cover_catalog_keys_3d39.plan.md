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
- Work-order: `.cursor/plans/res-142_cover_catalog_keys_3d39.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`), the issue's existing nonterminal RES version project. Live set: V-0.5 Backlog (nonterminal); V-0.1 and V-0.2 Completed (terminal, excluded). No allocation tie.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). The issue already sits on that milestone, and M4 is in the project's M1–M9 set.
- Mixed design + implementation: no
- Clarification: none. Ready-brief Decisions resolve the copy scope. No `Clarification required` comment on RES-142.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-142 — `errors.floor.maxCoverCapacityUnset`, `maxCoverCapacityInvalid`, and `maxCoverCapacityBelowSum` are returned by floor actions and absent from `messages/fr.json` and `messages/en.json`. Expected: each key resolves to a non-empty French string and a non-empty English string.
- Missing constraint (root cause): none absent. Criterion 2 already requires identical key sets and no empty values. AC-21 already requires every user-visible `errors.*` key to resolve to a non-empty value in both catalogs. The catalogs do not yet contain these three keys.
- Spec update proposed: none. Do not edit `docs/specs/site-localization.md`. The first execution action is the regression test.

## Spec

- Source: existing `docs/specs/site-localization.md` (criterion 2, AC-21). No extension.
- Summary: French and English catalogs share one key set. Every user-visible server failure is a bare `errors.*` key that resolves to a non-empty string in both catalogs. Floor actions already return the three cover-capacity refusal keys; the catalogs omit them. `maxCoverCapacitySaveFailed` and `maxCoverCapacityReached` are already present.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                                                    | Risk | Layer | Test file                             | New or existing                   | Test name                                                 | Assertion                                                                                                                                                                                            | Command                                                | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ----- | ------------------------------------- | --------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------- |
| 1   | AC-21 / criterion 2 — the three cover-capacity refusal keys resolve to non-empty strings in both catalogs, and the French leaf differs from the English leaf | P2   | unit  | tests/unit/floor/message-keys.test.ts | existing-test edit (one new `it`) | cover-capacity refusal keys resolve in French and English | `expectCatalogKey` for `errors.floor.maxCoverCapacityUnset`, `errors.floor.maxCoverCapacityInvalid`, and `errors.floor.maxCoverCapacityBelowSum`, and each French leaf differs from its English leaf | `pnpm test:unit tests/unit/floor/message-keys.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref                                | Test file::name                                                                                  | Source file(s)                     | Risk | Status  |
| --------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- | ---- | ------- |
| 1         | site-localization.md criterion 2, AC-21 | tests/unit/floor/message-keys.test.ts::cover-capacity refusal keys resolve in French and English | messages/en.json, messages/fr.json | P2   | pending |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: none — criterion 2 and AC-21 already require these catalog leaves
- Existing-test edit: `tests/unit/floor/message-keys.test.ts` — add one `it`; this file already owns floor `errors.*` catalog checks
- Source writes (green only, Ready-brief allowed edits): `messages/en.json`, `messages/fr.json`

## TDD Execution Loop

### Criterion 1 — cover-capacity refusal keys resolve in French and English (layer: unit)

- **Red** → Use the tdd-red subagent to add one failing test named `cover-capacity refusal keys resolve in French and English` in `tests/unit/floor/message-keys.test.ts`. Call `expectCatalogKey` for `errors.floor.maxCoverCapacityUnset`, `errors.floor.maxCoverCapacityInvalid`, and `errors.floor.maxCoverCapacityBelowSum`, and assert each French leaf differs from its English leaf. It must fail because those leaves are missing. Do not edit source. Command: `pnpm test:unit tests/unit/floor/message-keys.test.ts`.
- **Green** → Use the tdd-green subagent to add the three keys under `errors.floor` in `messages/en.json` and `messages/fr.json` only. English: unset `Set a maximum cover capacity before adding seats.`; invalid `Maximum covers must be a whole number of at least 1.`; below-sum `Maximum covers cannot be below the current seat total.` French: unset `Définissez un maximum de couverts avant d'ajouter des places.`; invalid `Le maximum de couverts doit être un entier d'au moins 1.`; below-sum `Le maximum de couverts ne peut pas être inférieur au total actuel des places.` French leaves must differ from English. Do not edit tests or the spec. Exit: the target test executes and passes.
- **Refactor** → Use the tdd-refactor subagent to clean the catalog entries if needed and re-verify. Exit: target test still green (executed), `pnpm lint` with 0 warnings, `pnpm typecheck` clean, and `pnpm exec prettier --check` clean on `messages/en.json` and `messages/fr.json`.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-142_cover_catalog_keys_3d39`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-142_cover_catalog_keys_3d39.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/site-localization.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: existing-test edit `tests/unit/floor/message-keys.test.ts` | source `messages/en.json`, `messages/fr.json` | spec edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-142_cover_catalog_keys_3d39.plan.md`

Problem: Floor actions return `errors.floor.maxCoverCapacityUnset`, `maxCoverCapacityInvalid`, and `maxCoverCapacityBelowSum`, but those leaves are missing from both message catalogs. Staff who receive the key see a missing translation. Criterion 2 and AC-21 already require every `errors.*` key to resolve to a non-empty value in French and English.
Approach: Add one regression in the existing floor message-key test, then add the three leaves in both catalogs. French copy differs from English. Refusal control flow and the empty ceiling field stay out of this change.
Out-of-scope findings: none

| #   | Criterion                                                       | Risk | Layer | Test file                             |
| --- | --------------------------------------------------------------- | ---- | ----- | ------------------------------------- |
| 1   | three cover-capacity refusal keys resolve in French and English | P2   | unit  | tests/unit/floor/message-keys.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to start work on RES-142 (plan: `res-142_cover_catalog_keys_3d39`), posting this plan's `## Linear Plan Digest` as the `Work started:` comment. Task `run_in_background: true`. Do not wait before Criterion 1 Red.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last: `pnpm exec prettier --write` on this run's dirty paths, then STEP 4G, then STEP 4F (execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-142_cover_catalog_keys_3d39
- spec: docs/specs/site-localization.md
- mode: FIX
- linear_issue: RES-142
- criteria_shipped: [criterion 2, AC-21]
- criteria_manual_uat: none
- req_ids: []
- source_paths: [messages/en.json, messages/fr.json]
- test_paths: [tests/unit/floor/message-keys.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-142_cover_catalog_keys_3d39.md
- drift_flagged: none
- skip_reason: none
- spec_edit: forbidden — do not modify docs/specs/site-localization.md
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none. The Ready brief already keeps capacity refusal control flow and the empty ceiling field (RES-141) out of this run. Both are already tracked. Do not re-file them.

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-142 (plan: `res-142_cover_catalog_keys_3d39`), posting the digest above. `run_in_background: true`. Do not wait before Criterion 1 Red.
- **Close-out (FIX):** delegate `linear-resolver` to post the structured resolution comment only. No workflow-state write.
- **Findings registration:** omit if the run file stays empty. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- catalog leaves → `messages/en.json`, `messages/fr.json`
- regression → `tests/unit/floor/message-keys.test.ts`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-142_cover_catalog_keys_3d39`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). No spec edit. Set phase `red`, then delegate Criterion 1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

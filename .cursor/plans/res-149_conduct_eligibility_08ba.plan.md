# /sdd-to-tdd RES-149 — conductor any-issue eligibility

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-10).
Branch `cursor/res-149-eligibility-08ba` from `origin/staging`. Ready brief
Queue Harness pre-authorizes the paths in Permissions Requested.
Verification: `node --test .cursor/checks/ready-brief-policy.test.mjs` and
`pnpm test:unit tests/unit/dev-toolchain/conduct-command.test.ts tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts`;
`node .cursor/checks/harness-lint.mjs` stays green.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase, (3) appending
  Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. Category-file merges and archive pruning are delegated to
  `docs-updater` ledger-apply (G-LED1) — the orchestrator never writes
  `docs/findings/{security,tech-debt,test-debt,product-gaps,archive}.md`.
  **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/<plan-slug>.plan.md` (repository work-order, not a
  silently accepted native Cursor Plan). After a spec write, `pnpm exec
prettier --write` **that file** (never `prettier --write .`). Snapshot
  trees (`docs/eval`, `docs/verifier-reports`, `docs/findings/runs`) are
  prettierignored. Everything else is delegated.
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
  before 4C. After 4C/4B, run the format pass, then STEP 4G (do not run the CLI), then STEP 4F. Linear
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
  (do not run `coderabbit-gate.mjs` here; the CLI lives on `/push`; do not write the
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

This run's owning tests live in `.cursor/checks/ready-brief-policy.test.mjs`
(G-RDY1 / G-CON1 policy suite) and `tests/unit/dev-toolchain/conduct-command.test.ts`.
Permissions Requested pre-authorizes Red to add tests in those files. Do not
modify existing test bodies. Do not edit G-TD1 (parallel RES-127).

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-149_conduct_eligibility_08ba.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: only nonterminal RES version project. Issue currently has no
  project; allocation hint is V-0.5. START does not move the issue.
- Work type: implementation (harness / conductor eligibility).
- Milestone: M4 — Code Complete (Feature Freeze). Issue has no milestone;
  planning hint only.
- Mixed design + implementation: no. Jose approved the five rules at
  08:08 CEST 10 Oct 2026. Ready brief Decisions resolve STEP 1A.
- Clarification: none unanswered.

## Issue & Root Cause (FIX mode only)

- Issue: RES-149. `/conduct` still queues only a complete Ready brief and
  does not encode Jose's any-issue eligibility rules. G-CON1 still says the
  lane uses no labels and does not mention sensitive, auto-brief,
  design-first, migration/RLS exclusion, or spec-amend-on-answer.
- Evidence: `.cursor/commands/conduct.md` Queue requires "a complete brief";
  Hard limits / pick do not run `/dispatch` to write a brief; no `sensitive`
  label or Jose-wait rule; G-CON1 item 20 and its trace row match that
  older contract. Dispatch still says there is no priority or `security`
  gate.
- Sibling: `/sdd-to-tdd` FIX mode already amends the owning spec first after
  a decided clarification. `/dispatch` already writes Ready briefs. Those
  shapes are the reuse, not a new brief format.
- Missing constraint: G-CON1 must require the five approved rules.
- Hypothesis (one): the defect is the missing G-CON1 eligibility contract,
  not a Linear or GitHub API bug. Confirmed by reading G-CON1, conduct.md,
  dispatch.md, and ready-brief-policy.mjs (completeness only).

## Spec

- File: `docs/specs/dev-toolchain.md` criterion **G-CON1 only** (numbered
  item 20 and the G-CON1 implementation-trace row). Do not edit G-TD1 or
  other nearby gates (RES-127 is editing G-TD1 in parallel).
- Jose approved 08:08 CEST 10 Oct 2026. These rules supersede the old
  `/conduct` exclusions.
- Eligibility classifier lives in
  `.cursor/hooks/lib/ready-brief-policy.mjs`. Commands read Linear/GitHub;
  the module classifies a normalized issue record.
- Check order: unanswered clarification → excluded; migration or RLS policy
  change → excluded (local only); not Todo or not current cycle → excluded
  from pick; new-scope or `/design` label → `design_first`; answered
  clarification with an incomplete brief `spec` field → `spec_amend`;
  missing/incomplete brief plus a priority → `auto_brief`;
  security/payment/auth → eligible `sensitive`; complete brief → `ready`.
- `sensitive` may combine with `auto_brief` or `ready`. Migration/RLS and
  unanswered clarification always win. Design-first wins over a code route
  on the first PR.
- Pre-mortem: a missing exclusion ships a Cloud migration or a guessed
  unanswered clarification. A missing sensitive gate lets a QA bot ready a
  money/auth PR. Inversion: a comment that merely mentions "sensitive"
  must not pass; `classifyConductEligibility` and `qaMayReadyPr` return
  explicit reasons/flags.

## Acceptance Criteria → Tests

| #   | Criterion                                                             | Risk | Layer | Test file                                    | New or existing | Test name                                                                           | Assertion                                                                                                                                                                                              | Command                                                  | Depends on |
| --- | --------------------------------------------------------------------- | ---- | ----- | -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ---------- |
| C1  | Migrations, RLS, and unanswered clarifications stay excluded          | P0   | unit  | `.cursor/checks/ready-brief-policy.test.mjs` | add test        | `classifyConductEligibility excludes migration, RLS, and unanswered clarifications` | `eligible: false` with reasons `excluded_migration`, `excluded_rls`, `excluded_clarification`; conduct.md still names those exclusions                                                                 | `node --test .cursor/checks/ready-brief-policy.test.mjs` | spec edit  |
| C2  | Security, payment, and auth tickets are eligible as sensitive         | P0   | unit  | same                                         | add test        | `security payment and auth tickets are sensitive-eligible`                          | those classes return `eligible: true`, `sensitive: true`; conduct.md requires a regression test, GitHub `sensitive` label, and a body line                                                             | same                                                     | C1         |
| C3  | QA bots never ready a sensitive PR                                    | P0   | unit  | same                                         | add test        | `qaMayReadyPr is false for a sensitive PR`                                          | `qaMayReadyPr({ labels: ["sensitive"] }) === false`; empty labels true; conduct.md says QA posts the digest and waits for Jose                                                                         | same                                                     | C2         |
| C4  | `/conduct next` auto-briefs a prioritized current-cycle Todo          | P1   | unit  | same                                         | add test        | `missing brief with priority auto-briefs via dispatch`                              | missing brief + Todo + current cycle + priority + no unanswered clarif → `auto_brief`; conduct.md pick runs `/dispatch` then starts; dispatch.md no longer claims there is no priority/`security` gate | same                                                     | C1         |
| C5  | New-scope or `/design`-labelled tickets are design-first              | P1   | unit  | same                                         | add test        | `new-scope and design-labelled tickets are design-first`                            | `design_first`; first PR is spec + plan, no application code                                                                                                                                           | same                                                     | C1         |
| C6  | Answered clarification amends the spec first then completes the brief | P1   | unit  | same                                         | add test        | `answered clarification amends spec then completes the brief`                       | `spec_amend` when a clarification is answered and `spec` is missing; sdd-to-tdd.md and conduct.md allow that FIX-style spec edit as the first step                                                     | same                                                     | C4         |
| C7  | Not-Todo and not-current-cycle records are excluded from pick         | P0   | unit  | same                                         | add test        | `classifyConductEligibility excludes not-Todo and not-current-cycle`                | `eligible: false` with `excluded_status` / `excluded_cycle` before any eligible reason                                                                                                                 | same                                                     | C1         |
| C8  | Complete brief is `ready`; `sensitive` rides every eligible reason    | P0   | unit  | same                                         | add test        | `complete briefs are ready and sensitive rides every eligible reason`               | `briefComplete: true` → `{ eligible: true, reason: "ready" }`; security + design_first/spec_amend/ready include `sensitive: true`                                                                      | same                                                     | C5, C6     |
| C9  | Omitted `briefComplete` with a priority is `auto_brief`               | P1   | unit  | same                                         | add test        | `omitted briefComplete with priority auto-briefs`                                   | a prioritized Todo with no `briefComplete` field returns `auto_brief`                                                                                                                                  | same                                                     | C4         |
| C10 | Step 7 routes `design_first` to `/design` before the code route       | P1   | unit  | same                                         | add test        | `step 7 routes design-first to design before the code route`                        | conduct.md Step 7 names `design_first` and requires `/design` before `/sdd-to-tdd`                                                                                                                     | same                                                     | C5         |
| C11 | Step 7 amends the spec before `/dispatch` writes the brief            | P1   | unit  | same                                         | add test        | `step 7 amends the owning spec before dispatch writes the brief`                    | conduct.md Step 7 amends then dispatch; sdd-to-tdd.md requires that spec path in Permissions Requested or STOPs                                                                                        | same                                                     | C6         |
| C12 | Pick calls the classifier and dispatches before ranking `Queue:`      | P1   | unit  | same                                         | add test        | `pick classifies then dispatches before ranking Queue`                              | conduct.md names `classifyConductEligibility` at pick; `/dispatch` runs before lowest-`Queue:` ranking                                                                                                 | same                                                     | C4, C7     |

## Traceability Matrix

| Criterion | Spec ref | Test file::name                                                                                                | Source file(s)                                      | Risk | Status  |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---- | ------- |
| C1        | G-CON1   | ready-brief-policy.test.mjs::classifyConductEligibility excludes migration, RLS, and unanswered clarifications | ready-brief-policy.mjs, conduct.md, dispatch.md     | P0   | planned |
| C2        | G-CON1   | ready-brief-policy.test.mjs::security payment and auth tickets are sensitive-eligible                          | ready-brief-policy.mjs, conduct.md                  | P0   | planned |
| C3        | G-CON1   | ready-brief-policy.test.mjs::qaMayReadyPr is false for a sensitive PR                                          | ready-brief-policy.mjs, ready-brief.mjs, conduct.md | P0   | planned |
| C4        | G-CON1   | ready-brief-policy.test.mjs::missing brief with priority auto-briefs via dispatch                              | ready-brief-policy.mjs, conduct.md, dispatch.md     | P1   | planned |
| C5        | G-CON1   | ready-brief-policy.test.mjs::new-scope and design-labelled tickets are design-first                            | ready-brief-policy.mjs, conduct.md, dispatch.md     | P1   | planned |
| C6        | G-CON1   | ready-brief-policy.test.mjs::answered clarification amends spec then completes the brief                       | ready-brief-policy.mjs, conduct.md, sdd-to-tdd.md   | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit / node:test).
- Cloud test stack is not required.

## Permissions Requested

- Spec edit: `docs/specs/dev-toolchain.md` — G-CON1 item 20 and the G-CON1
  implementation-trace row only. Do not touch G-TD1.
- Existing-test add (do not rewrite existing bodies):
  `.cursor/checks/ready-brief-policy.test.mjs` — established G-RDY1 suite;
  Red may add new `test()` blocks here even though the path is outside
  `tests/**`.
  `tests/unit/dev-toolchain/conduct-command.test.ts` — add only if a later
  phase must; prefer the policy file so existing needles stay intact.

Allowed source (Green/Refactor, from the Ready brief):
`.cursor/commands/conduct.md`, `.cursor/commands/dispatch.md`,
`.cursor/commands/sdd-to-tdd.md`, `.cursor/hooks/lib/ready-brief-policy.mjs`,
`.cursor/checks/ready-brief.mjs`.

## TDD Execution Loop

### Criterion C1 — Exclusions stay (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `classifyConductEligibility excludes migration, RLS, and unanswered clarifications`
  in `.cursor/checks/ready-brief-policy.test.mjs`. It must fail because
  `classifyConductEligibility` is missing or returns eligible for
  `scope: "migration"`, `scope: "rls"`, and `unansweredClarification: true`.
  Also assert conduct.md names those three exclusions. Command:
  `node --test .cursor/checks/ready-brief-policy.test.mjs`.
- **Green** → Invoke `tdd-green` to export `classifyConductEligibility` and
  update conduct.md / dispatch.md exclusions only. Exit = that test green.
- **Refactor** → Invoke `tdd-refactor` to clean C1. Exit = test green +
  `pnpm lint` + `pnpm typecheck` + prettier --check on touched source.

### Criterion C2 — Sensitive eligibility (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `security payment and auth tickets are sensitive-eligible`. Fail until
  security/payment/auth records return `{ eligible: true, sensitive: true }`
  and conduct.md requires a regression test, `sensitive` label, and body
  line. Command: same node:test file.
- **Green** → Invoke `tdd-green` to classify those classes as sensitive and
  document the PR label/body/regression-test rule in conduct.md.
- **Refactor** → Invoke `tdd-refactor` to clean C2. Same exit gates.

### Criterion C3 — QA never readies sensitive (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `qaMayReadyPr is false for a sensitive PR`. Fail until
  `qaMayReadyPr({ labels: ["sensitive"] }) === false` and a non-sensitive
  PR is true, and conduct.md says QA posts the digest and waits for Jose.
  Optional: `node .cursor/checks/ready-brief.mjs --classify -` prints
  `sensitive` for a JSON record. Command: same node:test file.
- **Green** → Invoke `tdd-green` to export `qaMayReadyPr` and the classify
  CLI, and update conduct.md. Do not edit `ready-merge-release.md` (not
  listed). If that command still auto-readies, log a residual finding.
- **Refactor** → Invoke `tdd-refactor` to clean C3. Same exit gates.

### Criterion C4 — Auto-brief (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `missing brief with priority auto-briefs via dispatch`. Fail until a
  Todo + current cycle + priority + no unanswered clarif + incomplete
  brief returns `auto_brief`, conduct.md pick runs `/dispatch` then
  starts, and dispatch.md no longer says there is no priority/`security`
  gate. Command: same node:test file.
- **Green** → Invoke `tdd-green` to return `auto_brief` and update
  conduct.md pick + dispatch Cloud lane.
- **Refactor** → Invoke `tdd-refactor` to clean C4. Same exit gates.

### Criterion C5 — Design-first (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `new-scope and design-labelled tickets are design-first`. Fail until
  `scope: "new-scope"` or label `/design` returns `design_first` and
  conduct.md says the first PR is spec + plan, no application code.
- **Green** → Invoke `tdd-green` to return `design_first` and update
  conduct.md / dispatch.md.
- **Refactor** → Invoke `tdd-refactor` to clean C5. Same exit gates.

### Criterion C6 — Spec amend then brief (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `answered clarification amends spec then completes the brief`. Fail
  until `answeredClarification: true` plus a missing brief `spec` field
  returns `spec_amend`, and both conduct.md and sdd-to-tdd.md say
  `/conduct` may apply the decided behaviour to the owning spec first
  (FIX-mode order) then write the brief.
- **Green** → Invoke `tdd-green` to return `spec_amend` and update
  conduct.md + sdd-to-tdd.md.
- **Refactor** → Invoke `tdd-refactor` to clean C6. Same exit gates.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-149_conduct_eligibility_08ba`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-149_conduct_eligibility_08ba.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md` (G-CON1 only)
Criteria: 6 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test add `.cursor/checks/ready-brief-policy.test.mjs`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-149_conduct_eligibility_08ba.plan.md`

Problem: `/conduct` still requires a hand-written Ready brief and does not encode Jose's 08:08 CEST 10 Oct 2026 any-issue rules. Security, payment, and auth stay informal; QA can ready those PRs; migrations and unanswered clarifications are not mechanically excluded.
Approach: Amend G-CON1 only. Classify eligibility in ready-brief-policy.mjs. Sensitive tickets stay eligible with a regression test, a `sensitive` label, and a body line; QA posts the digest and waits for Jose. `/conduct next` runs `/dispatch` to write a brief for a prioritized current-cycle Todo. New-scope or /design-labelled work is design-first. Answered clarifications amend the spec first, then complete the brief.
Out-of-scope findings: ready-merge-release.md still documents QA readying any clean draft · medium

| #   | Criterion                  | Risk | Layer | Test file                                  |
| --- | -------------------------- | ---- | ----- | ------------------------------------------ |
| 1   | Exclusions stay            | P0   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
| 2   | Sensitive eligibility      | P0   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
| 3   | QA never readies sensitive | P0   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
| 4   | Auto-brief                 | P1   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
| 5   | Design-first               | P1   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
| 6   | Spec amend then brief      | P1   | unit  | .cursor/checks/ready-brief-policy.test.mjs |
```

## Docs Sync

Execution-start todo: `start-linear` first.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-149_conduct_eligibility_08ba
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-149
- criteria_shipped: [C1, C2, C3, C4, C5, C6]
- criteria_manual_uat: none
- req_ids: [G-CON1]
- source_paths: [.cursor/hooks/lib/ready-brief-policy.mjs, .cursor/checks/ready-brief.mjs, .cursor/commands/conduct.md, .cursor/commands/dispatch.md, .cursor/commands/sdd-to-tdd.md, docs/specs/dev-toolchain.md]
- test_paths: [.cursor/checks/ready-brief-policy.test.mjs]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-149_conduct_eligibility_08ba.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                                 | Where                                     | Why it matters                                            | Severity  | Relation                                |
| ------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- | --------- | --------------------------------------- |
| QA `/ready-merge-release` still readies any clean draft | `.cursor/commands/ready-merge-release.md` | C3 cannot wire the QA command; it is not in Allowed edits | P1 / High | leftover if Green cannot edit that file |

## Linear Close-out & Findings Registration

- START: RES-149, plan `res-149_conduct_eligibility_08ba`, digest above,
  `run_in_background: true`.
- Close-out: FIX resolution comment on RES-149 after 4C.
- Findings: attach-only on managed Cloud; leave new-issue lines on the
  ledger.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [auth] sensitive eligibility and QA-ready deny
- [public-api] classifyConductEligibility order
- [schema] G-CON1-only spec edit vs G-TD1

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-149_conduct_eligibility_08ba`: pending

## First Execution Action

Invoke the `linear-resolver` subagent to start work on RES-149 (plan:
`res-149_conduct_eligibility_08ba`), posting this plan's Linear Plan Digest
as the `Work started:` comment. Task `run_in_background: true`. Do not wait
before the G-CON1 spec edit or C1 Red.

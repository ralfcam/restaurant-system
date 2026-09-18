## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your only direct writes are the approved `docs/specs/dev-toolchain.md` edit,
  the findings revision pass, and the TDD close-out log. Managed Cloud may also
  write this work-order before execution. Every test change comes from
  `tdd-red`; every source change comes from `tdd-green`; cleanup and
  re-verification come from `tdd-refactor`.
- Run one Task call per phase, sequentially. Do not advance unless the phase's
  actual test result proves its exit condition; skipped or zero-test runs are
  BLOCKED.
- Never pass `model` on named phase, docs-updater, or linear-resolver Task
  calls. Agent frontmatter owns model selection.
- The parent MUST NOT edit `tests/**` or source files. It may only perform the
  approved spec edit, findings/log close-out, and mechanical formatting on
  already-dirty paths.
- After every phase, reconcile the phase's residual findings into
  `docs/findings/runs/pr128_cr_loc_8f2c1a90.md`; remove resolved/process
  entries and preserve only genuine out-of-scope debt.
- After each Refactor, append its suggested review order and reusable-pattern
  result to `docs/verifier-reports/tdd/pr128_cr_loc_8f2c1a90.md`.
- Close out in this order: 4D review trail → 4E traceability/run metrics → Docs
  sync packet → background docs-updater and returned report → findings merge
  and registration → format dirty paths → local CodeRabbit attempt → commit
  gate → push gate.
- No Linear START or CLOSE-OUT applies because this is an untracked free-text
  fix. New Linear finding issues are never auto-confirmed.
- If a phase, docs sync, finding registration, commit, or push is blocked,
  stop. Never ready or merge the PR.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = `managed`
- Work-order: `.cursor/plans/pr128_cr_loc_8f2c1a90.plan.md`
- Workflow mode: FIX (free-text CodeRabbit finding; no Linear issue)

## Project & Milestone Route

- Team/project: untracked tooling maintenance; no Linear allocation
- Work type: test/audit
- Milestone: M5 planning hint
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause

- Issue: PR 128 has one unresolved Major on
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`. G-DES1 is marked
  shipped while the regression only pins the positive `managed` token and
  `/design` membership. A future extra accepted runtime value, or removal of
  the one-shot command set, would still pass.
- Pattern evidence: the previous run already recorded both gaps as test-debt.
  Sibling managed-Cloud tests (`triage-cloud-one-shot`, `capture-cloud-phase5`)
  are also chrome-scan contracts; hook-authoring's spawn-level "live denial"
  applies to Cursor hooks, not agent-followed command markdown. The executable
  analogue here is an executed Vitest pin of the fail-closed classification.
- Missing constraint (root cause): G-DES1's regression guard does not require
  isolated STEP 0 to name the fail-closed runtime values and state that they
  MUST NOT enter STEP 0B, and does not require the isolated
  `**Managed Cloud-capable:**` paragraph to name `/sdd-to-tdd`, `/capture`,
  and `/triage` as the one-shot commands.
- Pre-mortem/inversion: today's tests can pass if STEP 0 keeps the word
  `managed` while accepting `self-hosted`, or if the index keeps `/design`
  while dropping the one-shot trio.
- Spec update proposed: extend `docs/specs/dev-toolchain.md` G-DES1 so the
  regression guard MUST fail unless those fail-closed and one-shot pins are
  present. Do not treat G-DES1 as shipped until both pins execute.

## Spec

- Source: existing `docs/specs/dev-toolchain.md` — G-DES1
- Summary: managed `/design` stays interactive. Its regression must now pin
  the fail-closed runtime denial and the one-shot command-index members, not
  only the positive `managed` path and `/design` link.
- Clarifications needed: none

## Acceptance Criteria → Tests

| #   | Criterion                                                                                | Risk | Layer | Test file                                                | New or existing | Test name                                             | Assertion                                                                                                                                                                                                      | Command                                                                 | Depends on |
| --- | ---------------------------------------------------------------------------------------- | ---- | ----- | -------------------------------------------------------- | --------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 1   | G-DES1c — fail-closed runtimes MUST NOT enter STEP 0B                                    | P2   | unit  | `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | existing        | `denies unsupported runtimes before STEP 0B`          | isolated STEP 0 names `self-hosted`, `unknown`, empty body, and any other non-`managed` value as fail-closed and states they MUST NOT enter STEP 0B                                                            | `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | spec edit  |
| 2   | G-DES1d — command index names the one-shot members separately from interactive `/design` | P2   | unit  | `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | existing        | `indexes one-shot commands beside interactive design` | isolated `**Managed Cloud-capable:**` paragraph contains the `/sdd-to-tdd`, `/capture`, and `/triage` command links plus the `one-shot commands` group label, and still distinguishes `/design` as interactive | `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | C1 green   |

## Traceability Matrix

| Criterion | Spec ref                  | Test file::name                                                                      | Source file(s)               | Risk | Status  |
| --------- | ------------------------- | ------------------------------------------------------------------------------------ | ---------------------------- | ---- | ------- |
| G-DES1c   | `dev-toolchain.md` G-DES1 | `design-cloud-dialogue.test.ts::denies unsupported runtimes before STEP 0B`          | `.cursor/commands/design.md` | P2   | planned |
| G-DES1d   | `dev-toolchain.md` G-DES1 | `design-cloud-dialogue.test.ts::indexes one-shot commands beside interactive design` | `.cursor/README.md`          | P2   | planned |

## Execution Preconditions

- Infra needed: none (unit/source-scan checks only)
- Required command:
  `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`

## Permissions Requested (before execution)

- Spec edit: `docs/specs/dev-toolchain.md` — make both missing G-DES1
  regression pins normative before tests.
- Existing-test edit:
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` — strengthen the
  existing owner file; a new file would duplicate its fixture and contract.

Managed Cloud one-shot authorization is bounded to those exact paths.

## TDD Execution Loop

### Criterion 1 — Fail-closed runtime denial (layer: unit)

- **Red** → Invoke `tdd-red` to edit
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`, adding
  `denies unsupported runtimes before STEP 0B`; run the focused test and
  require RED because isolated STEP 0 does not yet say unsupported runtimes
  MUST NOT enter STEP 0B.
- **Green** → Invoke `tdd-green` to minimally change
  `.cursor/commands/design.md` STEP 0 so `self-hosted`, `unknown`, empty
  body, and every other non-`managed` value fail closed and MUST NOT enter
  STEP 0B; exit only when the focused test is green and typecheck has no
  regression.
- **Refactor** → Invoke `tdd-refactor` to verify G-DES1c, keep the exact
  managed-only gate, and run the focused test, lint, typecheck, and Prettier
  on touched source.

### Criterion 2 — One-shot command-index members (layer: unit)

- **Red** → Invoke `tdd-red` to edit
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`, adding
  `indexes one-shot commands beside interactive design`; isolate the
  `**Managed Cloud-capable:**` paragraph and require RED because it does not
  yet label `/sdd-to-tdd`, `/capture`, and `/triage` as the `one-shot
commands` group.
- **Green** → Invoke `tdd-green` to minimally label those three commands as
  the one-shot group in `.cursor/README.md` while keeping `/design`
  interactive; exit only when the focused test is green.
- **Refactor** → Invoke `tdd-refactor` to verify G-DES1d and run the focused
  test, lint, typecheck, and Prettier on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

- No `start-linear` or `4b-linear` todo; no tracked issue.
- `4d-review-trail` — INPUT:
  `docs/verifier-reports/tdd/pr128_cr_loc_8f2c1a90.md`; OUTPUT: append
  `## Suggested Review Order (collated)`.
- `4e-traceability` — INPUT: the same TDD log; OUTPUT: append
  `## Traceability (final)` and `## Run metrics`.
- `4-docs-packet` — assemble the completed Docs sync packet.
- `4-docs-updater` — invoke `docs-updater` in the background with that packet
  and wait for its report before findings close-out.
- `4c-findings` — INPUT: `docs/findings/runs/pr128_cr_loc_8f2c1a90.md`; merge
  genuine open findings into the category bus, register per policy, and prune
  the run file. Remove the two prior test-debt lines this run implements.
- `4-format` — INPUT: this run's dirty paths from
  `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <paths>`
  (never `.`), then the scoped CodeRabbit attempt, commit, and push gates.

## Out-of-Scope Findings

| Finding                                                    | Where                                                             | Why it matters                                                                                                                                 | Severity | Relation           |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| Other managed-runtime command probes still use Bash syntax | `.cursor/commands/{sdd-to-tdd,capture,triage}.md` STEP 0          | Same PowerShell-contract inconsistency; already on the tech-debt ledger and outside this Major.                                                | Medium   | existing tech-debt |
| PowerShell probe wiring is asserted as independent tokens  | `design-cloud-dialogue.test.ts` PowerShell assertions             | `$socket` could stop reaching `--unix-socket` while token checks still pass. Already on the test-debt ledger; not this Major's required pin.   | Low      | existing test-debt |
| Historical `/design` work-order is not a G-DES1 artifact   | `.cursor/plans/pr128_design_coderabbit_followup_9b41c7d2.plan.md` | A later review asked to replace that `/sdd-to-tdd` protocol with `/design`'s. G-CR3 skips `.cursor/plans/`; rewriting history is out of scope. | Medium   | process-meta skip  |

## Linear Close-out & Findings Registration

- No tracked source issue, so START and FIX close-out are omitted.
- Merge and process only this run's out-of-scope findings under the shared
  filing policy. Do not auto-create a Linear issue.

## Suggested Review Order

- fail-closed gate → `.cursor/commands/design.md` STEP 0
- regression strength → `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`
- one-shot vs interactive index → `.cursor/README.md`
- normative trace → `docs/specs/dev-toolchain.md` G-DES1

## Retrospective

- Patterns to promote: none anticipated.
- Traceability and run metrics: finalize after both Refactors.

## First Execution Action

Apply the approved `docs/specs/dev-toolchain.md` G-DES1 edit exactly as listed
under Permissions Requested, then arm the TDD guard and invoke `tdd-red` for
Criterion 1. After successful close-out, execute `/commit` and `/push`; never
ready or merge PR 128.

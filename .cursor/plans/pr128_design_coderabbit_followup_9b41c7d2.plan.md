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
  `docs/findings/runs/pr128_design_coderabbit_followup_9b41c7d2.md`; remove
  resolved/process entries and preserve only genuine out-of-scope debt.
- After each Refactor, append its suggested review order and reusable-pattern
  result to
  `docs/verifier-reports/tdd/pr128_design_coderabbit_followup_9b41c7d2.md`.
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
- Work-order:
  `.cursor/plans/pr128_design_coderabbit_followup_9b41c7d2.plan.md`
- Workflow mode: FIX (free-text CodeRabbit findings; no Linear issue)

## Project & Milestone Route

- Team/project: untracked tooling maintenance; no Linear allocation
- Work type: maintenance
- Milestone: M9 planning hint
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause

- Issue: PR 128 has two unresolved Major CodeRabbit findings. The new
  `/design` runtime probe uses a Bash fence and `${...}` expansion despite the
  workspace PowerShell command contract; the regression test only proves that
  `/design` is absent from the Plan-Mode-only paragraph and present somewhere
  in the index, so it does not prove managed-interactive classification.
- Pattern evidence: `.cursor/rules/powershell.mdc` and
  `.cursor/rules/test-execution-integrity.mdc` use PowerShell `$env:` syntax;
  the command index already separates Plan-Mode-only and managed-capable
  commands, but the test does not isolate the latter paragraph.
- Missing constraint (root cause): G-DES1 does not explicitly require its
  executable probe example to use PowerShell syntax or require the command
  index to carry an explicit managed-Cloud classification marker.
- Pre-mortem/inversion: the current test can pass if `/design` is moved to an
  unrelated index paragraph, and copied Bash syntax can fail when followed in
  the repository's documented shell environment.
- Spec update proposed: extend `docs/specs/dev-toolchain.md` G-DES1 with:
  1. the runtime-probe example MUST be a PowerShell code fence using
     `$env:CURSOR_AGENT_SOCKET` with the socket fallback and an external curl
     invocation, and MUST NOT use Bash `${...}` syntax; and
  2. `.cursor/README.md` MUST place `/design` in an explicit
     `**Managed Cloud-capable:**` paragraph identifying it as interactive, and
     the regression test MUST isolate that paragraph.

## Spec

- Source: existing `docs/specs/dev-toolchain.md` — G-DES1
- Summary: managed `/design` remains interactive, while its executable probe
  and command-index classification become explicit, PowerShell-compatible,
  and regression-protected.
- Clarifications needed: none

## Acceptance Criteria → Tests

| #   | Criterion                                                                      | Risk | Layer | Test file                                                | New or existing | Test name                                              | Assertion                                                                                                                                               | Command                                                                 | Depends on |
| --- | ------------------------------------------------------------------------------ | ---- | ----- | -------------------------------------------------------- | --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| 1   | G-DES1a — `/design` publishes a PowerShell runtime probe                       | P2   | unit  | `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | existing        | `uses PowerShell syntax for the managed runtime probe` | isolated STEP 0 contains a `powershell` fence, `$env:CURSOR_AGENT_SOCKET`, fallback socket, and external curl invocation; excludes Bash fence/expansion | `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | spec edit  |
| 2   | G-DES1b — command index explicitly classifies `/design` as managed-interactive | P2   | unit  | `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | existing        | `indexes design under managed Cloud-capable commands`  | isolated `**Managed Cloud-capable:**` paragraph contains `/design` and its interactive approval language                                                | `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` | C1 green   |

## Traceability Matrix

| Criterion | Spec ref                  | Test file::name                                                                       | Source file(s)               | Risk | Status  |
| --------- | ------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- | ---- | ------- |
| G-DES1a   | `dev-toolchain.md` G-DES1 | `design-cloud-dialogue.test.ts::uses PowerShell syntax for the managed runtime probe` | `.cursor/commands/design.md` | P2   | planned |
| G-DES1b   | `dev-toolchain.md` G-DES1 | `design-cloud-dialogue.test.ts::indexes design under managed Cloud-capable commands`  | `.cursor/README.md`          | P2   | planned |

## Execution Preconditions

- Infra needed: none (unit/source-scan checks only)
- Required command:
  `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`

## Permissions Requested (before execution)

- Spec edit: `docs/specs/dev-toolchain.md` — make both missing G-DES1
  constraints normative before tests.
- Existing-test edit:
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` — strengthen the
  existing owner test; a new file would duplicate its fixture and contract.

Managed Cloud one-shot authorization is bounded to those exact paths.

## TDD Execution Loop

### Criterion 1 — PowerShell runtime probe (layer: unit)

- **Red** → Invoke `tdd-red` to edit
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`, adding
  `uses PowerShell syntax for the managed runtime probe`; run the focused test
  and require RED because STEP 0 still contains a Bash fence/expansion.
- **Green** → Invoke `tdd-green` to minimally change
  `.cursor/commands/design.md` STEP 0 to a PowerShell probe using
  `$env:CURSOR_AGENT_SOCKET`, the default Unix-socket path, and an external
  curl application; exit only when the focused test is green and typecheck has
  no regression.
- **Refactor** → Invoke `tdd-refactor` to verify G-DES1a, retain the exact
  managed-only/fail-closed semantics, and run the focused test, lint,
  typecheck, and Prettier on touched source.

### Criterion 2 — Explicit managed command-index classification (layer: unit)

- **Red** → Invoke `tdd-red` to edit
  `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`, adding
  `indexes design under managed Cloud-capable commands`; isolate the explicit
  managed paragraph and require RED because the index currently has no
  `**Managed Cloud-capable:**` marker.
- **Green** → Invoke `tdd-green` to minimally label the managed-Cloud command
  paragraph in `.cursor/README.md` while preserving the one-shot versus
  interactive distinction; exit only when the focused test is green.
- **Refactor** → Invoke `tdd-refactor` to verify G-DES1b and run the focused
  test, lint, typecheck, and Prettier on touched source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

- No `start-linear` or `4b-linear` todo; no tracked issue.
- `4d-review-trail` — INPUT:
  `docs/verifier-reports/tdd/pr128_design_coderabbit_followup_9b41c7d2.md`;
  OUTPUT: append `## Suggested Review Order (collated)`.
- `4e-traceability` — INPUT: the same TDD log; OUTPUT: append
  `## Traceability (final)` and `## Run metrics`.
- `4-docs-packet` — assemble the completed Docs sync packet.
- `4-docs-updater` — invoke `docs-updater` in the background with that packet
  and wait for its report before findings close-out.
- `4c-findings` — INPUT:
  `docs/findings/runs/pr128_design_coderabbit_followup_9b41c7d2.md`; merge
  genuine open findings into the category bus, register per policy, and prune
  the run file.
- `4-format` — INPUT: this run's dirty paths from
  `git status --porcelain`; OUTPUT: `pnpm exec prettier --write <paths>` (never
  `.`), then the scoped CodeRabbit attempt, commit, and push gates.

## Out-of-Scope Findings

| Finding                                                    | Where                                                    | Why it matters                                                                                                                                  | Severity | Relation            |
| ---------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| Other managed-runtime command probes still use Bash syntax | `.cursor/commands/{sdd-to-tdd,capture,triage}.md` STEP 0 | They share the same workspace PowerShell inconsistency but were not findings on PR 128 and broadening this fix would exceed its reviewed scope. | Medium   | follow-up tech debt |

## Linear Close-out & Findings Registration

- No tracked source issue, so START and FIX close-out are omitted.
- Merge and process only this run's out-of-scope finding under the shared
  filing policy. Do not auto-create a Linear issue.

## Suggested Review Order

- command contract → `.cursor/commands/design.md` STEP 0
- regression strength → `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts`
- discoverability → `.cursor/README.md`
- normative trace → `docs/specs/dev-toolchain.md` G-DES1

## Retrospective

- Patterns to promote: none anticipated.
- Traceability and run metrics: finalize after both Refactors.

## First Execution Action

Apply the approved `docs/specs/dev-toolchain.md` G-DES1 edit exactly as listed
under Permissions Requested, then arm the TDD guard and invoke `tdd-red` for
Criterion 1. After successful close-out, execute `/commit` and `/push`; never
ready or merge PR 128.

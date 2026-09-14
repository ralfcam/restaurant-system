# TDD log — advisory_coderabbit_4g_af126342

FEATURE close-out recovery: G-CR2 is a mandatory advisory local JSONL attempt.
Receipts are audit-only; deterministic safety stays hard; remote G-CR3 stays
fail-closed.

**Close-out recovery.** Implementation and tests shipped in the prior Advisory
CodeRabbit 4G run. That run did not write this log or assemble a Docs sync
packet, so `/commit` returned CHANGES-REQUESTED. This file reconstructs the
review trail, traceability, and run metrics from the shipped tree. It does not
claim Red/Green/Refactor Task delegations that were not durably recorded.

Reusable pattern: none — this recovery has no Refactor-agent pattern records.

### spec-advisory-contract

Suggested review order:
- G-CR2 contract [security]: `docs/specs/dev-toolchain.md:151` mandatory
  advisory local JSONL review; findings and unavailability exit zero
- Hard deterministic boundaries [security]: `docs/specs/dev-toolchain.md:168`
  missing/malformed work order, secrets, unrelated dirt, empty surface, byte
  drift remain non-zero
- Receipt never authorizes commit [security]: `docs/specs/dev-toolchain.md:162`
- Unchanged G-CR3 [security]: `docs/specs/dev-toolchain.md:184` fail-closed
  remote review never substitutes for the local attempt
- Spec pin: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:305`
  `G-CR2 makes local review outcomes advisory but keeps deterministic safety hard`

### advisory-gate-tdd

Suggested review order:
- Work-order preflight [security]: `.cursor/checks/coderabbit-gate.mjs:48`
  `loadWorkOrder` fails missing/malformed; `:232` `evaluateWorkOrder` fails
  secret/unrelated/empty surfaces before review
- Advisory mapping [security]: `.cursor/checks/coderabbit-gate.mjs:181`
  `unavailable`; `:193` `evaluateAdvisoryJsonl` maps `unresolved_findings` to
  `attemptStatus: "findings"` and other review failures to `unavailable`
- Stream evaluation [security]: `.cursor/hooks/lib/coderabbit-review-policy.mjs:252`
  `evaluateAgentStream`; `:406` `evaluateWorkOrder`; `:445` `buildReceipt`
  schema-2 `attemptStatus`/`reason`/dispositions
- Post-attempt rehash [security]: `.cursor/checks/coderabbit-gate.mjs:298`
  re-hash then `fail("changed_bytes")` before writing a successful receipt
- Executed pins: `.cursor/checks/coderabbit-gate.test.mjs:125` findings and
  unavailable exit 0; `:191` missing/malformed/empty fail hard; `:256`
  changed dirty bytes fail hard; `:247` review process failures are
  `unavailable`

### commit-decoupling-tdd

Suggested review order:
- Receipt-independent open [security]: `.cursor/hooks/lib/tdd-guard-policy.mjs:172`
  `openCommitGate` clears `loopRan` only; `:205` `evaluateGateOpen` returns
  `receiptIndependent: true` without reading a receipt
- Commit permission [security]: `.cursor/hooks/lib/tdd-guard-policy.mjs:218`
  `evaluateGitCommitPermission` still denies `loopRan` and exemption path
  mismatch
- Hook decoupling [security]: `.cursor/hooks/tdd-guard.mjs:55` `gate open`
  calls `openCommitGate` only; `.cursor/hooks/git-stage-guard.mjs:83`
  `evaluateGitCommitPermission` with no receipt; `.cursor/hooks/after-git-commit.mjs`
  docs-sync only (no receipt bind)
- Executed pins: `.cursor/checks/coderabbit-review-policy.test.mjs:238` gate
  open is receipt-independent; `:296` git commit ignores audit receipts;
  `.cursor/checks/tdd-guard-policy.test.mjs:120` commit authorization hooks
  do not read or mutate receipts; `.cursor/checks/coderabbit-gate.test.mjs:323`
  gate open without a receipt; `:371` old opened receipt cannot ghost-block

### mirror-cleanup

Suggested review order:
- Soften removal [security]: `.cursor/hooks/lib/coderabbit-review-policy.mjs`
  `applyWaivers` classifies by severity/fingerprint only; no
  `isRecordedNotBlocking` / content-class matcher
- Mirror pins [public-api]: `.cursor/checks/harness-lint.mjs` `CODERABBIT_MIRROR_NEEDLES`
  require mandatory advisory attempt wording; `CODERABBIT_MIRROR_FORBIDDEN`
  rejects receipt-gated commit wording
- Command/rule/runbook: `.cursor/commands/sdd-to-tdd.md` STEP 4G advisory;
  `.cursor/commands/commit.md` receipts audit-only; `.cursor/commands/push.md`
  missing receipt non-blocking; `.cursor/rules/coderabbit-integration.mdc`;
  `docs/runbooks/coderabbit.md`
- Executed pin: `.cursor/checks/harness-lint.test.mjs` CodeRabbit factory
  mirrors pass live files and fail each missing/forbidden clause

### verify-advisory-flow

Suggested review order:
- Local vs remote split [security]: advisory G-CR2 in
  `.cursor/checks/coderabbit-gate.mjs` versus fail-closed G-CR3 in
  `.cursor/checks/coderabbit-pr-gate.mjs` / `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
  / `.github/workflows/coderabbit-main-gate.yml`
- Smoke evidence: live 4G against the accumulated toolchain dirty tree exited
  0 with `attemptStatus: "findings"` / `reason: "unresolved_findings"`; then
  `node .cursor/hooks/tdd-guard.mjs gate open` succeeded without a receipt
  dependency. Prior `/commit` still blocked on this missing log.
- Executed pins: `node --test ".cursor/checks/**/*.test.mjs"`; `pnpm test:unit`
  `coderabbit-gcr2-empty-reviewed-files.test.ts` and
  `coderabbit-gcr3-mustfixes.test.ts`; `pnpm lint`; `pnpm typecheck`; dirty-set
  Prettier; `node .cursor/checks/harness-lint.mjs`

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from the shipped tree at close-out recovery.

1. **Deterministic safety and post-attempt rehash [security]** —
   `.cursor/checks/coderabbit-gate.mjs:48` `loadWorkOrder`; `:232`
   `evaluateWorkOrder`; `:298` re-hash then `fail("changed_bytes")`.
2. **Advisory mapping vs commit authorization [security]** —
   `.cursor/checks/coderabbit-gate.mjs:181` `unavailable`; `:193`
   `evaluateAdvisoryJsonl`; `.cursor/hooks/lib/coderabbit-review-policy.mjs:252`
   `evaluateAgentStream`; `:445` `buildReceipt` schema-2 metadata.
3. **Receipt-independent TDD/staging guards [security]** —
   `.cursor/hooks/lib/tdd-guard-policy.mjs:172` `openCommitGate`; `:205`
   `evaluateGateOpen`; `:218` `evaluateGitCommitPermission`;
   `.cursor/hooks/git-stage-guard.mjs:83` still denies `loopRan` and exemption
   mismatch.
4. **Softening removed; mirrors pin advisory wording [public-api]** —
   no content-class matcher in `applyWaivers`; harness needles/forbidden
   clauses; STEP 4G / `/commit` / `/push` / runbook / rule.
5. **Remote G-CR3 non-regression [security]** —
   `.cursor/checks/coderabbit-pr-gate.mjs`,
   `.cursor/hooks/lib/coderabbit-pr-policy.mjs`,
   `.github/workflows/coderabbit-main-gate.yml`, and
   `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` remain
   fail-closed.

## Traceability (final)

Run: 2026-09-14 · plan: advisory_coderabbit_4g_af126342 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| spec-advisory-contract | G-CR2 §8 | coderabbit-gcr2-empty-reviewed-files.test.ts::G-CR2 makes local review outcomes advisory but keeps deterministic safety hard | docs/specs/dev-toolchain.md (G-CR2 §8) | P1 | shipped |
| advisory-gate-tdd | G-CR2 §8 | coderabbit-gate.test.mjs::findings and unavailable review outcomes are advisory audit attempts | .cursor/checks/coderabbit-gate.mjs; .cursor/hooks/lib/coderabbit-review-policy.mjs | P1 | shipped |
| commit-decoupling-tdd | G-CR2 §8 | coderabbit-review-policy.test.mjs::gate open is receipt-independent while exemption paths stay bounded; tdd-guard-policy.test.mjs::commit authorization hooks do not read or mutate CodeRabbit receipts | .cursor/hooks/lib/tdd-guard-policy.mjs; .cursor/hooks/tdd-guard.mjs; .cursor/hooks/git-stage-guard.mjs; .cursor/hooks/after-git-commit.mjs | P1 | shipped |
| mirror-cleanup | G-CR2 §8 | harness-lint.test.mjs::CodeRabbit factory mirrors pass live files and fail each missing clause | .cursor/checks/harness-lint.mjs; .cursor/commands/sdd-to-tdd.md; .cursor/commands/commit.md; .cursor/commands/push.md; .cursor/rules/coderabbit-integration.mdc; docs/runbooks/coderabbit.md | P2 | shipped |
| verify-advisory-flow | G-CR2 §8 + G-CR3 §9 | coderabbit-gcr2-empty-reviewed-files.test.ts; coderabbit-gcr3-mustfixes.test.ts; live 4G findings + receipt-independent gate open | .cursor/checks/coderabbit-gate.mjs; .cursor/checks/coderabbit-pr-gate.mjs; .cursor/hooks/lib/coderabbit-pr-policy.mjs | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: advisory_coderabbit_4g_af126342
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 0 (close-out recovery only; original Red/Green/Refactor Task counts were not durably recorded)
Back-loops: close-out artifacts: 1 extra `/sdd-to-tdd` recovery after `/commit` CHANGES-REQUESTED (missing tdd log + docs packet)
BLOCKED events: none
Issues: n/a

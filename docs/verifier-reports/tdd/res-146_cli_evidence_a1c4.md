# TDD log — res-146_cli_evidence_a1c4

## C1 — missing CLI versus version mismatch

Suggested review order: classify empty or ENOENT as `cli_missing`, then reinstall once on branch-diff [security] `.cursor/hooks/lib/coderabbit-review-policy.mjs` `assertPinnedUsAuth` → `.cursor/checks/coderabbit-gate.mjs` `shouldReinstallCli`

Reusable pattern: none

## C2 — bot skip and stale approval follow head CLI evidence

Suggested review order: a bot skip is ready when any CLI evidence status is recorded for the same head; non-bot stale approval still needs `clean` [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `cliEvidenceStatusForHead` / `headHasBotSkipNotice`

Reusable pattern: none

## C3 — agents stop on the draft; QA owns readiness

Suggested review order: `/push` is the only agent CodeRabbit gate and leaves a draft [security] `.cursor/commands/conduct.md` / `.cursor/commands/push.md`

Reusable pattern: none

## C4 — two fix rounds, three CLI passes

Suggested review order: pass 1 routes every finding; pass 2 routes only Critical, Major, and unknown; pass 3 lists leftovers [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `decidePushCliAction`

Reusable pattern: none

## C5 — bot PRs do not wait on a formal review or a review trigger

Suggested review order: readiness for a bot PR is recorded CLI evidence on the head plus QA UAT; nobody posts a review trigger [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `evaluateReadyPr` / `.cursor/commands/ready-merge-release.md`

Reusable pattern: none

## Docs sync packet

skip_reason: normative spec, runbook, and command mirrors were edited in this same change. No separate docs-updater pass before commit.

## Suggested Review Order (collated)

- `cli_missing` versus `version_mismatch`, then one helper install on `--branch-diff` → `.cursor/hooks/lib/coderabbit-review-policy.mjs`, `.cursor/checks/coderabbit-gate.mjs`, `.cursor/cloud-install-coderabbit.sh`
- Bot skip and stale approval use clean head CLI evidence → `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
- Trigger dropped after HTTP 403 on PR 201 → `docs/specs/dev-toolchain.md` G-CR3
- Agents do not call `/ready-merge-release` or mark ready; QA `ralfcam` does → `.cursor/commands/conduct.md`, `.cursor/commands/push.md`
- `--fix-round` capped at 2 → `.cursor/hooks/lib/coderabbit-review-policy.mjs` `resolvePushPriorRound`, `.cursor/checks/coderabbit-gate.mjs`
- Bot-PR readiness is CLI evidence plus QA UAT, with no review trigger → `docs/specs/dev-toolchain.md` G-CR3, `docs/runbooks/coderabbit.md`

## Traceability (final)

Run: 2026-10-09 · plan: res-146_cli_evidence_a1c4 · issue: RES-146

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | docs/specs/dev-toolchain.md G-CR2 | .cursor/checks/coderabbit-review-policy.test.mjs::pinned US auth rejects version and region mismatch | .cursor/hooks/lib/coderabbit-review-policy.mjs assertPinnedUsAuth | P1 | shipped |
| C2 | docs/specs/dev-toolchain.md G-CR3 | .cursor/checks/coderabbit-pr-policy.test.mjs::bot skip with no CLI evidence is coderabbit_review_skipped | .cursor/hooks/lib/coderabbit-pr-policy.mjs evaluateReadyPr | P1 | shipped |
| C3 | docs/specs/dev-toolchain.md G-CR2, G-CON1 | tests/unit/dev-toolchain/coderabbit-res146-guards.test.ts::G-CR2 makes /push the only agent CodeRabbit gate | .cursor/commands/conduct.md, .cursor/commands/push.md | P1 | shipped |
| C4 | docs/specs/dev-toolchain.md G-CR2 | .cursor/checks/coderabbit-pr-policy.test.mjs::push CLI action routes two fix rounds then leftover-pushes | .cursor/hooks/lib/coderabbit-pr-policy.mjs decidePushCliAction | P1 | shipped |
| C5 | docs/specs/dev-toolchain.md G-CR3, G-CON1 | .cursor/checks/coderabbit-pr-policy.test.mjs::bot skip with findings or unavailable CLI evidence is ready_cli_evidence | .cursor/hooks/lib/coderabbit-pr-policy.mjs evaluateReadyPr | P1 | shipped |

## Run metrics

Run: 2026-10-09 → 2026-10-09 · plan: res-146_cli_evidence_a1c4
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 0 (harness node:test; tdd-red cannot write `.cursor/checks`)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 0 left on ledger

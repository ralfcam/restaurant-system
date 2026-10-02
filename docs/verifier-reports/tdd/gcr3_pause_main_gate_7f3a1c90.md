# TDD close-out gcr3_pause_main_gate_7f3a1c90

### C1

Suggested review order: paused job [security] `.github/workflows/coderabbit-main-gate.yml:34` → header no longer describes a running check `.github/workflows/coderabbit-main-gate.yml:3` → pause sentence `.github/workflows/coderabbit-main-gate.yml:40` → forbidden old executor [security] `.cursor/checks/harness-lint.mjs:565`

Reusable pattern: A paused `if: false` workflow comment may explain that an event is not an Actions trigger, and must not tell the reader to re-run that job.

### C2

Suggested review order: Pause exemption [security] `.cursor/rules/coderabbit-integration.mdc:72` → Pause exemption [security] `.cursor/commands/ready-merge-release.md:142` → Pause exemption `.cursor/commands/push.md:295` → Pause exemption `.cursor/rules/linear-automation.mdc:329` → Adapter review remains [security] `.cursor/commands/ready-merge-release.md:139` → Adapter review remains `.cursor/rules/coderabbit-integration.mdc:36` → Canary no longer waits `docs/runbooks/coderabbit.md:417` → Ruleset omits the paused check [security] `docs/runbooks/coderabbit.md:407`

Reusable pattern: When an Actions promotion check is paused with `if: false`, keep its name in command mirrors and drop it from operator wait steps; the read-only adapter stays the review, and the ruleset must not list that check.

## Suggested Review Order (collated)

- Security of the paused job → `.github/workflows/coderabbit-main-gate.yml:34`, `.cursor/checks/harness-lint.mjs:565`, `docs/runbooks/coderabbit.md:407`
- Promotion prose no longer requires the check → `.cursor/rules/coderabbit-integration.mdc:72`, `.cursor/commands/ready-merge-release.md:142`, `.cursor/commands/push.md:295`, `.cursor/rules/linear-automation.mdc:329`
- Adapter review remains → `.cursor/commands/ready-merge-release.md:139`, `.cursor/rules/coderabbit-integration.mdc:36`
- Canary no longer waits → `docs/runbooks/coderabbit.md:417`

## Traceability (final)

Run: 2026-10-02 · plan: gcr3_pause_main_gate_7f3a1c90 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | dev-toolchain.md G-CR3 | coderabbit-pr-policy.test.mjs::main-gate workflow is read-only, staging→main, and named US latest-head | .github/workflows/coderabbit-main-gate.yml, .cursor/checks/harness-lint.mjs | P1 | shipped |
| C2 | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::paused main gate is not a required promotion check | .cursor/commands/ready-merge-release.md, .cursor/rules/coderabbit-integration.mdc, .cursor/commands/push.md, .cursor/rules/linear-automation.mdc, docs/runbooks/coderabbit.md | P1 | shipped |

## Run metrics

Run: 2026-10-02 → 2026-10-02 · plan: gcr3_pause_main_gate_7f3a1c90
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: C1: 1 extra Green revert before Red was observed
BLOCKED events: 0
Issues: 0 filed · 0 attached · 4 left on ledger — cap 3/run

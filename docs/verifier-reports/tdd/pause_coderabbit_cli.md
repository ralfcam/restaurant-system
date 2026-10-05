# TDD verifier report — pause the CodeRabbit CLI (`pause_coderabbit_cli`)

FIX. No Linear issue. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. The plan implemented the pause directly. GitHub pull-request review (G-CR3) stays fail-closed.

## Suggested Review Order (collated)

Concern-first. Line numbers drift; follow symbols.

### 1. Cloud install no longer runs the CLI [toolchain]

- `.cursor/environment.json` `install` is `corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile`.
- `.cursor/cloud-install-coderabbit.sh` stays in the repo with the `0.7.6` pin and is not invoked. Resume is appending `&& sh .cursor/cloud-install-coderabbit.sh`.

### 2. Local gate records cli_paused [toolchain]

- `.cursor/checks/coderabbit-gate.mjs` — after the work-order preflight, a non-test run writes `unavailable` / `cli_paused` and does not spawn `coderabbit` or `cr`. `CODERABBIT_GATE_TEST=1` still exercises the parser.

## Traceability (final)

Run: 2026-10-05 · plan: pause_coderabbit_cli · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-CR1 CLI install paused | dev-toolchain.md G-CR1 | `coderabbit-cloud-install.test.ts::environment.json install does not invoke the paused CLI helper` | `.cursor/environment.json`; `.cursor/cloud-install-coderabbit.sh` | P1 | shipped |
| G-O1 install string | dev-toolchain.md G-O1 | `pnpm-overrides-toolchain.test.ts` install substrings | `.cursor/environment.json` | P1 | shipped |
| G-ENV1 install matches G-CR1 | dev-toolchain.md G-ENV1 | `cloud-test-stack.test.ts::keeps the install string and adds Docker start plus the supabase helper` | `.cursor/environment.json` | P1 | shipped |
| G-CR2 cli_paused | dev-toolchain.md G-CR2 | `coderabbit-cloud-install.test.ts::records cli_paused before readPinnedAuth outside test mode` | `.cursor/checks/coderabbit-gate.mjs` | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: pause_coderabbit_cli
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 0 (plan implemented in the parent session)
Back-loops: none
BLOCKED events: none

## Docs sync packet

- plan_slug: pause_coderabbit_cli
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [G-CR1, G-O1, G-ENV1, G-CR2]
- criteria_manual_uat: none
- req_ids: [G-CR1, G-O1, G-ENV1, G-CR2]
- source_paths: [.cursor/environment.json, .cursor/checks/coderabbit-gate.mjs, .cursor/rules/coderabbit-integration.mdc, .cursor/commands/sdd-to-tdd.md, .cursor/commands/intake.md]
- test_paths: [tests/unit/dev-toolchain/coderabbit-cloud-install.test.ts, tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts, tests/unit/dev-toolchain/cloud-test-stack.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pause_coderabbit_cli.md
- drift_flagged: none
- skip_reason: none

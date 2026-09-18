# pr119_cr_gcr3_suite_od_a8f1c203

### C2

Suggested review order:
- US check label fallback [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:113` `isUsCompletedCheck`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:116` `label = run?.name || run?.app?.name`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:118` `isCodeRabbitShaped(label)`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:53` `isUsApp` still required [security]
- Pause composition [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:124` `hasUsCompletedHeadStatus`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:318` `incrementalPaused`

Reusable pattern: Nameless US check-suite SUCCESS treats `run.name || run.app.name` as the CodeRabbit label and still requires `isUsApp`

### C1

Suggested review order:
- Process-meta exclusion [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:101` `isProcessMetaThread`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:103` `isOutdated === true`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:216` findings collector skip
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:329` unresolved filter [security]
- C2 left intact [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:119` `isUsCompletedCheck`

Reusable pattern: G-CR3 process-meta is one helper (`isOutdated === true` or `.cursor/plans/`) shared by the unresolved filter and findings collection

## Suggested Review Order (collated)

- US check-suite label + App ID [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:119` `isUsCompletedCheck`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:122` `run?.name || run?.app?.name`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:53` `isUsApp`
- Process-meta leftovers [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:101` `isProcessMetaThread`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:216` findings collector
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:329` unresolved filter

## Traceability (final)

Run: 2026-09-16 · plan: pr119_cr_gcr3_suite_od_a8f1c203 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C2 | docs/specs/dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::incremental pause accepts US check-suite app name | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` | P0 | shipped |
| C1 | docs/specs/dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::outdated unresolved US thread is not a G-CR3 finding | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` | P0 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: pr119_cr_gcr3_suite_od_a8f1c203
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 6 left on ledger (below floor) — cap 3/run


# pr119_cr_gcr3_pause_id_e7c2a91f

### C2

Suggested review order:
- US pause identity — statuses [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:18` `REQUIRED_US_STATUS_CONTEXT`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:104` `isUsCompletedLegacyStatus`
- US pause identity — check-runs/suites [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:53` `isUsApp`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:113` `isUsCompletedCheck`
- Pause composition [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:121` `hasUsCompletedHeadStatus`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:315` `incrementalPaused` in `evaluateReadyPr`

Reusable pattern: G-CR3 incremental-pause SUCCESS is two positive predicates — exact status context + absent-or-US creator, and `isUsApp` on checks — never `/coderabbit/i` SUCCESS or `!isNonUsCodeRabbitApp` alone

### C1

Suggested review order:
- Paginated status collection [security]
  - `.cursor/checks/coderabbit-pr-gate.mjs:108` `collectRestPages` flattens `field` pages
  - `.cursor/checks/coderabbit-pr-gate.mjs:125` `ghJsonPages(..., field)`
  - `.cursor/checks/coderabbit-pr-gate.mjs:252` `fetchSnapshot` uses `ghJsonPages(..., "statuses")` [security]
  - `.cursor/checks/coderabbit-pr-gate.mjs:283` return `statuses` as the flat snapshot array
- Pause consumer (unchanged this criterion) [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:104` `isUsCompletedLegacyStatus`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:121` `hasUsCompletedHeadStatus`

Reusable pattern: Prove combined-status pagination by executing `fetchSnapshot` against a page-2-only SUCCESS mock at the helper `per_page`; a source-scan of `ghJsonPages` is not proof

## Suggested Review Order (collated)

- US pause identity [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:18` `REQUIRED_US_STATUS_CONTEXT`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:104` `isUsCompletedLegacyStatus`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:53` `isUsApp`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:113` `isUsCompletedCheck`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:121` `hasUsCompletedHeadStatus`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:315` `incrementalPaused`
- Paginated status collection [security]
  - `.cursor/checks/coderabbit-pr-gate.mjs:108` `collectRestPages`
  - `.cursor/checks/coderabbit-pr-gate.mjs:125` `ghJsonPages`
  - `.cursor/checks/coderabbit-pr-gate.mjs:252` `fetchSnapshot` `ghJsonPages(..., "statuses")`
  - `.cursor/checks/coderabbit-pr-gate.mjs:283` flat `snapshot.statuses`

## Traceability (final)

Run: 2026-09-16 · plan: pr119_cr_gcr3_pause_id_e7c2a91f · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C2 | docs/specs/dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::incremental pause requires positive US status identity | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` | P0 | shipped |
| C1 | docs/specs/dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::fetchSnapshot paginates commit statuses into snapshot.statuses | `.cursor/checks/coderabbit-pr-gate.mjs` | P0 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: pr119_cr_gcr3_pause_id_e7c2a91f
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 7 (C2 red + typecheck red + green + refactor; C1 red + green + refactor)
Back-loops: C2: 1 extra Red (TS2367 runtime-string compare)
BLOCKED events: none
Issues: n/a


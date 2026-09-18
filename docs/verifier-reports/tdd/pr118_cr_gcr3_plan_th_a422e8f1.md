# TDD log — pr118_cr_gcr3_plan_th_a422e8f1

### C1

Suggested review order:
- **[security] plan-path exclusion** — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:95` (`isWorkOrderPlanThread`)
- **[public-api] gate vs findings skip** — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:166` and `:269-274`
- **[security] product-path still fail-closed** — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:275-281`; test `coderabbit-gcr3-mustfixes.test.ts:612-621`
- command prose matches adapter — `.cursor/commands/ready-merge-release.md:30-33`

Reusable pattern: When G-CR3 adapter excludes a path class, qualify the same exception in `/ready-merge-release` in the same refactor — command-scan tests do not prove adapter behavior, and adapter-only Green leaves “Command prose MUST match the adapter” stale.

## Suggested Review Order (collated)

Highest-risk first.

- [security] plan-path exclusion — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:95`
- [security] product-path still fail-closed — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:275-281`
- [public-api] gate vs findings skip — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:166` / `:269-274`
- command prose — `.cursor/commands/ready-merge-release.md:30-33`
- executed C1 proof — `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` → unresolved work-order plan thread is not a G-CR3 finding

## Traceability (final)

Run: 2026-09-16 · plan: pr118_cr_gcr3_plan_th_a422e8f1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::unresolved work-order plan thread is not a G-CR3 finding | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: pr118_cr_gcr3_plan_th_a422e8f1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 3 left on ledger (all below floor) — cap 3/run

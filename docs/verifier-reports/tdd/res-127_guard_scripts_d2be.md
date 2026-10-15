# TDD log — res-127_guard_scripts_d2be

## G-TD1-4 — guard-script deny

Suggested review order: Named disarm escape [security] `.cursor/hooks/lib/tdd-guard-policy.mjs:359` (comment) → `:360` (exact `normalize` equality returns null before the prefix deny). Guard-script prefix deny [security] `.cursor/hooks/lib/tdd-guard-policy.mjs:30` (`.cursor/hooks/` in `PROTECTED_PREFIXES`) → `:361` (`isProtected`) → `:370` (depth 0 `delegation` deny).

Reusable pattern: Allow one disarm file with `normalize(relPath) === "<exact relative path>"` returning null before the new protected-prefix deny; never allow the parent directory.

## Suggested Review Order (collated)

- Named disarm escape [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs:359` comment, `:360` exact `normalize` equality returns null before the prefix deny
- Guard-script prefix deny [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs:30` `.cursor/hooks/` in `PROTECTED_PREFIXES`, `:361` `isProtected`, `:370` depth 0 `delegation` deny
- G-TD1 item 4 and the evidence row → `docs/specs/dev-toolchain.md` G-TD1
- Depth-0 spawn plus the pure policy matrix → `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` "armed depth 0 denies a BOM-prefixed Write to the delegation guard script"

## Traceability (final)

Run: 2026-10-10 · plan: res-127_guard_scripts_d2be · issue: RES-127

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-TD1-4 | docs/specs/dev-toolchain.md G-TD1 item 4 | tests/unit/dev-toolchain/tdd-guard-liveness.test.ts::armed depth 0 denies a BOM-prefixed Write to the delegation guard script | .cursor/hooks/lib/tdd-guard-policy.mjs PROTECTED_PREFIXES, checkTddWrite | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-127_guard_scripts_d2be
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (below floor; sharpened into the existing non-canonical-path line) — cap 3/run

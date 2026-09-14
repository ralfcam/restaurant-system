# TDD log — null_omit_empty_head_8dc143b1

FIX G-CR2: JSON `null` file lists are not omitted/empty (no dual-omission mint). G-CR3: missing/empty/whitespace `base` or `head` is `wrong_base_head`.

### C1

Suggested review order:
- Omission contract `[security]`: `.cursor/hooks/lib/coderabbit-review-policy.mjs:228` (`isOmittedOrEmptyFileList`)
- Dual-omission conjunct `[security]`: `:316` (`contextAliases.every` + complete)
- Alias fail-closed loop `[security]`: `:319` (skip only omitted/`[]`; non-array → `scope_mismatch`)
- Complete `null` path: `:343` (`dualOmission ? expectedPaths : completeFiles`); `:345` (`reviewed_files_mismatch`)
- C1 assertions (read-only): `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:238`
- Untouched invariants: `:15` (`PINNED_CLI_VERSION`); `:238` (`applyWaivers`); `:380` (finding ⊆ dirty)

Reusable pattern: JSON `null` ≠ omitted: never use `== null` for “missing or empty list”; use `=== undefined || (Array.isArray(x) && x.length === 0)`.

### C2

Suggested review order:
- Nonempty-string predicate `[security]`: `.cursor/hooks/lib/coderabbit-pr-policy.mjs:152` `isNonEmptyTrimmedString`
- Allowed-shape conjunction `[security]`: `:158` `isAllowedReadyPrShape` (helper, then exact `===` feature/promotion)
- Adapter fail-closed `[security]`: `.cursor/checks/coderabbit-pr-gate.mjs:35` `assertBranchShape` (`wrong_base_head`); `:46` `emitReadyVerdict` (shape before `evaluateReadyPr`)
- Untouched evaluator: `.cursor/hooks/lib/coderabbit-pr-policy.mjs:167` `evaluateReadyPr`
- C2 spawn (read-only): `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:221`; fixtures `remote-staging-empty-head.json`, `remote-staging-omitted-head.json`, `remote-staging-whitespace-head.json`
- C5 spawn pins: `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:186`

Reusable pattern: Split emptiness from identity — one `typeof v === "string" && v.trim() !== ""` predicate, then exact `===` on the original refs so padded `"staging "` stays a distinct head.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from each criterion's last Refactor close-out.

- **[security]** Omission contract — `.cursor/hooks/lib/coderabbit-review-policy.mjs:228` `isOmittedOrEmptyFileList` (`undefined` or `[]` only; JSON `null` is not omitted)
- **[security]** Dual-omission conjunct — `.cursor/hooks/lib/coderabbit-review-policy.mjs:316` `contextAliases.every` + complete; `:319` skip only omitted/`[]`; non-array alias → `scope_mismatch`
- **[security]** Complete `null` path — `.cursor/hooks/lib/coderabbit-review-policy.mjs:343` `dualOmission ? expectedPaths : completeFiles`; `:345` `reviewed_files_mismatch`
- **[security]** Nonempty base/head — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:152` `isNonEmptyTrimmedString`; `:158` `isAllowedReadyPrShape` (trim emptiness, then exact `===` feature/promotion)
- **[security]** Adapter fail-closed — `.cursor/checks/coderabbit-pr-gate.mjs:35` `assertBranchShape` (`wrong_base_head`); `:46` `emitReadyVerdict` (shape before `evaluateReadyPr`)
- Untouched invariants — `.cursor/hooks/lib/coderabbit-review-policy.mjs:15` `PINNED_CLI_VERSION` `0.7.6`; `:238` `applyWaivers`; `:380` finding ⊆ dirty; `.cursor/hooks/lib/coderabbit-pr-policy.mjs:167` `evaluateReadyPr` (shape-agnostic)

## Traceability (final)

Run: 2026-09-14 · plan: null_omit_empty_head_8dc143b1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR2 null ≠ omitted | tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts::null reviewedFiles does not dual-omission mint | .cursor/hooks/lib/coderabbit-review-policy.mjs `isOmittedOrEmptyFileList` | P0 | shipped |
| C2 | G-CR3 non-empty base/head | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::adapter rejects empty missing and whitespace base or head with wrong_base_head | .cursor/hooks/lib/coderabbit-pr-policy.mjs `isAllowedReadyPrShape` | P0 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: null_omit_empty_head_8dc143b1
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 (C1 red/green/refactor; C2 red/green/refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 11 this-run left on ledger (2 security med proposed pending operator yes; 9 below floor/cap) — cap 3/run

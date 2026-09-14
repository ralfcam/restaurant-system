# TDD log — g-cr2_4g_locks_bb8ea9b1

FIX: G-CR2 defers CLI pin to G-CR1. Exact `evaluateAgentStream` rejection reasons on G-CR2 tests.

### C1

Suggested review order:
- Pin ownership [security]: `docs/specs/dev-toolchain.md:151` (G-CR2 opener `G-CR1-pinned US CLI`)
- Pin ownership [security]: `docs/specs/dev-toolchain.md:137` (G-CR1 `CODERABBIT_VERSION=0.7.6`)
- Lock slice: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:267`
- Unchanged local pin [security]: `.cursor/hooks/lib/coderabbit-review-policy.mjs:15` (`PINNED_CLI_VERSION`); `:162` `assertPinnedUsAuth`
- Non-normative trace (outside C1 slice): `docs/specs/dev-toolchain.md:256`

Reusable pattern: Slice spec-shape locks to the numbered requirement body (`8. **G-CR2` … `9. **G-CR3`) so Implementation-trace version literals cannot false-fail a pin-deferral assert

### C2

Suggested review order:
- Per-alias fail-closed [security]: `docs/specs/dev-toolchain.md:176` (each non-empty context alias equals the work-order even when another listed alias matches)
- Complete-list reasons [security]: `docs/specs/dev-toolchain.md:178` (`reviewed_files_mismatch` for complete inequality and mixed listed-context + omitted/empty complete)
- Alias loop [security]: `.cursor/hooks/lib/coderabbit-review-policy.mjs:310` (`contextAliases`); `:319` skip omitted/empty; `:321` `scope_mismatch`
- Dual-omission vs complete [security]: `.cursor/hooks/lib/coderabbit-review-policy.mjs:316` (`dualOmission`); `:343` (`completeFiles` when listed); `:353` listed-empty complete stays `reviewed_files_mismatch`
- Exact-reason pins: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:132` (`omittedMismatch`); `:141` (`emptyMismatch`); `:148` (`listedEmptyComplete`)
- Finding-path ⊆ dirty: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:188`; `:204`; `:220`
- Mixed `files` alias: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:239`; `:242` (`matching reviewedFiles does not hide a mismatching files alias`)
- Null vs empty: `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:277` (`reviewedFiles: null` → `scope_mismatch`); `:286` (`complete.reviewedFiles: null` → `reviewed_files_mismatch`)

Reusable pattern: Pin exact evaluateAgentStream reason strings, not only ok: false

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from each criterion's last Refactor close-out.

- **[security]** Per-alias fail-closed — `docs/specs/dev-toolchain.md:176` each non-empty context alias equals the work-order even when another listed alias matches
- **[security]** Alias loop — `.cursor/hooks/lib/coderabbit-review-policy.mjs:310` `contextAliases`; `:319` skip omitted/`[]`; `:321` `scope_mismatch`
- **[security]** Dual-omission vs complete — `.cursor/hooks/lib/coderabbit-review-policy.mjs:316` `dualOmission`; `:343` listed complete; `:353` listed-empty complete stays `reviewed_files_mismatch`
- **[security]** Complete-list reasons — `docs/specs/dev-toolchain.md:178` `reviewed_files_mismatch` for complete inequality and mixed listed-context + omitted/empty complete
- **[security]** Pin ownership — `docs/specs/dev-toolchain.md:151` G-CR2 opener `G-CR1-pinned US CLI`; `:137` G-CR1 `CODERABBIT_VERSION=0.7.6`; `.cursor/hooks/lib/coderabbit-review-policy.mjs:15` `PINNED_CLI_VERSION` unchanged
- Exact-reason pins — `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:132` `omittedMismatch`; `:141` `emptyMismatch`; `:148` `listedEmptyComplete`; `:242` matching+mismatching `files`; `:277` null context; `:289` C1 pin-deferral lock

## Traceability (final)

Run: 2026-09-14 · plan: g-cr2_4g_locks_bb8ea9b1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR2 defers CLI pin to G-CR1 | tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts::G-CR2 spec defers CLI pin to G-CR1 | docs/specs/dev-toolchain.md (G-CR2 §8); PINNED_CLI_VERSION unchanged | P2 | shipped |
| C2 | G-CR2 exact rejection reasons | tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts::matching reviewedFiles does not hide a mismatching files alias | .cursor/hooks/lib/coderabbit-review-policy.mjs `evaluateAgentStream` (no Green edit) | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr2_4g_locks_bb8ea9b1
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 (C1 red/green/refactor; C2 red/green/refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 7 left on ledger (below floor/cap) — cap 3/run



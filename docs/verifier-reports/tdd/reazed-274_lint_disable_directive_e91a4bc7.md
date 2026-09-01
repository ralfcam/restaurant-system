# TDD verifier report — REAZED-274 unused eslint-disable directive is error (`reazed-274_lint_disable_directive_e91a4bc7`)

FIX run. Linear: REAZED-274.

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### G-L1 C3

Suggested review order:
- Unused-disable gate `[public-api]`: `eslint.config.mjs:8-10` — `linterOptions.reportUnusedDisableDirectives: "error"` after `...nextTs`, before `globalIgnores` (overrides Next defaults; string `"error"` not the v9 `"warn"` default)
- Behavioral pin: `tests/unit/dev-toolchain/lint-toolchain.test.ts:53-71` — `ESLint.lintText` unused `eslint-disable-next-line no-unused-vars` on a used binding; `ruleId === null` + `/Unused eslint-disable directive/` → `severity === 2`

Reusable pattern: Pin unused-disable as error via the ESLint Node API (`lintText` on a known unused-disable snippet; `ruleId === null`, message `/Unused eslint-disable directive/`, `severity === 2`) rather than regexing `eslint.config.mjs` for `reportUnusedDisableDirectives`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Lint gate hardening `[public-api]`

- `eslint.config.mjs:8-10` — `linterOptions.reportUnusedDisableDirectives: "error"` after `...nextTs`, before `globalIgnores` (overrides Next defaults; string `"error"` not the v9 `"warn"` default)

### 2. Regression pin `[test-debt]`

- `tests/unit/dev-toolchain/lint-toolchain.test.ts:53-71` — `ESLint.lintText` unused `eslint-disable-next-line no-unused-vars` on a used binding; `ruleId === null` + `/Unused eslint-disable directive/` → `severity === 2`

### 3. Spec ref

- `docs/specs/dev-toolchain.md` § G-L1 C3

## Traceability (final)

Run: 2026-09-01 · plan: reazed-274_lint_disable_directive_e91a4bc7 · issue: REAZED-274

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-L1 C3 | `docs/specs/dev-toolchain.md` § G-L1 | `lint-toolchain.test.ts::errors (not warns) on an unused eslint-disable directive` | `eslint.config.mjs` | P3 | shipped |

## Run metrics

Run: 2026-09-01 → 2026-09-01 · plan: reazed-274_lint_disable_directive_e91a4bc7
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor/cap) — cap 3/run

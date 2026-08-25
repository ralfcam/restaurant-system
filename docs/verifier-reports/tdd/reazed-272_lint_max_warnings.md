# TDD verifier report — REAZED-272 pin `--max-warnings 0` (`reazed-272_lint_max_warnings`)

FIX run. Linear: [REAZED-272](https://linear.app/realized/issue/REAZED-272/restaurant-system-pnpm-lint-missing-max-warnings-0). Parent: REAZED-294.

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### C1 — G-L1: `scripts.lint` includes `--max-warnings 0`

Suggested review order:

- Lint gate contract **[public-api]**
  - `package.json:9` (`scripts.lint` → `eslint . --max-warnings 0`)
- Regression pin
  - `tests/unit/dev-toolchain/lint-toolchain.test.ts:12` (`scripts?` on parsed `package.json`)
  - `tests/unit/dev-toolchain/lint-toolchain.test.ts:47-50` (`toContain("--max-warnings 0")`)
- Warning-free harness (unblocks the gate)
  - `.cursor/checks/harness-lint.mjs:15` (`import { join, resolve }` — `dirname` gone)

Reusable pattern: When turning on ESLint `--max-warnings 0`, run `pnpm lint` once to surface unused-import warnings the old warning-tolerant gate hid, then delete those imports before treating the gate as green.

Delete-list: Lean already. Ship.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Lint gate contract [public-api]

- `package.json` `scripts.lint` — `"eslint . --max-warnings 0"` (ESLint warnings fail the gate; a warning-free tree without this flag must not satisfy G-L1)

### 2. Regression pin

- `tests/unit/dev-toolchain/lint-toolchain.test.ts` — `lint script passes --max-warnings 0 to eslint` (`scripts.lint` substring `--max-warnings 0`; existing two tests unchanged)

### 3. Warning-free harness

- `.cursor/checks/harness-lint.mjs` — unused `dirname` import removed so `pnpm lint` exits 0 under `--max-warnings 0`

## Traceability (final)

Run: 2026-08-25 · plan: reazed-272_lint_max_warnings · issue: REAZED-272

| Criterion | Spec ref                                    | Test file::name                                                    | Source file(s)                                      | Risk | Status  |
| --------- | ------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------- | ---- | ------- |
| C1        | G-L1 (`scripts.lint` MUST include the flag) | `lint-toolchain.test.ts::lint script passes --max-warnings 0 to eslint` | `package.json`; `.cursor/checks/harness-lint.mjs` | P1   | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-08-25 → 2026-08-25 · plan: reazed-272_lint_max_warnings
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 2 left on ledger (below floor) — cap 3/run

## Residual findings

Merged at 4C into `docs/findings/test-debt.md`. In-scope ledger line “Unused `dirname` import” archived as resolved-in-run. Filing: 0 filed · 0 attached · 2 left on ledger (below floor). Run file truncated.

## Reusable patterns (4E)

1. **Fail-on-warnings then delete unused imports** — after pinning ESLint `--max-warnings 0` on `scripts.lint`, run `pnpm lint` once to surface unused-import warnings the old warning-tolerant gate hid, then delete those imports before treating the gate as green.

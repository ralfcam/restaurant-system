# TDD verifier report — eslint_timeout_hardening_f994f816

FIX run. Free-text `bug:` — no Linear ID. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### G-L1 C4

Suggested review order:
- Timeout contract [public-api] → `vitest.unit.config.ts:9` (`test.testTimeout: 15_000`)
- Spec bar → `docs/specs/dev-toolchain.md` G-L1 C4 (`test.testTimeout` exactly `15_000`, behavioral ignores retained)
- Config regression → `tests/unit/dev-toolchain/lint-toolchain.test.ts:73-80`
- Behavioral ignore probe [security] → `tests/unit/dev-toolchain/lint-toolchain.test.ts:35-45` (`isPathIgnored` for `.temp` / `.branches`)

Reusable pattern: Keep a suite-level `testTimeout: 15_000` and still execute the ESLint Node API ignore probe — a config-only assertion is not enough.

Delete-list: none (Lean already. Ship.)

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Timeout contract `[public-api]`

- `vitest.unit.config.ts:9` — `test.testTimeout: 15_000` (exact; suite-level budget for dependency-heavy ESLint Node API probes)
- `docs/specs/dev-toolchain.md` § G-L1 C4 — bounded 15-second unit timeout; config-only assertion MUST NOT replace behavioral ignore coverage

### 2. Behavioral ignore probe `[security]`

- `tests/unit/dev-toolchain/lint-toolchain.test.ts:35-45` — `ignores gitignored supabase CLI temp and branches trees` (`ESLint.isPathIgnored` true for `.temp` / `.branches`, false for `eslint.config.mjs`). Must still execute; must not be weakened.

### 3. Config regression

- `tests/unit/dev-toolchain/lint-toolchain.test.ts:73-80` — `gives dependency-heavy ESLint probes a 15-second unit timeout budget` (`/testTimeout\s*:\s*15_000/` against `vitest.unit.config.ts` source)

## Traceability (final)

Run: 2026-09-10 · plan: eslint_timeout_hardening_f994f816 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-L1 C4 | `docs/specs/dev-toolchain.md` § G-L1 C4 | `lint-toolchain.test.ts::gives dependency-heavy ESLint probes a 15-second unit timeout budget` | `vitest.unit.config.ts` | P2 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: eslint_timeout_hardening_f994f816
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run; 1 bus item resolved in-run (FIX-mode broader unit timeout → archive)

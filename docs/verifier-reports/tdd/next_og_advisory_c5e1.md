# TDD log — next_og_advisory_c5e1

## G-AUD1

Suggested review order:
- [security] patched Next floor → `package.json:26`
- [security] lockfile next pin → `pnpm-lock.yaml:137`
- resolved next package → `pnpm-lock.yaml:3137`
- declared minimum and lock tokens → `tests/unit/dev-toolchain/next-advisory.test.ts:6`
- installed version → `tests/unit/dev-toolchain/next-advisory.test.ts:46`

Reusable pattern: A toolchain advisory pin test should read the declared minimum, every lockfile `pkg@X.Y.Z` token (skipping prefixed names such as `eslint-config-next`), and the installed `node_modules/<pkg>/package.json` version.

## Suggested Review Order (collated)

- security → `package.json:26` (`next` is `16.3.6`)
- security → `pnpm-lock.yaml:137` (importer pin)
- security → `pnpm-lock.yaml:3137` (resolved `next@16.3.6`)
- security → `tests/unit/dev-toolchain/next-advisory.test.ts:6` (floor check)
- security → `tests/unit/dev-toolchain/next-advisory.test.ts:46` (installed version)

## Traceability (final)

Run: 2026-10-05 · plan: next_og_advisory_c5e1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| G-AUD1 | dev-toolchain.md G-AUD1 | tests/unit/dev-toolchain/next-advisory.test.ts::next resolves at or above 16.3.6 | package.json, pnpm-lock.yaml | P0 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: next_og_advisory_c5e1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: 1 filed (RES-139 umbrella for 2 findings) · 0 attached · 1 left on ledger (below floor) — cap 3/run

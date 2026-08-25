# TDD verifier report — G-L1 ignore gitignored Supabase CLI output (`g-l1_temp_ignore_da077232`)

FIX run. Free-text `bug:` — no Linear ID. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### C1 — G-L1 ignore gitignored Supabase CLI output

Suggested review order: `[toolchain]` `eslint.config.mjs:13` (`supabase/.temp/**`) → `eslint.config.mjs:14` (`supabase/.branches/**`) → `tests/unit/dev-toolchain/lint-toolchain.test.ts:34` (`isPathIgnored`)

Reusable pattern: Pin ESLint `globalIgnores` with `new ESLint({ cwd: repoRoot }).isPathIgnored(path)` (true for generated trees, false for a live config file) instead of scraping `pnpm lint` stdout

Delete-list: Lean already. Ship.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Toolchain ignore pin [toolchain]

- `eslint.config.mjs` `globalIgnores` — `"supabase/.temp/**"` and `"supabase/.branches/**"` (gitignored CLI trees only; do not ignore live `supabase/` source)
- Pin: `tests/unit/dev-toolchain/lint-toolchain.test.ts` — `ignores gitignored supabase CLI temp and branches trees` (`ESLint.isPathIgnored` true for representative `.temp` / `.branches` paths, false for `eslint.config.mjs`)

## Traceability (final)

Run: 2026-08-25 · plan: g-l1_temp_ignore_da077232 · issue: none

| Criterion | Spec ref                          | Test file::name                                                                 | Source file(s)      | Risk | Status  |
| --------- | --------------------------------- | ------------------------------------------------------------------------------- | ------------------- | ---- | ------- |
| C1        | G-L1 (gitignored CLI `globalIgnores`) | `lint-toolchain.test.ts::ignores gitignored supabase CLI temp and branches trees` | `eslint.config.mjs` | P1   | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-08-25 → 2026-08-25 · plan: g-l1_temp_ignore_da077232
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run

## Residual findings

Merged at 4C into `docs/findings/{tech-debt,test-debt}.md`. In-scope ledger line “ESLint lints gitignored Supabase CLI `.temp`” archived as resolved-in-run. Already-tracked: unused `dirname` (tech-debt), `--max-warnings 0` (REAZED-272). Filing: 0 filed · 0 attached · 2 left on ledger (below floor). Run file truncated.

## Reusable patterns (4E)

1. **ESLint.isPathIgnored pin** — assert `new ESLint({ cwd: repoRoot }).isPathIgnored(path)` true for generated trees and false for a live file; do not grep `eslint.config.mjs` or scrape `pnpm lint` stdout.

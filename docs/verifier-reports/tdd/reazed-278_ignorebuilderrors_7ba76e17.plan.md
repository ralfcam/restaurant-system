# TDD verifier report — REAZED-278 stop masking TypeScript build errors (`reazed-278_ignorebuilderrors_7ba76e17.plan`)

FIX run. Linear: [REAZED-278](https://linear.app/realized/issue/REAZED-278/restaurant-system-typescriptignorebuilderrors-masks-type-errors). Parent: REAZED-294.

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### C1 — G-T1 C4: Next.js must not ignore TypeScript build errors

Suggested review order:
- Fail-closed `next build` TypeScript `[toolchain]`: `next.config.mjs:4` — `typescript` key omitted (Next default `ignoreBuildErrors: false`)
- Remaining config is unrelated (`images` / Server Action body limit): `next.config.mjs:5-17`
- Regression pin `[toolchain]`: `tests/unit/dev-toolchain/typecheck-toolchain.test.ts:33-41` — UTF-8 read; rejects truthy `ignoreBuildErrors` literals

Reusable pattern: Pin fail-closed toolchain keys by reading the committed file as UTF-8 (do not import `next.config.mjs` — it loads `next-intl/plugin`); allow omit-or-`false` when the framework default is already fail-closed. Same class as G-L1 `--max-warnings 0`.

Delete-list: Lean already. Ship.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Fail-closed `next build` TypeScript [toolchain]

- `next.config.mjs` — `typescript` / `ignoreBuildErrors` omitted (Next default is fail-closed; a truthy `ignoreBuildErrors` would let `next build` / Vercel ship a type-broken tree)

### 2. Regression pin [toolchain]

- `tests/unit/dev-toolchain/typecheck-toolchain.test.ts` — `next config does not ignore TypeScript build errors` (UTF-8 read of `next.config.mjs`; rejects `ignoreBuildErrors` assigned to a truthy literal; existing SWR test unchanged)

### 3. Unrelated leftover config

- `next.config.mjs` `images.unoptimized` and `experimental.serverActions.bodySizeLimit` — pre-existing; not this criterion

## Traceability (final)

Run: 2026-08-28 · plan: reazed-278_ignorebuilderrors_7ba76e17.plan · issue: REAZED-278

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-T1 C4 (`next.config.mjs` MUST NOT set `typescript.ignoreBuildErrors` to a truthy value) | `typecheck-toolchain.test.ts::next config does not ignore TypeScript build errors` | `next.config.mjs` | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-08-28 → 2026-08-28 · plan: reazed-278_ignorebuilderrors_7ba76e17.plan
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 1 left on ledger (below floor) — cap 3/run

## Residual findings

Merged at 4C into `docs/findings/test-debt.md`. Filing: 0 filed · 0 attached · 1 left on ledger (below floor) — Regex pin misses compound truthy expressions. Run file truncated.

## Reusable patterns (4E)

1. **UTF-8 pin of fail-closed toolchain keys** — read the committed config as text (do not import `next.config.mjs`; it loads `next-intl/plugin`); allow omit-or-`false` when the framework default is already fail-closed. Same class as G-L1 `--max-warnings 0`.

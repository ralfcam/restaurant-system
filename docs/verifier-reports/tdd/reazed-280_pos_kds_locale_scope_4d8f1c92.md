# TDD verifier report — REAZED-280 POS/KDS locale exclusion (`reazed-280_pos_kds_locale_scope_4d8f1c92`)

FIX run. Linear: [REAZED-280](https://linear.app/realized/issue/REAZED-280).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — AC-3 `/pos` and `/kds` excluded from locale routing

Cleanups: none needed — `i18n/middleware-scope.ts` already lists `/pos` and `/kds` in `LOCALE_EXCLUDED_PREFIXES`; `git diff HEAD -- i18n/middleware-scope.ts` is empty. No helper extract, no prefix-match rewrite (startsWith / `STAFF_PATHS` duplication stay residual).

Re-verify: tests GREEN ✓ · typecheck clean ✓ · lint clean (0 warnings) ✓

- `pnpm test:unit tests/unit/i18n/middleware-scope.test.ts` — 3 passed / 0 failed / 0 skipped (1 file; executed)
- `pnpm test:unit` — 241 passed / 0 failed / 0 skipped (57 files; executed)
- `pnpm lint` — exit 0, `--max-warnings 0`
- `pnpm typecheck` — `tsc --noEmit` exit 0
- `pnpm exec prettier --check tests/unit/i18n/middleware-scope.test.ts` — All matched files use Prettier code style

Suggested review order:

- Spec contract (AC-3 / excluded staff chrome) — `docs/specs/site-localization.md:8-11`, `docs/specs/site-localization.md:24-29`, `docs/specs/site-localization.md:37-43` `[public-api]`
- Characterization `it()` (Red) — `tests/unit/i18n/middleware-scope.test.ts:39-44`
- Already-shipped skip list (confirm 0 Green diff) — `i18n/middleware-scope.ts:3-9`, `i18n/middleware-scope.ts:14-16` `[public-api]`
- Composition (decision → skip intl, session always) — `middleware.ts:6-12`

Reusable pattern: Characterization test for already-shipped behavior — write Red honestly even when it passes on first run

Delete-list / over-engineering: none — no new source, no extra abstraction

## Suggested Review Order (collated)

Highest-risk first. One criterion (AC-3 amended); collated from the C1 Refactor section.

### 1. Spec contract — staff chrome excluded from locale routing `[public-api]`

- `docs/specs/site-localization.md:8-11` — Scope names `/admin/**`, `/pos/**`, `/kds/**` as staff chrome (SA-2)
- `docs/specs/site-localization.md:24-29` — Routing "Excluded paths" includes `/pos/**` and `/kds/**`
- `docs/specs/site-localization.md:37-43` — AC-3 skip list + SA-2 citation

### 2. Already-shipped skip list (confirm 0 Green diff) `[public-api]`

- `i18n/middleware-scope.ts:3-9` — `LOCALE_EXCLUDED_PREFIXES` already includes `/pos` and `/kds`
- `i18n/middleware-scope.ts:14-16` — `startsWith` check returns `"skip-locale"`

### 3. Characterization `it()` (Red)

- `tests/unit/i18n/middleware-scope.test.ts:39-44` — `"pos and kds are excluded from localization"`

### 4. Composition (decision → skip intl, session always)

- `middleware.ts:6-12` — skip-locale vs `runIntlMiddleware`; `updateSession` still runs

## Traceability (final)

Run: 2026-09-01 · plan: reazed-280_pos_kds_locale_scope_4d8f1c92 · issue: REAZED-280

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| AC-3 (amended) | site-localization.md AC-3 | tests/unit/i18n/middleware-scope.test.ts::"pos and kds are excluded from localization" | i18n/middleware-scope.ts (no change) | P2 | shipped |

## Run metrics

Run: 2026-09-01 → 2026-09-01 · plan: reazed-280_pos_kds_locale_scope_4d8f1c92
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red / tdd-green / tdd-refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor/cap) — cap 3/run

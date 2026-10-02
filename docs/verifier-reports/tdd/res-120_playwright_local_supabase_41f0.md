# TDD log — res-120_playwright_local_supabase_41f0

### GP-16

Suggested review order:
- Fail closed before any e2e test
  - `playwright.config.ts:5` [security] `globalSetup` points at `./playwright.global-setup.ts`
  - `playwright.global-setup.ts:20` [security] default export loads env, then calls the guard with no argument
  - `playwright.global-setup.ts:14` [security] omitted or empty URL returns; any other value goes to `assertIsolatedHoursMutationTarget`
- `@next/env` resolve (pnpm does not hoist it)
  - `playwright.global-setup.ts:7` `createRequire` from the installed `next` package

Reusable pattern: Pin a Playwright hosted-URL guard with a source scan of `globalSetup: "./playwright.global-setup.ts"` plus `loadEnvConfig(` before a zero-arg `assertPlaywrightSupabaseUrlIsLocalOrUnset()`; the helper returns on omitted or empty and otherwise calls `assertIsolatedHoursMutationTarget`, resolving `@next/env` via `createRequire` from `node_modules/next/package.json`.

## Suggested Review Order (collated)

Highest-risk first. The change stops a hosted `.env.local` from reaching the guest-profile reservation insert.

- [security] `playwright.config.ts:5` — `globalSetup: "./playwright.global-setup.ts"`
- [security] `playwright.global-setup.ts:20` — `loadEnvConfig(process.cwd())` then zero-arg `assertPlaywrightSupabaseUrlIsLocalOrUnset()`
- [security] `playwright.global-setup.ts:14` — omitted or empty URL returns; any other host goes to `assertIsolatedHoursMutationTarget`
- [public-api] `playwright.global-setup.ts:7` — `createRequire` from the installed `next` package so `@next/env` resolves under pnpm

## Traceability (final)

Run: 2026-10-01 · plan: res-120_playwright_local_supabase_41f0 · issue: RES-120

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| GP-16 | docs/specs/guest-profiles.md GP-16 | playwright-local-supabase.test.ts::playwright global setup rejects a hosted Supabase URL and allows loopback or unset | playwright.global-setup.ts, playwright.config.ts | P0 | shipped |

## Run metrics

Run: 2026-10-01 → 2026-10-01 · plan: res-120_playwright_local_supabase_41f0
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 4 left on ledger (below floor) — cap 3/run

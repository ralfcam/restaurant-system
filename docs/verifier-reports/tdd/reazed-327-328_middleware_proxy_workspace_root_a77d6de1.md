# TDD verifier report — REAZED-328 + REAZED-327 middleware→proxy + workspace root (`reazed-327-328_middleware_proxy_workspace_root_a77d6de1`)

FIX run. Linear: [REAZED-328](https://linear.app/realized/issue/REAZED-328/pin-turbopack-workspace-root-so-next-does-not-treat-a-parent-home), [REAZED-327](https://linear.app/realized/issue/REAZED-327/migrate-nextjs-request-boundary-from-middlewarets-to-proxyts).

This file is a **reading guide for `/commit`**, not a verdict.

## Criterion close-outs (incremental)

### C1 — G-W1: pin Turbopack / output-tracing workspace root

Suggested review order:
- Pin contract [infra-stability] [toolchain]
  - `next.config.mjs:5` — `projectRoot` from config file location
  - `next.config.mjs:9-11` — why the pin exists
  - `next.config.mjs:12-15` — `turbopack.root` + `outputFileTracingRoot` share that constant [infra-stability]
- Unchanged public config (no review of keys)
  - `next.config.mjs:16-28` — `images` / `serverActions.bodySizeLimit` (pre-existing)

Reusable pattern: none (same source-scan of `next.config.mjs` as G-T1 C4)

### C2 — G-P1: request boundary uses `proxy.ts`

Suggested review order:
- Request-boundary contract `[public-api]` `proxy.ts:6`
- Matcher / Next config export `proxy.ts:23-27`
- Session then locale skip then intl + cookie copy `proxy.ts:7-20`
- Admin-segment comment `app/admin/layout.tsx:1`
- Convention guard `tests/unit/dev-toolchain/proxy-convention.test.ts:8-10`
- Locale-scope + `proxy` import `tests/unit/i18n/middleware-scope.test.ts:10-24`

Reusable pattern: Next 16 request-boundary is root `proxy.ts` + `export async function proxy`; keep `export const config` when the spec says so; leave `lib/supabase/proxy.ts` and `i18n/middleware-scope` names alone.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Workspace-root pin [infra-stability] [toolchain]

- `next.config.mjs:5` — `projectRoot` from `path.dirname(fileURLToPath(import.meta.url))` (not `process.cwd()`)
- `next.config.mjs:9-11` — why the pin exists (ancestor lockfile inference → orphaned `.next` workers / host crash)
- `next.config.mjs:12-15` — `turbopack.root` and `outputFileTracingRoot` share that constant [infra-stability]

### 2. Request-boundary contract [public-api]

- `proxy.ts:6` — `export async function proxy` (renamed from `middleware.ts` / `middleware`)
- `proxy.ts:7-20` — `updateSession` then locale skip then `runIntlMiddleware` + cookie copy
- `proxy.ts:23-27` — `export const config.matcher` preserved
- `app/admin/layout.tsx:1` — admin-segment comment now names `proxy.ts`

### 3. Regression pins

- `tests/unit/dev-toolchain/workspace-root-toolchain.test.ts` — source-scan of `next.config.mjs` for shared computed root
- `tests/unit/dev-toolchain/proxy-convention.test.ts:8-10` — root `proxy.ts` exists, `middleware.ts` does not
- `tests/unit/i18n/middleware-scope.test.ts:10-24` — imports `proxy` from `@/proxy`; staff-path/session + locale-scope

### 4. Unrelated leftover config

- `next.config.mjs:16-28` — `images.unoptimized` and `experimental.serverActions.bodySizeLimit` (pre-existing; not this run)

## Traceability (final)

Run: 2026-09-02 · plan: reazed-327-328_middleware_proxy_workspace_root_a77d6de1 · issues: REAZED-328, REAZED-327

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 / G-W1 | dev-toolchain.md G-W1 | `workspace-root-toolchain.test.ts::next config pins turbopack and output-tracing root to the project directory` | `next.config.mjs` | P0 | shipped |
| C2 / G-P1 | dev-toolchain.md G-P1 | `middleware-scope.test.ts` (updated import/call) + `proxy-convention.test.ts::root proxy.ts exists and middleware.ts does not` | `proxy.ts` (renamed from `middleware.ts`), `app/admin/layout.tsx` (comment) | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-02 → 2026-09-02 · plan: reazed-327-328_middleware_proxy_workspace_root_a77d6de1
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 (tdd-red / tdd-green / tdd-refactor × 2)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 0 left on this run's ledger (residuals were in-run-resolved or already on the bus / archive) — cap 3/run

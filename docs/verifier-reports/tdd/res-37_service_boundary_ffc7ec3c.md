# TDD verifier report — RES-37 service client boundary (`res-37_service_boundary_ffc7ec3c`)

FIX run. Linear: [RES-37](https://linear.app/realized/issue/RES-37/servicets-has-no-server-only).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### RES37-C1 — Service-role client module is server-only

Suggested review order:
- Service-role client fence `[security]` — `lib/supabase/service.ts:1`
- JSDoc + factory unchanged `[security]` — `lib/supabase/service.ts:3-23`
- Static SA-11 contract — `tests/unit/supabase/service-boundary.test.ts:5-13`
- Integration harness (mock + fail-closed keys) — `tests/integration/setup.ts:4-11`

Reusable pattern: Fence privileged server modules with first-line `import "server-only"` (Next.js provides the package; do not add a direct dep) and `vi.mock("server-only", () => ({}))` in both unit and integration setup so Vitest can import those modules without making them `"use server"` files.

## Suggested Review Order (collated)

- `[security]` SA-11 fence — `docs/specs/staff-authorization.md` SA-11; `lib/supabase/service.ts:1`
- `[security]` factory unchanged — `lib/supabase/service.ts:3-23` (JSDoc, URL, `SUPABASE_SERVICE_ROLE_KEY`, `autoRefreshToken`/`persistSession` false)
- `[test-harness]` source pin + Vitest mock — `tests/unit/supabase/service-boundary.test.ts:5-13`; `tests/integration/setup.ts:4-11`

## Traceability (final)

Run: 2026-09-10 · plan: res-37_service_boundary_ffc7ec3c · issue: RES-37

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| RES37-C1 | `staff-authorization.md` SA-11 | `tests/unit/supabase/service-boundary.test.ts::createServiceClient module imports server-only and is not a use-server file` | `lib/supabase/service.ts`; test-harness compatibility in `tests/integration/setup.ts` | P0 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: res-37_service_boundary_ffc7ec3c
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 5 tdd-red/green/refactor Task calls
Back-loops: RES37-C1: 2 extra Refactor cycles (infra)
BLOCKED events: 2 — C1: infra (local GoTrue `GOTRUE_EXTERNAL_EMAIL_ENABLED=false` from `[auth.email] enable_signup = false`); recovered with runtime override, signup still off
Issues: 0 filed · 0 attached-to-existing · 3 left on ledger (below floor) — cap 3/run

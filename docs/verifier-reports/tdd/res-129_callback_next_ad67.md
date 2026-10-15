# TDD log — res-129_callback_next_ad67

## C1 — SA-3-NEXT callback next

Suggested review order:
- Same-origin `next` guard [security]
  - `app/auth/callback/route.ts:8`
  - `app/auth/callback/route.ts:20`
- Missing code and failed exchange still ignore `next`
  - `app/auth/callback/route.ts:16`
  - `app/auth/callback/route.ts:24`
- Pinned success cases
  - `tests/unit/auth/callback-next.test.ts:28`

Reusable pattern: accept callback `next` only when it starts with `/`, the second character is not `/` or `\`, and the value has no `://`; otherwise use `/admin`, then concatenate onto the request origin.

Re-verify (orchestrator): `pnpm test:unit tests/unit/auth` 8 files, 13 tests, 0 skipped. `pnpm lint` clean (`eslint . --max-warnings 0`). `pnpm typecheck` clean (`tsc --noEmit`).

## Suggested Review Order (collated)

- Same-origin guard before the success redirect [security] → `app/auth/callback/route.ts:8` then `:20`
- Failed exchange and missing `code` still go to `/auth/error` and do not read the guarded `next` → `app/auth/callback/route.ts:16`, `:24`
- Off-site and relative cases → `tests/unit/auth/callback-next.test.ts:28`
- Spec → `docs/specs/staff-authorization.md` SA-3-NEXT

## Traceability (final)

Run: 2026-10-07 · plan: res-129_callback_next_ad67 · issue: RES-129

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-3-NEXT | tests/unit/auth/callback-next.test.ts::callback next falls back to /admin when it is not a same-origin path | app/auth/callback/route.ts | P0 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: res-129_callback_next_ad67
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached · 1 left on ledger (below floor) — cap 3/run

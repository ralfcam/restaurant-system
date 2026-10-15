# TDD log — res-98_staff_path_segment_0d6a

## C1 — SA-2 staff-path segment boundary

Suggested review order:
- Segment boundary [auth] [security]
  - `lib/supabase/proxy.ts:36`
  - `lib/supabase/proxy.ts:38`
- Staff gate redirect [auth]
  - `lib/supabase/proxy.ts:40`
  - `lib/supabase/proxy.ts:43`
- Prefix list
  - `lib/supabase/proxy.ts:5`
- Lookalike assertions
  - `tests/unit/auth/staff-proxy.test.ts:73`
- Nested `/admin/floor` still staff
  - `tests/unit/auth/staff-proxy.test.ts:84`

Reusable pattern: none (the segment predicate is already in `docs/testing/Design-And-Patterns.md`)

Re-verify (orchestrator, this turn): `pnpm test:unit tests/unit/auth/staff-proxy.test.ts` — 1 file, 2 passed, 0 skipped. `pnpm exec prettier --check lib/supabase/proxy.ts docs/specs/staff-authorization.md` clean. `pnpm lint` exit 0 (`eslint . --max-warnings 0`). `pnpm typecheck` exit 0 (`tsc --noEmit`).

## Suggested Review Order (collated)

- Segment boundary before the staff redirect [auth] [security] → `lib/supabase/proxy.ts:36` then `:38`
- Unauthenticated and non-staff redirects still use that match → `lib/supabase/proxy.ts:40`, `:43`
- Prefix list the matcher walks → `lib/supabase/proxy.ts:5`
- Lookalike pathnames must not redirect → `tests/unit/auth/staff-proxy.test.ts:73`
- Nested `/admin/floor` stays staff → `tests/unit/auth/staff-proxy.test.ts:84`
- Spec → `docs/specs/staff-authorization.md` SA-2

## Traceability (final)

Run: 2026-10-08 · plan: res-98_staff_path_segment_0d6a · issue: RES-98

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-2 | tests/unit/auth/staff-proxy.test.ts::lookalike pathnames are not staff routes | lib/supabase/proxy.ts | P0 | shipped |

## Run metrics

Run: 2026-10-08 → 2026-10-08 · plan: res-98_staff_path_segment_0d6a
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached · 0 left on ledger — the only residual duplicated the archived wont-file "Guest `/menu` only forbids a login redirect" (`docs/findings/archive.md`, reazed-310 C2/red). Not reopened.

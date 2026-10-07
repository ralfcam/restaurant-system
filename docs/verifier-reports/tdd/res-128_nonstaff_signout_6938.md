# TDD log res-128_nonstaff_signout_6938

### C1

Suggested review order:
- Session teardown on the sign-in client: `app/auth/login/page.tsx:48` [auth]
- Non-staff branch returns without `/admin`: `app/auth/login/page.tsx:46`
- Staff navigation stays after that branch: `app/auth/login/page.tsx:52`
- Slice assertion that `signOut(` is in the branch: `tests/unit/auth/login-staff-gate.test.ts:45`
Reusable pattern: none

## Suggested Review Order (collated)

- Session teardown on the sign-in client — `app/auth/login/page.tsx:48` [auth]
- Non-staff branch returns without `/admin` — `app/auth/login/page.tsx:46`
- Staff navigation stays after that branch — `app/auth/login/page.tsx:52`
- Slice assertion that `signOut(` is in the branch — `tests/unit/auth/login-staff-gate.test.ts:45`

## Traceability (final)

Run: 2026-10-05 · plan: res-128_nonstaff_signout_6938 · issue: RES-128

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-3 | tests/unit/auth/login-staff-gate.test.ts::non-staff password sign-in signs out before the handler returns | app/auth/login/page.tsx | P0 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: res-128_nonstaff_signout_6938
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 3 left on ledger (1 security med attach-only, 2 below floor) — cap 3/run

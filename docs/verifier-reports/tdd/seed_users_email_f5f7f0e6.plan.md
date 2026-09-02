# TDD verifier report — seed_users_email_f5f7f0e6.plan.md

FIX run. Linear: [REAZED-326](https://linear.app/realized/issue/REAZED-326).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — SA-5 staff `auth.users.email` is `admin@test.local`

Suggested review order:
- `[auth]` `[schema]` `supabase/seed.sql:33` — staff `auth.users` email `admin@test.local` (id `11111111-…`)
- `[auth]` `supabase/seed.sql:9` / `supabase/seed.sql:61-62` — credentials comment and identities email already the same address
- `supabase/seed.sql:101` — super-admin still `''` (C2; do not treat as C1 miss)
- `tests/unit/auth/seed-staff-claim.test.ts:123` — C1 pin via `authUsersInsertForId` (read-only this phase)

Reusable pattern: Pin a seed `auth.users` column by user id (`matchAll` + id check), not by “first INSERT INTO auth.users”, so a later sibling insert cannot steal the assertion.

### C2 — SA-9 super-admin `auth.users.email` is distinct named login

Suggested review order:
- seed identity emails (staff vs super-admin) [auth] [schema]
  - `supabase/seed.sql:33` staff `auth.users.email` `'admin@test.local'`
  - `supabase/seed.sql:101` super-admin `auth.users.email` `'superadmin@test.local'`
  - `supabase/seed.sql:62` / `supabase/seed.sql:130` matching `auth.identities` emails
- C2 pin vs C7 skip (read-only)
  - `tests/unit/auth/seed-super-admin-claim.test.ts:140` C2: non-empty + equals `superadmin@test.local` + differs from staff
  - `tests/unit/auth/seed-super-admin-claim.test.ts:127` C7: still skips empty-email assertion

Reusable pattern: seed-file unit tests that parse `auth.users` INSERT/VALUES by user id (not first-match) so staff and super-admin emails can be asserted independently without colliding on duplicated INSERT shape

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Seed `auth.users.email` literals `[auth]` `[schema]`

- `supabase/seed.sql:33` — staff id `11111111-…` email `'admin@test.local'` (SA-5; same address as identities)
- `supabase/seed.sql:101` — super-admin id `22222222-…` email `'superadmin@test.local'` (SA-9; pairwise distinct from staff)
- `supabase/seed.sql:62` / `supabase/seed.sql:130` — matching `auth.identities` emails
- `supabase/seed.sql:9` — credentials comment already named the staff login address

### 2. Regression pins (VALUES cell, not identities-only)

- `tests/unit/auth/seed-staff-claim.test.ts:123` — C1: staff `email` cell via `authUsersInsertForId`
- `tests/unit/auth/seed-super-admin-claim.test.ts:140` — C2: super-admin email named + non-empty + ≠ staff
- `tests/unit/auth/seed-super-admin-claim.test.ts:127` — leftover C7 `if (seededEmail !== "")` skip (read-only; not this run)

## Traceability (final)

Run: 2026-09-02 · plan: seed_users_email_f5f7f0e6.plan.md · issue: REAZED-326

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-5 | seed-staff-claim.test.ts::seed staff auth.users.email is admin@test.local | supabase/seed.sql | P0 | shipped |
| C2 | staff-authorization.md SA-9 | seed-super-admin-claim.test.ts::seed super-admin auth.users.email is superadmin@test.local and differs from staff | supabase/seed.sql | P0 | shipped |

## Run metrics

Run: 2026-09-02 → 2026-09-02 · plan: seed_users_email_f5f7f0e6.plan.md
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 4 left on ledger (below floor/cap) — cap 3/run

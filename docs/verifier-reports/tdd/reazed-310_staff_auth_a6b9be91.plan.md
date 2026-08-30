# TDD verifier report — REAZED-310 staff authorization (`reazed-310_staff_auth_a6b9be91.plan`)

FIX run. Linear: [REAZED-310](https://linear.app/realized/issue/REAZED-310).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — SA-1 requireStaffUser staff claim

Suggested review order:
- staff-claim predicate `[auth]` `[security]` `lib/supabase/require-staff.ts:20-21` (`isStaffUser`)
- action gate `[auth]` `lib/supabase/require-staff.ts:24-29` (`requireStaffUser` → `getUser` then claim)
- contract comment `[auth]` `lib/supabase/require-staff.ts:12-14`
- SA-1 unit pin `tests/unit/auth/require-staff.test.ts:19-36` (null / `user_metadata` spoof / `app_metadata.role === "staff"`)

Reusable pattern: Hoist a `getUser` mock on `@/lib/supabase/server` `createClient` and drive `requireStaffUser` with null, `user_metadata.role: "staff"` spoof, and `app_metadata.role: "staff"` so a session-only gate cannot vacuous-pass.

### C2 — SA-2 staff route proxy

Suggested review order:
- staff-route gate `[auth]` `[security]` `lib/supabase/proxy.ts:35-43` (`isStaffPath && !isStaffUser`; pathname `user ? "/" : "/auth/login"`)
- staff prefixes `lib/supabase/proxy.ts:5`
- cookie-free claim import `[auth]` `lib/supabase/proxy.ts:1` (`isStaffUser` from `is-staff-user.ts`, not `require-staff`/`server`)
- predicate `[auth]` `lib/supabase/is-staff-user.ts:4-6`
- action re-export `lib/supabase/require-staff.ts:20`
- SA-2 unit pin `tests/unit/auth/staff-proxy.test.ts:35-61`

Reusable pattern: Collapse dual staff-route redirects into one `nextUrl.clone()` and pick the pathname from session presence (`user ? "/" : "/auth/login"`), treating `isStaffUser(null)` as the unauthenticated case.

### C3 — SA-3 login landing

Suggested review order:
- staff landing gate `[auth]` `[security]` `app/auth/login/page.tsx:35-40` (`isStaffUser(data.user)` before `window.location.href = "/admin"`)
- client-safe claim import `[auth]` `app/auth/login/page.tsx:6` (`@/lib/supabase/is-staff-user`, not `require-staff`)
- non-staff error, no signOut `app/auth/login/page.tsx:35-37`
- error live region `app/auth/login/page.tsx:59-67` (`role="alert"`)
- SA-3 source pin `tests/unit/auth/login-staff-gate.test.ts:18-34`

Reusable pattern: After `signInWithPassword`, gate `/admin` with the shared `isStaffUser` helper on `data.user` (client-safe module, not `require-staff`); pin the page with a source scan so a client form does not need a render harness.

### C4 — SA-4 local signup off

Suggested review order:
- local public signup off `[security]` `supabase/config.toml:176` (`[auth] enable_signup = false`)
- email signup off `[security]` `supabase/config.toml:221` (`[auth.email] enable_signup = false`)
- SMS not part of SA-4 `supabase/config.toml:259` (`[auth.sms] enable_signup` unchanged)
- SA-4 unit pin `tests/unit/auth/signup-disabled.test.ts:31-38` (table-scoped `auth` + `auth.email`, not a global `enable_signup` grep)

Reusable pattern: Pin `[auth]` and `[auth.email] enable_signup` via table-scoped TOML reads so an `[auth.sms] enable_signup = false` cannot vacuous-pass SA-4.

### C5 — SA-5 seed staff claim

Suggested review order:
- seed staff claim `[auth]` `supabase/seed.sql:39` (`raw_app_meta_data` includes `"role":"staff"` plus existing provider fields)
- claim vs GoTrue column `[auth]` `supabase/seed.sql:6-8` (comment) · `supabase/seed.sql:14,32` (`auth.users.role` remains `'authenticated'`)
- login identity (unchanged) `supabase/seed.sql:59-61` (`admin@test.local` on `auth.identities`, not `auth.users.email`)
- SA-5 unit pin `tests/unit/auth/seed-staff-claim.test.ts:86-105` (`JSON.parse` + `toMatchObject({ role: "staff" })`)

Reusable pattern: Pin GoTrue seed `raw_app_meta_data` by `JSON.parse` of the staff `auth.users` VALUES cell (not a file-wide `"role":"staff"` grep) so a comment or `raw_user_meta_data` cannot vacuous-pass SA-5.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Staff claim predicate `[auth]` `[security]`

- Cookie-free `isStaffUser` — `lib/supabase/is-staff-user.ts:4-6` (`app_metadata.role === "staff"`, never `user_metadata`)
- Action gate `[auth]` `lib/supabase/require-staff.ts` (`getUser` then `isStaffUser`; re-export)
- SA-1 unit pin `tests/unit/auth/require-staff.test.ts:19-36` (null / `user_metadata` spoof / `app_metadata.role === "staff"`)

### 2. Staff route proxy `[auth]` `[security]`

- Gate `[auth]` `[security]` `lib/supabase/proxy.ts:35-43` (`isStaffPath && !isStaffUser`; pathname `user ? "/" : "/auth/login"`)
- Staff prefixes `lib/supabase/proxy.ts:5`
- Cookie-free import `[auth]` `lib/supabase/proxy.ts:1`
- SA-2 unit pin `tests/unit/auth/staff-proxy.test.ts:35-61`

### 3. Login landing `[auth]` `[security]`

- Staff landing gate `[auth]` `[security]` `app/auth/login/page.tsx:35-40` (`isStaffUser(data.user)` before `window.location.href = "/admin"`)
- Client-safe claim import `[auth]` `app/auth/login/page.tsx:6`
- Non-staff error, no signOut `app/auth/login/page.tsx:35-37`
- SA-3 source pin `tests/unit/auth/login-staff-gate.test.ts:18-34`

### 4. Local signup flags `[security]`

- `[auth] enable_signup = false` `[security]` `supabase/config.toml:176`
- `[auth.email] enable_signup = false` `[security]` `supabase/config.toml:221`
- SMS not part of SA-4 `supabase/config.toml:259`
- SA-4 unit pin `tests/unit/auth/signup-disabled.test.ts:31-38`

### 5. Seed staff claim `[auth]`

- `raw_app_meta_data` includes `"role":"staff"` `[auth]` `supabase/seed.sql:39`
- Comment vs `auth.users.role` `[auth]` `supabase/seed.sql:6-8`
- SA-5 unit pin `tests/unit/auth/seed-staff-claim.test.ts:86-105`

## Traceability (final)

Run: 2026-08-30 · plan: reazed-310_staff_auth_a6b9be91.plan · issue: REAZED-310

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-1 | require-staff.test.ts::requireStaffUser returns null for authenticated users without app_metadata.role staff | lib/supabase/require-staff.ts, lib/supabase/is-staff-user.ts | P0 | shipped |
| C2 | staff-authorization.md SA-2 | staff-proxy.test.ts::authenticated non-staff cannot open staff paths | lib/supabase/proxy.ts, lib/supabase/is-staff-user.ts | P0 | shipped |
| C3 | staff-authorization.md SA-3 | login-staff-gate.test.ts::login does not send non-staff sessions to /admin | app/auth/login/page.tsx | P0 | shipped |
| C4 | staff-authorization.md SA-4 | signup-disabled.test.ts::local Auth and email signup flags are false | supabase/config.toml | P0 | shipped |
| C5 | staff-authorization.md SA-5 | seed-staff-claim.test.ts::seed staff user raw_app_meta_data includes role staff | supabase/seed.sql | P1 | shipped |
| SA-6 | staff-authorization.md SA-6 | — | — | P0 | manual-uat |

## Run metrics

Run: 2026-08-30 → 2026-08-30 · plan: reazed-310_staff_auth_a6b9be91.plan
Criteria: 5 shipped · 1 manual-uat · 6 total
Phases delegated: 15 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 20 left on ledger (below floor/cap) — cap 3/run

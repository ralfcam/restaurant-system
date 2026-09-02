# TDD verifier report — REAZED-326 super-admin permission model (`reazed-326_super_admin_permission_model`)

FIX run. Linear: [REAZED-326](https://linear.app/realized/issue/REAZED-326).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### C1 — SA-7 super-admin boundary helper

Suggested review order:
- Super-admin claim predicate `[auth]` `[security]`
  - `lib/supabase/is-staff-user.ts:13` `isSuperAdminUser` (`app_metadata.role === "super_admin"`; looser `object` arg + `User` cast)
  - `lib/supabase/is-staff-user.ts:4` `isStaffUser` (still exact `"staff"` only — contrast for C2)
- Session gate wrapper `[auth]` `[security]`
  - `lib/supabase/require-staff.ts:31` `requireSuperAdminUser` (`getUser` then predicate; `null` if not super-admin)
  - `lib/supabase/require-staff.ts:23` `requireStaffUser` (sibling; unchanged)
  - `lib/supabase/require-staff.ts:21` re-export of both predicates
- Four-persona contract (read-only; assertions unchanged)
  - `tests/unit/auth/require-super-admin.test.ts:22`

Reusable pattern: Second auth tier as a sibling `isXUser`/`requireXUser` pair; keep the new predicate’s argument as `object | null | undefined` when unit fixtures are partial user literals so typecheck does not force editing the Red test.

### C2 — SA-1 super_admin implies staff

Suggested review order:
- `lib/supabase/is-staff-user.ts:13` — `isStaffUser` hierarchy (`staff` OR `isSuperAdminUser`) `[auth]` `[security]`
- `lib/supabase/is-staff-user.ts:8` — `isSuperAdminUser` still exact `"super_admin"` only `[auth]`
- `lib/supabase/require-staff.ts:23` — `requireStaffUser` still delegates to `isStaffUser` `[auth]`
- `lib/supabase/proxy.ts:39` — staff routes inherit the widened helper (SA-2)
- `app/auth/login/page.tsx:35` — login staff check inherits the same helper (SA-3)
- `tests/unit/auth/require-staff.test.ts:38` — C2 hierarchy case
- `tests/unit/auth/require-super-admin.test.ts:43` — staff still fails the super-admin gate `[auth]` `[security]`

Reusable pattern: Encode a role hierarchy by composing the broader gate from the stricter one (`isStaffUser` = `"staff"` OR `isSuperAdminUser`) so the privileged-role string lives in one function.

### C3 — SA-8 branding asset writes require super_admin

Suggested review order:
- [auth][security] `app/actions/branding.ts:110` — `uploadRestaurantLogo` → `requireSuperAdminUser()`
- [auth][security] `app/actions/branding.ts:180` — `removeRestaurantLogo` → `requireSuperAdminUser()`
- [auth][security] `app/actions/branding.ts:221` — `uploadRestaurantHeroImage` → `requireSuperAdminUser()`
- [auth] `app/actions/branding.ts:296` — `removeRestaurantHeroImage` → `requireSuperAdminUser()`
- [auth] `app/actions/branding.ts:325` — `loadRestaurantBookingSettings` still `requireStaffUser` (C4)
- [auth] `app/actions/branding.ts:362` — `upsertRestaurantSetting` still `requireStaffUser` (C4)
- `tests/unit/branding/actions.test.ts:23` — mock target `requireSuperAdminUser`
- `tests/unit/branding/actions.test.ts:88` (+ 190, 272, 366) — staff-only reject cases

Reusable pattern: When a module exports two auth gates, keep both on the `vi.mock` factory after swapping the mutation target so sibling helpers still resolve and “public read did not call the old gate” assertions stay live.

### C4 — SA-8 booking configuration writes require super_admin

Suggested review order:
- Shared write gate [auth] [security]: `app/actions/branding.ts:362` (`requireSuperAdminUser` in `upsertRestaurantSetting`)
- Write callers [auth]: `app/actions/branding.ts:386` (`updateSlotIntervalMinutes`), `app/actions/branding.ts:401` (`updateOccupancyDurationMinutes`), `app/actions/branding.ts:416` (`updateSafetyBufferMinutes`)
- Read path must stay staff [auth]: `app/actions/branding.ts:325` (`loadRestaurantBookingSettings` → `requireStaffUser`)
- Tests: `tests/unit/floor/slot-interval.test.ts:12` (mock both gates), `tests/unit/floor/slot-interval.test.ts:69` (staff-only reject), `tests/unit/floor/occupancy-settings.test.ts:108` / `:118` (staff-only reject for occupancy + buffer)

Reusable pattern: When splitting a shared helper’s auth tier, rename the local (`staffUser` → `superAdminUser`) in the same change as the gate swap so a later reader cannot mistake a super-admin write for a staff read.

### C5 — SA-8 restaurant contact info writes require super_admin

Suggested review order:
- Authz gate on contact-info write [auth] [security]
  - `app/actions/restaurant-info.ts:4` — import `requireSuperAdminUser` only
  - `app/actions/restaurant-info.ts:44` — `superAdminUser` local
  - `app/actions/restaurant-info.ts:45` — fail closed `"Unauthorized"`
- Public read stays ungated (intentional, SA-8)
  - `app/actions/restaurant-info.ts:16` — `getRestaurantInfoBar` still service-role select, no staff/super_admin check
- Persist after gate [security]
  - `app/actions/restaurant-info.ts:56` — service-role upsert of `address`/`phone`
- Unit contract
  - `tests/unit/restaurant-info/actions.test.ts:10` — mock `requireSuperAdminUser`
  - `tests/unit/restaurant-info/actions.test.ts:38` — null gate → no upsert; user → persist

Reusable pattern: After swapping a mutation from `requireStaffUser` to `requireSuperAdminUser`, rename the unused result local (`staffUser` → `superAdminUser`) in the same refactor so the identifier matches the gate; keep public reads (`getRestaurantInfoBar`) on the ungated path.

### C6 — SA-8 / PV-2 review-email settings writes require super_admin

Suggested review order:
- Authz gate `[auth]` `[security]` — `app/actions/marketing.ts:13` (`requireSuperAdminUser`) then `:14` (bail `{ error: "Unauthorized." }` before upsert)
- Persist after gate — `app/actions/marketing.ts:23-32` (service-role `restaurant_settings` upsert)
- PV-2 / SA-8 coverage — `tests/unit/marketing/review-email-settings.test.ts:46` (super_admin persist + unauth) then `:71` (staff-only → same null-gate contract)

Reusable pattern: After swapping a staff gate to `requireSuperAdminUser`, rename the unused `staffUser` local to `superAdminUser` in the same edit so the local cannot be read as still staff-gated.

### C7 — SA-9 idempotent super-admin seed identity

Suggested review order:
- Seed topology comments (local+linked) `supabase/seed.sql:4` · `supabase/seed.sql:73`
- [auth] Staff identity (must remain first INSERT; SA-5) `supabase/seed.sql:10` · `supabase/seed.sql:39` · `supabase/seed.sql:46` · `supabase/seed.sql:62`
- [auth] [security] Super-admin users row (id, app_metadata role, idempotency) `supabase/seed.sql:78` · `supabase/seed.sql:98` · `supabase/seed.sql:106` · `supabase/seed.sql:114`
- [auth] Super-admin identity email (login path) `supabase/seed.sql:116` · `supabase/seed.sql:130` · `supabase/seed.sql:139`
- C7 parser contract `tests/unit/auth/seed-super-admin-claim.test.ts:99`

Reusable pattern: Parse `supabase/seed.sql` INSERT…ON CONFLICT blocks in unit tests (column/value zip + `JSON.parse` of `raw_app_meta_data`) instead of hitting Postgres; keep login email on `auth.identities` and JWT role on `raw_app_meta_data`; do not put host/project ids in seed.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Two-tier JWT claim `[auth]` `[security]`

- `isSuperAdminUser` — `lib/supabase/is-staff-user.ts:8` (`app_metadata.role === "super_admin"`; looser `object` arg + `User` cast; never `user_metadata`)
- `isStaffUser` hierarchy — `lib/supabase/is-staff-user.ts:13` (`"staff"` OR `isSuperAdminUser`)
- `requireSuperAdminUser` — `lib/supabase/require-staff.ts:31` (`getUser` then predicate; staff-only → `null`)
- `requireStaffUser` — `lib/supabase/require-staff.ts:23` (now includes `super_admin`)
- Re-export — `lib/supabase/require-staff.ts:21`
- Four-persona pin — `tests/unit/auth/require-super-admin.test.ts:22`
- Hierarchy pin — `tests/unit/auth/require-staff.test.ts:38`

### 2. Super-admin-only writes `[auth]` `[security]`

- Branding assets — `app/actions/branding.ts:110` / `:180` / `:221` / `:296` (`requireSuperAdminUser`)
- Booking-config writes — `app/actions/branding.ts:362` (`upsertRestaurantSetting`); callers `:386` / `:401` / `:416`
- Booking-config reads stay staff — `app/actions/branding.ts:325` (`loadRestaurantBookingSettings` → `requireStaffUser`)
- Contact info — `app/actions/restaurant-info.ts:44` (`updateRestaurantContactInfo`); public `getRestaurantInfoBar` stays ungated (`:16`)
- Review-email settings — `app/actions/marketing.ts:13` (`saveReviewEmailSettings`)
- Tests — `tests/unit/branding/actions.test.ts`, `tests/unit/floor/slot-interval.test.ts`, `tests/unit/floor/occupancy-settings.test.ts`, `tests/unit/restaurant-info/actions.test.ts`, `tests/unit/marketing/review-email-settings.test.ts`

### 3. Staff chrome that inherits the widened helper `[auth]`

- `lib/supabase/proxy.ts:39` — staff routes inherit `isStaffUser`
- `app/auth/login/page.tsx:35` — login staff check inherits `isStaffUser`

### 4. Seed identities `[auth]` `[security]`

- Staff (SA-5, unchanged) — `supabase/seed.sql:10` / `:39` / `:62`
- Super-admin (SA-9) — `supabase/seed.sql:78` / `:106` (`"role": "super_admin"`) / `:114` / `:130` (`superadmin@test.local`)
- C7 pin — `tests/unit/auth/seed-super-admin-claim.test.ts:99`

## Traceability (final)

Run: 2026-09-02 · plan: reazed-326_super_admin_permission_model · issue: REAZED-326

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | staff-authorization.md SA-7 | require-super-admin.test.ts::requireSuperAdminUser / isSuperAdminUser across all four caller types | lib/supabase/is-staff-user.ts, lib/supabase/require-staff.ts | P0 | shipped |
| C2 | staff-authorization.md SA-1 | require-staff.test.ts::returns the user when app_metadata.role is super_admin (hierarchy) | lib/supabase/is-staff-user.ts | P0 | shipped |
| C3 | staff-authorization.md SA-8, branding-cms.md BC-2 | branding/actions.test.ts::rejects staff-only callers (logo/hero upload/remove) | app/actions/branding.ts | P0 | shipped |
| C4 | staff-authorization.md SA-8, scheduling.md FP-10 | floor/slot-interval.test.ts::rejects staff-only callers; occupancy-settings.test.ts::rejects staff-only callers for occupancy duration / safety buffer | app/actions/branding.ts | P0 | shipped |
| C5 | staff-authorization.md SA-8 | restaurant-info/actions.test.ts::updateRestaurantContactInfo requires super_admin | app/actions/restaurant-info.ts | P0 | shipped |
| C6 | staff-authorization.md SA-8, post-visit-review-email.md PV-2 | marketing/review-email-settings.test.ts::staff-only caller returns Unauthorized | app/actions/marketing.ts | P0 | shipped |
| C7 | staff-authorization.md SA-9 | seed-super-admin-claim.test.ts::seed super-admin user raw_app_meta_data includes role super_admin | supabase/seed.sql | P1 | shipped |

## Run metrics

Run: 2026-09-02 → 2026-09-02 · plan: reazed-326_super_admin_permission_model
Criteria: 7 shipped · 0 manual-uat · 7 total
Phases delegated: 21 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 1 attached-to-existing · 13 left on ledger (below floor/cap) — cap 3/run

# Staff authorization

**Status:** Draft
**Last updated:** 2026-09-02

## Scope

Who may use staff chrome (`/admin`, `/pos`, `/kds`) and privileged server
actions. Guest surfaces stay anonymous. Staff is a non-user-writable claim,
not merely a Supabase session. Super-admin is a second, stricter claim that
implies staff.

## Acceptance criteria

1. **SA-1 — Privileged actions require a staff claim** — A caller is staff
   when `user.app_metadata.role` is the string `"staff"` **or**
   `"super_admin"` (`super_admin` implies staff). `user_metadata.role` (or
   any other user-writable field) MUST NOT confer staff. Missing, empty, or
   any other value is not staff. `requireStaffUser` returns the user only for
   those claims; it returns `null` when there is no session and when the
   session is authenticated but not staff. Privileged server actions that
   already call `requireStaffUser` inherit this gate.

2. **SA-2 — Staff routes require the same claim** — Paths prefixed `/admin`,
   `/pos`, or `/kds` are staff-only. Unauthenticated requests redirect to
   `/auth/login`. Authenticated non-staff requests MUST NOT receive staff
   chrome; they redirect to `/`. A staff-claim session continues. Guest
   paths are unchanged. A `super_admin` session satisfies this gate (SA-1).

3. **SA-3 — Login does not grant staff chrome to non-staff** — `/auth/login`
   is sign-in only (no `signUp`). After a successful password sign-in, a
   non-staff session MUST NOT be sent to `/admin`.

4. **SA-4 — Local public signup is off** — `supabase/config.toml` has
   `[auth] enable_signup = false` and `[auth.email] enable_signup = false`.
   A test that only flips one of those keys MUST NOT satisfy this criterion.
   `[auth.sms] enable_signup = false` does not count as the email/auth keys.

5. **SA-5 — Seed user is staff** — Local seed user `admin@test.local`
   (`11111111-1111-1111-1111-111111111111`) has `raw_app_meta_data` including
   `"role": "staff"` in addition to existing provider fields. This identity
   remains the plain-staff persona (it MUST NOT be given `super_admin`).
   `auth.users.email` MUST be the string `admin@test.local` (the same address
   as the matching `auth.identities` email). Empty, NULL, or any other value
   does not satisfy this criterion.

6. **SA-6 — Hosted signup is off** _(manual-UAT)_ — Linked/hosted Supabase
   Auth (project `tilcqrudqxznnpepxjqq`) has email signup disabled. Local
   `config.toml` does not control hosted Auth.

7. **SA-7 — Super-admin boundary** — A caller is super-admin only when
   `user.app_metadata.role` is the string `"super_admin"`.
   `user_metadata.role` (or any other user-writable field) MUST NOT confer
   super-admin. Missing, empty, `"staff"`, or any other value is not
   super-admin. `isSuperAdminUser` is true only for that claim (otherwise
   false). `requireSuperAdminUser` returns the user only for that claim; it
   returns `null` when there is no session, when the session is
   authenticated but not staff, and when the session is authenticated
   staff-only (`app_metadata.role === "staff"`). Staff MUST NOT satisfy this
   gate. Privileged server actions that call `requireSuperAdminUser` inherit
   this gate.

8. **SA-8 — Permission matrix** — Every privileged mutation in
   `app/actions/*.ts` is classified as `staff` or `super_admin`. A
   `super_admin` session may use every `staff` action (SA-1). A staff-only
   session MUST NOT succeed on a `super_admin` action (SA-7). Reads that
   already call `requireStaffUser` stay on that gate unless this table says
   otherwise.

   | Gate          | Actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
   | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `super_admin` | Branding assets: `uploadRestaurantLogo`, `removeRestaurantLogo`, `uploadRestaurantHeroImage`, `removeRestaurantHeroImage`. Booking configuration writes: `updateSlotIntervalMinutes`, `updateOccupancyDurationMinutes`, `updateSafetyBufferMinutes` (via `upsertRestaurantSetting`). Restaurant contact info: `updateRestaurantContactInfo`. Review-email settings: `saveReviewEmailSettings`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
   | `staff`       | Reservations: `getReservations`, `getReservationsByDate`, `getReservationTables`, `transitionReservationStatus`, `undoReservationStatus`, `assignReservationTable`, `autoAssignDueReservations`, `getFloorSnapshot`. Floor/tables: `getTables`, `getActiveMerges`, `expireDueMerges`, `updateTableState`, `syncTableGroupStatus`, `mergeTables`, `splitMerge`, `createTable`, `deleteTable`. KDS: `createKitchenOrder`, `getActiveKitchenOrders`, `updateKitchenOrderStatus`. Menu catalog: `setChefsPicksEnabled`, `getAllMenuItems`, `upsertMenuItem`, `createMenuItem`, `deleteMenuItem`, `toggleMenuItemAvailability`. Operating hours / blocked dates: `upsertOperatingWindows`, `toggleBlockedDate`. Booking configuration reads: `getSlotIntervalMinutes`, `getOccupancyDurationMinutes`, `getSafetyBufferMinutes` (via `loadRestaurantBookingSettings`). |

9. **SA-9 — Seed super-admin identity** — Seed also provisions
   `superadmin@test.local` (`22222222-2222-2222-2222-222222222222`) with
   `raw_app_meta_data` including `"role": "super_admin"` in addition to
   existing provider fields, plus a matching `auth.identities` row. The
   insert is `ON CONFLICT (id) DO NOTHING` (idempotent on every `db reset`,
   `--local` and `--linked`). That id MUST differ from the SA-5 staff seed
   id. The block MUST NOT hardcode a host or environment-specific value.
   `auth.users.email` MUST be the string `superadmin@test.local` (the same
   address as the matching `auth.identities` email). Empty, NULL, or the
   SA-5 email does not satisfy this criterion. Seed `auth.users.email`
   values MUST be pairwise distinct so GoTrue’s unique email index
   (`users_email_partial_key`) does not reject a later insert on `db reset`
   (`--local` or `--linked`).

10. **SA-10 — Super-admin chrome is disabled for staff-only sessions** —
    Staff chrome MUST disable (not hide) every SA-8 `super_admin`-only
    control when the signed-in session is `staff`-only. The flag is
    `isSuperAdminUser(authUser)` computed in each page Server Component from
    its existing `getAuthUser()` call and passed down as an `isSuperAdmin`
    prop. A `super_admin` session sees the same controls fully enabled. This
    is a chrome affordance; SA-7/SA-8 remain the server-action gate.

    Surfaces: branding editors (`RestaurantLogoEditor`,
    `RestaurantHeroImageEditor`), restaurant contact-info fields in
    `SchedulingManager`, occupancy-duration and safety-buffer controls in
    `FloorPlan` (not the slot-interval control), and
    `ReviewEmailSettingsForm`.

## Implementation trace (non-normative)

FIX `seed_users_email_f5f7f0e6.plan.md` (REAZED-326, 2026-09-02). C1–C2 shipped.
FIX `ux_staffchrome_pos_batch_9c4a1b` (REAZED-332, 2026-09-02). SA-10 shipped.

| Criterion | Shipped in                                                                                                                                                                                                                                                | Tests                                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SA-5      | `supabase/seed.sql` staff `auth.users.email` `'admin@test.local'`                                                                                                                                                                                         | `tests/unit/auth/seed-staff-claim.test.ts` → "seed staff auth.users.email is admin@test.local"                                                                                                         |
| SA-9      | `supabase/seed.sql` super-admin `auth.users.email` `'superadmin@test.local'` (pairwise distinct from staff)                                                                                                                                               | `tests/unit/auth/seed-super-admin-claim.test.ts` → "seed super-admin auth.users.email is superadmin@test.local and differs from staff"                                                                 |
| SA-10     | Page RSCs pass `isSuperAdmin={isSuperAdminUser(authUser)}`; branding editors, `SchedulingManager` contact fields, `FloorPlan` occupancy/safety (not slot-interval), `ReviewEmailSettingsForm`; `StaffShell` threads the flag; `/pos`/`/kds` `getAuthUser` | `tests/unit/branding/super-admin-chrome.test.ts`; `tests/unit/scheduling/super-admin-chrome.test.ts`; `tests/unit/floor/super-admin-chrome.test.ts`; `tests/unit/marketing/super-admin-chrome.test.ts` |

## Out of scope

- Per-surface roles (admin vs POS vs KDS)
- Staff invite / user-admin UI
- Additional named roles or permissions beyond `staff` and `super_admin`
- Changing `createServiceClient()` — service role remains the privileged-write
  path after SA-1 / SA-7

## References

- `lib/supabase/is-staff-user.ts`
- `lib/supabase/require-staff.ts`
- `lib/supabase/proxy.ts`
- `app/auth/login/page.tsx`
- `supabase/config.toml`
- `supabase/seed.sql`
- [branding-cms.md](./branding-cms.md) (BC-2)
- [post-visit-review-email.md](./post-visit-review-email.md) (PV-2)
- [scheduling.md](./scheduling.md) (FP-10)
- `tests/unit/branding/super-admin-chrome.test.ts` (SA-10 branding editors)
- `tests/unit/scheduling/super-admin-chrome.test.ts` (SA-10 contact-info)
- `tests/unit/floor/super-admin-chrome.test.ts` (SA-10 floor booking-config)
- `tests/unit/marketing/super-admin-chrome.test.ts` (SA-10 review-email form)
- [../architecture/Auth-And-RLS.md](../architecture/Auth-And-RLS.md)

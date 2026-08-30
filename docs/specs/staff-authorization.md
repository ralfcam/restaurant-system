# Staff authorization

**Status:** Draft
**Last updated:** 2026-08-30

## Scope

Who may use staff chrome (`/admin`, `/pos`, `/kds`) and privileged server
actions. Guest surfaces stay anonymous. Staff is a non-user-writable claim,
not merely a Supabase session.

## Acceptance criteria

1. **SA-1 — Privileged actions require a staff claim** — A caller is staff
   only when `user.app_metadata.role` is the string `"staff"`.
   `user_metadata.role` (or any other user-writable field) MUST NOT confer
   staff. Missing, empty, or any other value is not staff.
   `requireStaffUser` returns the user only for that claim; it returns `null`
   when there is no session and when the session is authenticated but not
   staff. Privileged server actions that already call `requireStaffUser`
   inherit this gate.

2. **SA-2 — Staff routes require the same claim** — Paths prefixed `/admin`,
   `/pos`, or `/kds` are staff-only. Unauthenticated requests redirect to
   `/auth/login`. Authenticated non-staff requests MUST NOT receive staff
   chrome; they redirect to `/`. A staff-claim session continues. Guest
   paths are unchanged.

3. **SA-3 — Login does not grant staff chrome to non-staff** — `/auth/login`
   is sign-in only (no `signUp`). After a successful password sign-in, a
   non-staff session MUST NOT be sent to `/admin`.

4. **SA-4 — Local public signup is off** — `supabase/config.toml` has
   `[auth] enable_signup = false` and `[auth.email] enable_signup = false`.
   A test that only flips one of those keys MUST NOT satisfy this criterion.
   `[auth.sms] enable_signup = false` does not count as the email/auth keys.

5. **SA-5 — Seed user is staff** — Local seed user `admin@test.local`
   (`11111111-1111-1111-1111-111111111111`) has `raw_app_meta_data` including
   `"role": "staff"` in addition to existing provider fields.

6. **SA-6 — Hosted signup is off** _(manual-UAT)_ — Linked/hosted Supabase
   Auth (project `tilcqrudqxznnpepxjqq`) has email signup disabled. Local
   `config.toml` does not control hosted Auth.

## Out of scope

- Per-surface roles (admin vs POS vs KDS)
- Staff invite / user-admin UI
- Changing `createServiceClient()` — service role remains the staff-write
  path after SA-1

## References

- `lib/supabase/is-staff-user.ts`
- `lib/supabase/require-staff.ts`
- `lib/supabase/proxy.ts`
- `app/auth/login/page.tsx`
- `supabase/config.toml`
- `supabase/seed.sql`
- [branding-cms.md](./branding-cms.md) (BC-2)
- [../architecture/Auth-And-RLS.md](../architecture/Auth-And-RLS.md)

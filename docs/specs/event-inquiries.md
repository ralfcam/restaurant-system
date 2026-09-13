# Event inquiries

**Status:** Draft
**Last updated:** 2026-09-13

## Scope

Staff-only capture-and-track for group and private-event requests that do not
fit the guest reservation widget ([booking-rules.md](./booking-rules.md)
party-size cap of 8). Staff chrome is `/admin/inquiries` under Service, next
to `/admin/reservations`. Rows persist on `event_inquiries`, never on
`reservations`.

An inquiry MUST NOT occupy covers, MUST NOT receive `conf_code`, and MUST
NOT appear in reservation analytics. Conversion to a reservation, inventory
holds, a guest form, email notifications, and event pricing/menus are out of
this spec.

## Acceptance criteria

1. **EI-1 — Staff gate** — `/admin/inquiries` is a staff `/admin` path
   ([staff-authorization.md](./staff-authorization.md) SA-2). Every reader
   and mutation MUST use `requireStaffUser` plus `createServiceClient`.
   Unauthenticated requests follow the existing `/admin` login redirect.
   Authenticated non-staff MUST NOT receive the inquiry payload or chrome. A
   `super_admin` session may use it (SA-1). Staff shell Service nav MUST
   include an item to `/admin/inquiries`. Staff chrome stays English-only
   ([site-localization.md](./site-localization.md)).

2. **EI-2 — Sibling table, not reservations** — Schema defines
   `event_inquiries` with at least: `id` (UUID PK), `guest_name` (TEXT NOT
   NULL), `email` (TEXT NULL), `phone` (TEXT NULL), `requested_date` (DATE
   NOT NULL), `party_size` (INTEGER NOT NULL, CHECK `>= 1`), `kind` (TEXT
   NULL, CHECK `IN ('group', 'private_event')`), `notes` (TEXT NULL),
   `status` (TEXT NOT NULL DEFAULT `'open'`, CHECK `IN ('open', 'contacted',
'declined', 'closed')`), `created_at`, `updated_at`. A table CHECK MUST
   require at least one of `email` or `phone` to be non-blank after trim.
   This workflow MUST NOT `INSERT`, `UPDATE`, or `DELETE` `reservations`.
   Creating or updating an inquiry MUST NOT mint `conf_code`, MUST NOT
   occupy covers ([booking-rules.md](./booking-rules.md) BW-9 / BW-10), and
   MUST NOT be counted by [reservation-analytics.md](./reservation-analytics.md)
   RA-7.

3. **EI-3 — Privileges** — `event_inquiries` follows private-sibling SIB-PRIV
   ([scheduling.md](./scheduling.md) §19): RLS enabled; no table privilege or
   RLS policy for `PUBLIC`, `anon`, or `authenticated`; service-role
   `FOR ALL` policy; `GRANT ALL ON TABLE event_inquiries TO service_role`.
   Guest Data API MUST NOT `SELECT` inquiry PII. Staff access is only via
   EI-1 actions.

4. **EI-4 — Create** — Staff create with `guest_name` (trimmed non-empty),
   `requested_date` as `YYYY-MM-DD`, `party_size` integer `>= 1` (no
   8-cover cap on this table), optional `kind` `group` or `private_event`,
   optional `notes`, and at least one of `email` or `phone`. `status`
   defaults to `open`. If `email` is present, validate like booking-rules
   BW-13 (trimmed, `local@domain` with a `.` in the domain). If `phone` is
   non-blank, it MUST match the existing guest-booking phone pattern
   (`PHONE_RE` in `lib/reservations/validation.ts`). Missing/invalid input
   MUST return a stable error and MUST NOT insert a row. Unauthenticated or
   non-staff MUST get `Unauthorized.` and MUST NOT insert.

5. **EI-5 — List** — Default `/admin/inquiries` lists rows with `status IN
('open', 'contacted')`, all dates, ordered by `requested_date` then
   `created_at`. Staff MAY filter to `declined`, `closed`, or all statuses.
   Auth failure or query failure MUST return a Result `{ inquiries: [],
error }` with a stable message, never a successful empty array (same
   fail-closed shape as booking-rules STAFF-LIST).

6. **EI-6 — Status update** — Staff MAY set `status` to any of `open`,
   `contacted`, `declined`, `closed`. An invalid status is rejected with a
   stable error and MUST NOT write. v1 MUST NOT edit `guest_name`, contact,
   `requested_date`, `party_size`, `kind`, or `notes` after create. Status
   update MUST NOT write `reservations`.

7. **EI-7 — Isolation from reservation surfaces** — `/admin/reservations`,
   floor auto-assign, occupancy cover counts, and the guest widget MUST NOT
   list, assign, or occupy `event_inquiries` rows. `getReservationsByDate`
   is unchanged: it reads `reservations` only.

8. **EI-8 — No conversion** — There is no convert/confirm action. Setting
   `status` to `closed` (or any other status) MUST NOT `INSERT` into
   `reservations`.

9. **EI-9 — Mutating integ is local-only** — Mutating automated coverage
   under `tests/integration/inquiries/*.integ.test.ts` MUST run only against
   local Supabase and MUST fail closed when `NEXT_PUBLIC_SUPABASE_URL` is
   not local. Use zero-argument `assertIsolatedHoursMutationTarget()` as the
   first statement of `beforeAll` and of every write-cleanup hook, same pin
   as booking-rules RES-ISO.

## Implementation trace (non-normative)

FEATURE `res-91_event_inquiries_b25c4399` (RES-91, 2026-09-13). EI-1–EI-9
shipped. `/admin/inquiries` chrome is list-only (name / requested date /
party / status). `createInquiry` and `updateInquiryStatus` are staff
server actions with no staff forms. Default list is `open`+`contacted`.
No convert/confirm, guest form, email, or inventory hold.

| Criterion | Shipped in                                                                                                                                                                                                                                                          | Tests                                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EI-1      | `app/admin/inquiries/page.tsx` (`StaffShell`, `dynamic = "force-dynamic"`); `app/actions/inquiries.ts` (`requireStaffUser` then `createServiceClient`); `components/staff/staff-shell.tsx` NAV `href: "/admin/inquiries"` and Service `NAV_GROUPS` include-list     | `tests/unit/inquiries/staff-gate.test.ts` → "staff inquiries is gated and linked from Service nav"                                                                                                                                                         |
| EI-2      | `supabase/migrations/00000000000000_baseline.sql` `CREATE TABLE IF NOT EXISTS event_inquiries` after `servers` GRANT; CHECKs inside `CREATE TABLE`; `NULLIF(BTRIM(email\|phone), '')` contact CHECK                                                                 | `tests/unit/inquiries/schema.test.ts` → "baseline defines event_inquiries CHECKs"; `tests/integration/inquiries/event-inquiries.integ.test.ts` → "rejects blank contact and party_size below 1"                                                            |
| EI-3      | Same baseline block: ENABLE RLS; `DROP POLICY IF EXISTS` authenticated `FOR ALL` (never `CREATE`); service_role `FOR ALL`; `REVOKE ALL` from `PUBLIC, anon, authenticated`; `GRANT ALL` to `service_role`. Matrix pin: `IN_SCOPE_TABLES` + `PRIVATE_TABLES`         | `tests/integration/security/sibling-privileges.integ.test.ts` → "local reset exposes only the approved sibling role capability matrix"                                                                                                                     |
| EI-4      | `app/actions/inquiries.ts` `createInquiry`; `lib/inquiries/validation.ts` constructed row (never spread client payload); `EMAIL_RE` / `PHONE_RE` from `lib/reservations/validation.ts`; omit `status` so DB default `open` applies                                  | `tests/unit/inquiries/create.test.ts` → "staff createInquiry persists open inquiry and rejects invalid contact"                                                                                                                                            |
| EI-5      | `getEventInquiries` default `.in("status", ["open","contacted"])`; `"all"` drops `.in`; fail-closed `{ inquiries: [], error }`. Page calls no-arg `getEventInquiries()` and unwraps `.inquiries` / `.error`. `InquiriesManager` list-only (no create/status chrome) | `tests/unit/inquiries/list.test.ts` → "list defaults to open+contacted and fail-closes"                                                                                                                                                                    |
| EI-6      | `updateInquiryStatus` — CHECK-aligned `INQUIRY_STATUSES`; invalid → `Invalid inquiry status.` (no client); `.from("event_inquiries").update({ status })` only                                                                                                       | `tests/unit/inquiries/update-status.test.ts` → "staff may set any of four statuses and cannot edit other fields"                                                                                                                                           |
| EI-7      | `createInquiry` inserts `event_inquiries` only; `getReservationsByDate` / `getAvailableSlots` stay `.from("reservations")`; occupancy trigger still `SUM(r.party_size) FROM reservations r`                                                                         | `tests/integration/inquiries/event-inquiries.integ.test.ts` → "inquiry rows do not occupy covers or appear on reservations"                                                                                                                                |
| EI-8      | Three async exports only (`getEventInquiries`, `createInquiry`, `updateInquiryStatus`); `closed` is a status write, not a booking                                                                                                                                   | `tests/unit/inquiries/no-convert.test.ts` → "inquiries actions have no convert or confirm export and closing does not touch reservations"; `tests/integration/inquiries/event-inquiries.integ.test.ts` → "closing an inquiry does not insert reservations" |
| EI-9      | `tests/integration/inquiries/*.integ.test.ts` zero-arg `assertIsolatedHoursMutationTarget()` first in `beforeAll` / write-cleanup hooks. Copy of RES-ISO AST pin (not a shared fourth-copy scanner)                                                                 | `tests/unit/inquiries/inquiry-integ-isolation.test.ts` → "inquiries integ suites call assertIsolatedHoursMutationTarget before mutating writes"                                                                                                            |

## References

- [booking-rules.md](./booking-rules.md) (AC-1 party cap, AC-5 guest PII,
  BW-9 occupancy, STAFF-LIST, RES-ISO, BW-13 email)
- [staff-authorization.md](./staff-authorization.md) (SA-1 / SA-2)
- [scheduling.md](./scheduling.md) §19 SIB-PRIV
- [reservation-analytics.md](./reservation-analytics.md) (RA-7 must not see
  these rows)
- [RES-91](https://linear.app/realized/issue/RES-91/add-workflow-for-group-and-private-event-inquiries)

# Guest profiles

**Status:** Draft
**Last updated:** 2026-09-16

## Scope

Staff-only customer ficha for the host / reservations desk. Chrome is
`/admin/customers/[email]` ([staff-authorization.md](./staff-authorization.md)
SA-2). The ficha is opened from an existing reservation that has a non-blank
email. Identity is `reservations.email` trimmed and lowercased. There is no
`guests` table and no `guest_id` in this spec.

The page shows the guest fields already stored on reservations (`guest_name`,
`email`, `phone`, `notes`) and every reservation with that normalized email,
newest `date` then `time` first. `completed` reservations are visits;
`confirmed`, `seated`, and `cancelled` are not. Staff may save `guest_name`
and `phone`; Save writes those two columns to every reservation in the group.
`email` is read-only on the ficha.

A later reservation inserted with the same normalized email appears on the
next staff ficha read. Histories for different emails never mix. A
blank/null/whitespace email has no ficha and no link from the reservation
row.

Guest roles still cannot `SELECT` reservations
([booking-rules.md](./booking-rules.md) AC-5 / RES-PRIV). This spec does not
change guest INSERT allowlists.

Out of this spec: a customer list/directory, a guest-facing portal, a
`guests` table / `guest_id`, duplicate merge and name/phone matching
(RES-84 / RES-92), editing or merging by email, tags / blacklist / channel /
ratings / no-show ledger (RES-105–111), visit-count badge and
returning-guest highlight (RES-79 / RES-82), and editing `notes` on the
ficha.

## Acceptance criteria

1. **GP-1 — Staff route** — `GET /admin/customers/[email]` is a staff
   `/admin` path ([staff-authorization.md](./staff-authorization.md) SA-2).
   The reader MUST use `requireStaffUser` plus `createServiceClient`.
   Unauthenticated requests follow the existing `/admin` login redirect.
   Authenticated non-staff MUST NOT receive the ficha payload or chrome. A
   `super_admin` session may use it (SA-1). Staff chrome stays English-only
   ([site-localization.md](./site-localization.md)).

2. **GP-2 — Identity key** — `[email]` is interpreted as trim + lowercase.
   A reservation belongs to the ficha iff
   `trim(lower(reservations.email))` equals that key. Reservations with
   null, blank, or whitespace-only email MUST NOT appear on any ficha. The
   path parameter is the normalized email, percent-encoded in the URL.

3. **GP-3 — Isolation** — A ficha for email A MUST NOT include any
   reservation whose normalized email is B.

4. **GP-4 — Guest fields** — The ficha displays `guest_name`, `email`
   (read-only), `phone`, and `notes`. When rows in the group disagree,
   name / phone / notes shown are those of the newest reservation (`date`,
   then `time`). The email shown is the identity key.

5. **GP-5 — Reservation history** — The ficha lists every associated
   reservation with at least date, time, `party_size`, and status.

6. **GP-6 — Visits** — A history row with `status = 'completed'` is marked
   as a visit. `confirmed`, `seated`, and `cancelled` are not visits.
   `no_show` is not a visit if that status appears later (RES-67).

7. **GP-7 — Order** — History is ordered by reservation `date` descending,
   then `time` descending (newest first).

8. **GP-8 — New reservation appears** — After a reservation is inserted with
   the same normalized email, the next staff ficha read includes that row.
   No rebuild job is required.

9. **GP-9 — Entry from reservation** — On `/admin/reservations`, a
   reservation with a non-blank email exposes a control that navigates to
   `/admin/customers/{normalizedEmail}`. A reservation with blank email
   exposes no ficha control. v1 does not require a customer-list nav item.

10. **GP-10 — PII edit** — Staff can submit a new `guest_name` and `phone`
    on the ficha. The mutation updates `guest_name` and `phone` on every
    reservation in the group and MUST NOT change `email` on any row. The
    email field is not an editable control. Unauthenticated and
    authenticated non-staff MUST NOT mutate.

11. **GP-11 — RES-PRIV** — The ficha reader and mutator MUST NOT grant
    `anon` or `authenticated` `SELECT` on `reservations`. Guest INSERT
    remains insert-only per [booking-rules.md](./booking-rules.md) AC-5.

12. **GP-12 — Empty key** — Visiting `/admin/customers/[email]` with a
    normalized email that matches no reservations shows a clear
    empty/not-found state and MUST NOT list any other guest's reservations.

## Implementation trace (non-normative)

FEATURE `res-104_guest_profiles_f8c2e1a0` (RES-104, 2026-09-16) plus
FIX `res-104_cr_majors_b3e8a1c2` (2026-09-16). GP-1–GP-12 shipped at the
builder / action / reservation-row entry and ficha chrome. Identity is
`normalizeGuestEmail` (trim + lowercase). Live read is `requireStaffUser`
then a fresh `createServiceClient` `.eq("email_normalized",
normalizeGuestEmail(email))` into `buildGuestProfile`. Baseline
`email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED`
plus `reservations_email_normalized_idx`. Mutator `updateGuestProfilePii`
still `.eq("email", normalizeGuestEmail(...))` (no new GRANT SELECT).
`/admin/customers/[email]` is `force-dynamic` + `StaffShell` +
`getGuestProfile`; chrome interpolates `profile.email` / `profile.notes`,
Save calls `updateGuestProfilePii({ email, guest_name, phone })` with
`defaultValue={profile.guest_name|phone}`, and an exclusive ternary
(`No reservations — not found.` vs history `<ul>`). Entry is
`const fichaHref = guestProfileHref(r.email)` plus a ternary `Link` on
`/admin/reservations`. No customer-list nav item. No `guests` table.

| Criterion | Shipped in                                                                                                                                                                                                                                                                                                                                                               | Tests                                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GP-1      | `app/admin/customers/[email]/page.tsx` (`dynamic = "force-dynamic"`, `StaffShell`, `Promise.all([getGuestProfile, getAuthUser])`); `getGuestProfile` is `requireStaffUser` then `createServiceClient`. Chrome is read-only PII + Save + exclusive empty/history                                                                                                          | `tests/unit/guest-profiles/staff-gate.test.ts` → "staff guest profile is gated at /admin/customers"                                                                                                                                                  |
| GP-2      | `lib/guest-profiles.ts` `normalizeGuestEmail` (`trim` + `toLowerCase`, blank → `null`); `guestProfileHref` percent-encodes the key. Live membership is `.eq("email_normalized", normalizeGuestEmail(email))` on generated `email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED` + `reservations_email_normalized_idx` (`00000000000000_baseline.sql`) | `tests/unit/guest-profiles/build-profile.test.ts` → "normalizeGuestEmail matches trim+lowercase and drops blank emails"; `tests/unit/guest-profiles/live-read.test.ts` → "getGuestProfile includes reservations that differ only by case or padding" |
| GP-3      | `buildGuestProfile` filters `normalizeGuestEmail(row.email) === key` before mapping                                                                                                                                                                                                                                                                                      | `tests/unit/guest-profiles/build-profile.test.ts` → "buildGuestProfile excludes other emails"                                                                                                                                                        |
| GP-4      | After newest-first sort, displayed PII is `history[0]` (`guest_name` / `phone` / `notes`); ficha `email` is the identity key. Page interpolates `profile.email` / `profile.notes` as text (never `type="email"`) and `defaultValue={profile.guest_name}` / `defaultValue={profile.phone}`                                                                                | `tests/unit/guest-profiles/build-profile.test.ts` → "displayed PII comes from the newest reservation"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha displays guest_name email phone notes"                                          |
| GP-5      | History rows keep `...row` plus `date`, `time`, `party_size`, `status`, `isVisit`. Page lists `{row.date} {row.time} {row.party_size} {row.status}` with index-prefixed composite key                                                                                                                                                                                    | `tests/unit/guest-profiles/build-profile.test.ts` → "each history row has date time party_size status"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha lists date time party_size status"                                             |
| GP-6      | `isVisit: row.status === "completed"` after the email filter (not analytics' `completed && completed_at`)                                                                                                                                                                                                                                                                | `tests/unit/guest-profiles/build-profile.test.ts` → "completed reservations are visits and others are not"                                                                                                                                           |
| GP-7      | History `sort` is `date` then `time` `localeCompare` descending                                                                                                                                                                                                                                                                                                          | `tests/unit/guest-profiles/build-profile.test.ts` → "history is newest date then time first"                                                                                                                                                         |
| GP-8      | `getGuestProfile` — `requireStaffUser` then fresh `createServiceClient().from("reservations").select("*").eq("email_normalized", normalizeGuestEmail(email))` into `buildGuestProfile`                                                                                                                                                                                   | `tests/unit/guest-profiles/live-read.test.ts` → "getGuestProfile is a live service-role select"                                                                                                                                                      |
| GP-9      | `guestProfileHref`; `ReservationRow.email`; `ReservationsManager` maps `email` and renders `const fichaHref = guestProfileHref(r.email)` plus ternary `Link href={fichaHref}` / `: null`. No customer-list nav item                                                                                                                                                      | `tests/unit/guest-profiles/reservation-entry.test.ts` → "reservations list links a non-blank email to the ficha"; "reservations list renders a ficha link for non-blank email only"                                                                  |
| GP-10     | `updateGuestProfilePii` — `requireStaffUser` then service-role `.update({ guest_name, phone }).eq("email", normalizeGuestEmail(...))`. Page Save form calls `updateGuestProfilePii({ email, guest_name, phone })` (a11y `htmlFor`/`id`/`autoComplete` on chrome, not inside the call)                                                                                    | `tests/unit/guest-profiles/update-pii.test.ts` → "updateGuestProfilePii writes name and phone on the email group and never email"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha save control writes name and phone and not email"   |
| GP-11     | Reader and mutator construct `createServiceClient` only after staff; no `GRANT SELECT` on `reservations` for `anon` / `authenticated`                                                                                                                                                                                                                                    | `tests/unit/guest-profiles/res-priv.test.ts` → "guest profile reader and mutator use service client and do not grant anon SELECT"                                                                                                                    |
| GP-12     | Same filter + return; empty match is `history: []` and `email: key`. Page empty chrome is exclusive ternary (`!history?.length` → `No reservations — not found.` else history `<ul>`)                                                                                                                                                                                    | `tests/unit/guest-profiles/build-profile.test.ts` → "empty matching set is empty not other guests"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha empty key is empty not other guests"                                               |

## References

- [staff-authorization.md](./staff-authorization.md) (SA-1 / SA-2 / SA-8)
- [booking-rules.md](./booking-rules.md) (AC-5 / RES-PRIV, STAFF-LIST)
- [site-localization.md](./site-localization.md) (staff chrome English-only)
- [RES-104](https://linear.app/realized/issue/RES-104)

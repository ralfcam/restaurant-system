# Guest profiles

**Status:** Draft
**Last updated:** 2026-09-24

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
ratings / no-show ledger (RES-105–111), returning-guest highlight
(RES-82), and editing `notes` on the ficha.

## Acceptance criteria

1. **GP-1 — Staff route** — `GET /admin/customers/[email]` is a staff
   `/admin` path ([staff-authorization.md](./staff-authorization.md) SA-2).
   The reader MUST use `requireStaffUser` plus `createServiceClient`.
   Unauthenticated requests follow the existing `/admin` login redirect.
   Authenticated non-staff MUST NOT receive the ficha payload or chrome. A
   `super_admin` session may use it (SA-1). Chrome copy comes from
   `staff.customers.*` catalogs (French on staff per
   [site-localization.md](./site-localization.md) AC-20/AC-26).

2. **GP-2 — Identity key** — `[email]` is interpreted as trim + lowercase.
   A reservation belongs to the ficha iff
   `trim(lower(reservations.email))` equals that key. Reservations with
   null, blank, or whitespace-only email MUST NOT appear on any ficha. The
   path parameter is the normalized email, percent-encoded in the URL. The
   route reader MUST percent-decode the `[email]` segment exactly once, then
   normalize. That decoded key is the only value used for lookup, Save, and
   every visible email; `%40` never appears in chrome. A malformed escape
   does not throw and renders the GP-12 empty state.

3. **GP-3 — Isolation** — A ficha for email A MUST NOT include any
   reservation whose normalized email is B.

4. **GP-4 — Guest fields** — The ficha displays `guest_name`, `email`
   (read-only), `phone`, and `notes`. When rows in the group disagree,
   name / phone / notes shown are those of the newest reservation (`date`,
   then `time`). The email shown is the identity key. Labels are Name, Email
   (read-only), Phone, and Notes (operational only), with helper text "Use
   for reservation-related notes only." Notes is read-only. First/Last name
   are deferred until dedicated columns exist; `guest_name` is never split
   heuristically.

5. **GP-5 — Reservation history** — The ficha lists every associated
   reservation in a structured table with columns Date, Time, Party Size,
   Table (`table_label`), Status, and Notes. Status uses the Staff Console
   `ReservationStatusBadge`. Same-day rows stay separate.

6. **GP-6 — Visits** — A history row with `status = 'completed'` is marked
   as a visit. `confirmed`, `seated`, and `cancelled` are not visits.
   `no_show` is not a visit if that status appears later (RES-67). A
   `completed` row shows a visible "Visit" marker next to its Completed
   status.

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
    authenticated non-staff MUST NOT mutate. The mutator returns `{ ok: true }`
    when at least one row was updated. It returns
    `{ error: "errors.guestProfiles.notFound" }` when zero rows matched.
    Success and error are both shown to the user, and a reload shows the
    persisted values.

11. **GP-11 — RES-PRIV** — The ficha reader and mutator MUST NOT grant
    `anon` or `authenticated` `SELECT` on `reservations`. Guest INSERT
    remains insert-only per [booking-rules.md](./booking-rules.md) AC-5.

12. **GP-12 — Empty key** — Visiting `/admin/customers/[email]` with a
    normalized email that matches no reservations shows a clear
    empty/not-found state and MUST NOT list any other guest's reservations.

13. **GP-13 — Overlay** — From `/admin/reservations`, the Guest profile
    control opens the profile as a centered modal over Reservations. The
    backdrop is dimmed and non-interactive, and there are a close button and
    Esc. Closing returns to the same `/admin/reservations?date=` URL with
    list state intact. A direct load of `/admin/customers/[email]` renders
    the full-page profile.

14. **GP-14 — Summary** — Total reservations = history length. Completed
    visits = the count of `isVisit` rows. Last visit = the date of the newest
    completed row, or none. No other metrics: no risk, no-show %, blacklist,
    VIP/Regular, inferred preferences, or location.

15. **GP-15 — Privacy notices** — The header shows the decoded email and
    "Staff-only • Operational data only". The footer shows "Data shown is
    limited to reservation operations."

## Implementation trace (non-normative)

FEATURE `res-104_guest_profiles_f8c2e1a0` (RES-104, 2026-09-16) plus
FIX `res-104_cr_majors_b3e8a1c2` (2026-09-16) plus
FIX `res-104_cr_mutator_d4b2a9c1` (2026-09-16) plus
FIX `res-116_guest_profile_overlay_7c41d9e2` (RES-116, 2026-09-24).
GP-1–GP-15 shipped at the builder / action / reservation-row entry, panel,
and overlay. Identity is `normalizeGuestEmail` (trim + lowercase). Route
params decode once via `guestEmailFromRouteParam` (one
`decodeURIComponent` in try/catch, then `normalizeGuestEmail`). Live read is `requireStaffUser` then a fresh
`createServiceClient` `.eq("email_normalized", normalizeGuestEmail(email))`
into `buildGuestProfile`. Baseline
`email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED`
plus `reservations_email_normalized_idx`. Mutator `updateGuestProfilePii`
`.update({ guest_name, phone }).eq("email_normalized",
normalizeGuestEmail(input.email)).select("id")` returns `{ ok: true }` or
`errors.guestProfiles.notFound` when `data` is empty (no new GRANT SELECT).
`/admin/customers/[email]` is `force-dynamic` + `StaffShell` +
`GuestProfilePanel` (`showEmail={false}`; shell `description={profile.email}`).
The same panel is the `@modal` intercept via `GuestProfileDialog`
(`router.back()`). `app/admin/@modal/default.tsx` returns `null`.
`app/admin/layout.tsx` renders `{modal}`. Entry is
`const fichaHref = guestProfileHref(r.email)` plus a ternary `Link` on
`/admin/reservations`. No customer-list nav item. No `guests` table.

| Criterion | Shipped in                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GP-1      | Direct `/admin/customers/[email]` stays a full page: `guestEmailFromRouteParam`, `dynamic = "force-dynamic"`, `StaffShell`, `GuestProfilePanel` `showEmail={false}`, `Promise.all([getGuestProfile, getAuthUser])`. `app/admin/layout.tsx` renders `{modal}`. Intercept `app/admin/@modal/(.)customers/[email]/page.tsx` renders `GuestProfileDialog`; `app/admin/@modal/default.tsx` returns `null`                                                                   | `tests/unit/guest-profiles/staff-gate.test.ts` → "staff guest profile is gated at /admin/customers"; `tests/e2e/admin/guest-profile-overlay.spec.ts` → "guest profile opens as a modal over reservations and closes back to the same date"                                                                                                                                                                                                                                                             |
| GP-2      | `normalizeGuestEmail` (`trim` + `toLowerCase`, blank → `null`). `guestEmailFromRouteParam` runs one `decodeURIComponent` in try/catch, then `normalizeGuestEmail`. `guestProfileHref` percent-encodes the key. Live membership is `.eq("email_normalized", normalizeGuestEmail(email))` on generated `email_normalized TEXT GENERATED ALWAYS AS (lower(btrim(email))) STORED` + `reservations_email_normalized_idx` (`00000000000000_baseline.sql`)                    | `tests/unit/guest-profiles/build-profile.test.ts` → "normalizeGuestEmail matches trim+lowercase and drops blank emails"; `tests/unit/guest-profiles/route-param.test.ts` → "route email param is decoded once before lookup and display"; `tests/unit/guest-profiles/live-read.test.ts` → "getGuestProfile includes reservations that differ only by case or padding"                                                                                                                                  |
| GP-3      | `buildGuestProfile` filters `normalizeGuestEmail(row.email) === key` before mapping                                                                                                                                                                                                                                                                                                                                                                                    | `tests/unit/guest-profiles/build-profile.test.ts` → "buildGuestProfile excludes other emails"                                                                                                                                                                                                                                                                                                                                                                                                          |
| GP-4      | After newest-first sort, displayed PII is `history[0]` (`guest_name` / `phone` / `notes`); ficha `email` is the identity key. `GuestProfilePanel` interpolates `profile.email` / `profile.notes` as text (never `type="email"`) and `defaultValue={profile.guest_name ?? ""}` / `defaultValue={profile.phone ?? ""}`. Full page passes `showEmail={false}` and `StaffShell` `description={profile.email}`; the dialog shows `profile.email` (`showEmail` default true) | `tests/unit/guest-profiles/build-profile.test.ts` → "displayed PII comes from the newest reservation"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha displays guest_name email phone notes"; `tests/unit/guest-profiles/route-param.test.ts` → "route email param is decoded once before lookup and display"                                                                                                                                                                           |
| GP-5      | History rows keep `...row` plus `date`, `time`, `party_size`, `status`, `isVisit`. `GuestProfilePanel` renders a `<table>` (`row.date`, `row.time`, `row.party_size`, `row.table_label`, `ReservationStatusBadge status={row.status}`, `row.notes`) with key `` `${index}-${row.date}-${row.time}-${row.party_size}` `` and `row.isVisit` → `t("staff.customers.visit")`                                                                                               | `tests/unit/guest-profiles/build-profile.test.ts` → "each history row has date time party_size status"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha lists date time party_size status"; "staff ficha history is a table with visit marker and status badges"                                                                                                                                                                                                                         |
| GP-6      | `isVisit: row.status === "completed"` after the email filter (not analytics' `completed && completed_at`). `completedVisits` counts `row.isVisit`. The history status cell renders `ReservationStatusBadge` and, when `row.isVisit`, `t("staff.customers.visit")`                                                                                                                                                                                                      | `tests/unit/guest-profiles/build-profile.test.ts` → "completed reservations are visits and others are not"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha history is a table with visit marker and status badges"                                                                                                                                                                                                                                                                      |
| GP-7      | History `sort` is `date` then `time` `localeCompare` descending                                                                                                                                                                                                                                                                                                                                                                                                        | `tests/unit/guest-profiles/build-profile.test.ts` → "history is newest date then time first"                                                                                                                                                                                                                                                                                                                                                                                                           |
| GP-8      | `getGuestProfile` — `requireStaffUser` then fresh `createServiceClient().from("reservations").select("*").eq("email_normalized", normalizeGuestEmail(email))` into `buildGuestProfile`                                                                                                                                                                                                                                                                                 | `tests/unit/guest-profiles/live-read.test.ts` → "getGuestProfile is a live service-role select"                                                                                                                                                                                                                                                                                                                                                                                                        |
| GP-9      | `guestProfileHref`; `ReservationRow.email`; `ReservationsManager` maps `email` and renders `const fichaHref = guestProfileHref(r.email)` plus ternary `Link href={fichaHref}` / `: null`. No customer-list nav item                                                                                                                                                                                                                                                    | `tests/unit/guest-profiles/reservation-entry.test.ts` → "reservations list links a non-blank email to the ficha"; "reservations list renders a ficha link for non-blank email only"                                                                                                                                                                                                                                                                                                                    |
| GP-10     | `updateGuestProfilePii` — `requireStaffUser` then service-role `.update({ guest_name, phone }).eq("email_normalized", normalizeGuestEmail(input.email)).select("id")`; empty `data` → `{ error: "errors.guestProfiles.notFound" }`, else `{ ok: true }`. `GuestProfilePanel` `saveGuestPii` calls `updateGuestProfilePii({ email, guest_name, phone })` and toasts `t(result.error)` or `t("staff.customers.saved")` (`htmlFor`/`id`/`autoComplete` on the panel)      | `tests/unit/guest-profiles/update-pii.test.ts` → "updateGuestProfilePii writes name and phone on the email group and never email"; "updateGuestProfilePii returns ok when rows update and notFound when none match"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha save control writes name and phone and not email"; "staff ficha save shows success and error feedback"; `tests/e2e/admin/guest-profile-overlay.spec.ts` → "guest profile save persists name and phone after reload" |
| GP-11     | Reader and mutator construct `createServiceClient` only after staff; no `GRANT SELECT` on `reservations` for `anon` / `authenticated`                                                                                                                                                                                                                                                                                                                                  | `tests/unit/guest-profiles/res-priv.test.ts` → "guest profile reader and mutator use service client and do not grant anon SELECT"                                                                                                                                                                                                                                                                                                                                                                      |
| GP-12     | Same filter + return; empty match is `history: []` and `email: key`. `GuestProfilePanel` exclusive ternary (`!profile.history?.length` → `t("staff.customers.empty")` else history `<table>`)                                                                                                                                                                                                                                                                          | `tests/unit/guest-profiles/build-profile.test.ts` → "empty matching set is empty not other guests"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha empty key is empty not other guests"                                                                                                                                                                                                                                                                                                 |
| GP-13     | `app/admin/layout.tsx` renders `{modal}`. `app/admin/@modal/default.tsx` returns `null`. Intercept `app/admin/@modal/(.)customers/[email]/page.tsx` loads `getGuestProfile` into `GuestProfileDialog` (`Dialog` `onOpenChange` → `router.back()`). Direct `/admin/customers/[email]` stays `StaffShell` + `GuestProfilePanel`                                                                                                                                          | `tests/e2e/admin/guest-profile-overlay.spec.ts` → "guest profile opens as a modal over reservations and closes back to the same date"                                                                                                                                                                                                                                                                                                                                                                  |
| GP-14     | `buildGuestProfile` `summary`: `totalReservations: history.length`, `completedVisits` = `isVisit` count, `lastVisit` = newest completed `date` or `null`. Panel prints `profile.summary.totalReservations` / `completedVisits` / `lastVisit ?? t("staff.customers.lastVisitNone")`                                                                                                                                                                                     | `tests/unit/guest-profiles/build-profile.test.ts` → "summary counts total reservations completed visits and last visit"; `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha shows reservation-derived summary only"                                                                                                                                                                                                                                                                         |
| GP-15     | Panel header `t("staff.customers.staffOnly")`; notes `t("staff.customers.notesOperational")` and `t("staff.customers.notesHelper")`; footer `t("staff.customers.operationalLimit")`. Dialog shows decoded `profile.email`; full page shows it as `StaffShell` `description={profile.email}`                                                                                                                                                                            | `tests/unit/guest-profiles/staff-gate.test.ts` → "staff ficha shows operational-only labels and privacy notices"                                                                                                                                                                                                                                                                                                                                                                                       |

## References

- [staff-authorization.md](./staff-authorization.md) (SA-1 / SA-2 / SA-8)
- [booking-rules.md](./booking-rules.md) (AC-5 / RES-PRIV, STAFF-LIST, STAFF-GUEST-EMAIL)
- [site-localization.md](./site-localization.md) (AC-20 / AC-26, French on staff)
- [RES-104](https://linear.app/realized/issue/RES-104)
- [RES-116](https://linear.app/realized/issue/RES-116)

# TDD log — res-116_guest_profile_overlay_7c41d9e2

## C1

Suggested review order:
- Route identity key [security] · `lib/guest-profiles.ts` `guestEmailFromRouteParam` (one `decodeURIComponent`, then `normalizeGuestEmail`)
- Awaited params and decoded key · `app/admin/customers/[email]/page.tsx` lookup, StaffShell description, Save closure

Reusable pattern: invoke an async server page with encoded params to pin route decoding

## C2

Suggested review order:
- Staff gate [auth] · `app/actions/guest-profiles.ts` `requireStaffUser` before the write
- Mutator result [public-api] · name/phone update, `email_normalized` eq, `.select("id")`, `{ ok: true }` vs `errors.guestProfiles.notFound`
- Catalog strings · `messages/en.json` and `messages/fr.json` `errors.guestProfiles.notFound`

Reusable pattern: chain `.select("id")` on the service-role update and map an empty `data` array to the catalog notFound key.

## C3

Suggested review order:
- Save identity and feedback [security] · `components/staff/guest-profile-panel.tsx` (`email: profile.email`, `toast.error` / `toast.success`, `router.refresh`)
- Panel props · `app/admin/customers/[email]/page.tsx`
- Catalog · `messages/en.json` / `messages/fr.json` `staff.customers.saved`

Reusable pattern: none

## C4

Suggested review order:
- Summary counts [booking] · `lib/guest-profiles.ts` history length, `isVisit` count, newest completed date
- Metric render · `components/staff/guest-profile-panel.tsx` catalog keys and null last-visit fallback
- Page pass-through · `app/admin/customers/[email]/page.tsx` `profile.summary`
- Catalog keys · `messages/en.json` / `messages/fr.json` `totalReservations`, `completedVisits`, `lastVisit`, `lastVisitNone`

Reusable pattern: none

## C5

Suggested review order:
- Operational privacy copy · `messages/en.json` / `messages/fr.json` `staffOnly` through `operationalLimit`; panel call sites
- Read-only identity [security] · page `description={profile.email}`; panel email value and `{profile.notes}`
- Dead-leaf removal · short `staff.customers.email` / `notes` leaves removed

Reusable pattern: Before deleting a next-intl leaf, grep `t("namespace.key")` in ts/tsx; CodeGraph does not index JSON string literals.

## C6

Suggested review order:
- History chrome · `components/staff/guest-profile-panel.tsx` table, `ReservationStatusBadge status={row.status}`, visit marker, empty state, index-prefixed row key
- Page passes history · `app/admin/customers/[email]/page.tsx` (no `{row.status}` in the page file)
- Column keys · `messages/en.json` / `messages/fr.json` `date`, `time`, `partySize`, `table`, `status`, `historyNotes`, `visit`

Reusable pattern: keep `status={row.status}` in a component the ficha scanner follows, and keep that text out of the page file the raw-enum scan reads.

## C7

Suggested review order:
- Intercepted route [auth] · `app/admin/@modal/(.)customers/[email]/page.tsx` decode then `getGuestProfile`
- Dialog close · `components/staff/guest-profile-dialog.tsx` `router.back` and `DialogTitle`
- Modal slot · `app/admin/layout.tsx`
- Hard-navigation fallback · `app/admin/@modal/default.tsx` returns null
- Direct load stays the full page · `app/admin/customers/[email]/page.tsx`

Reusable pattern: `@modal` plus a `(.)` intercept, `default.tsx` returns null, dialog closes with `router.back()`; run this e2e with `CI=true` so the Playwright webServer inherits the local Supabase env.

## C8

Pre-green regression pin: `guest profile save persists name and phone after reload` passed on first execution (2 passed, 0 skipped). Green skipped.

Suggested review order:
- Save persistence already covered by C2/C3 · overlay Save uses `profile.email` and `{ ok: true }`

Reusable pattern: none

## Suggested Review Order (collated)

Highest-risk first.

- **Identity decode** [security]
  - `lib/guest-profiles.ts` — `guestEmailFromRouteParam`: one `decodeURIComponent`, then `normalizeGuestEmail`
  - `app/admin/customers/[email]/page.tsx` — decoded key for lookup, description, and Save
  - `app/admin/@modal/(.)customers/[email]/page.tsx` — same decode before `getGuestProfile`
- **Mutator result** [auth] [public-api]
  - `app/actions/guest-profiles.ts` — `requireStaffUser`, name/phone payload, `.select("id")`, `{ ok: true }` vs `errors.guestProfiles.notFound`
  - `components/staff/guest-profile-panel.tsx` — Save uses `profile.email`, then `toast.error` / `toast.success`
- **Overlay** [auth]
  - `app/admin/layout.tsx` — modal slot
  - `app/admin/@modal/default.tsx` — null fallback
  - `components/staff/guest-profile-dialog.tsx` — `router.back` and `DialogTitle`
- **Ficha chrome**
  - `components/staff/guest-profile-panel.tsx` — summary metrics, operational labels, history table, `ReservationStatusBadge`
  - `messages/en.json` / `messages/fr.json` — `staff.customers.*` and `errors.guestProfiles.notFound`
- **Tests**
  - `tests/unit/guest-profiles/route-param.test.ts` — C1
  - `tests/unit/guest-profiles/update-pii.test.ts` — C2
  - `tests/unit/guest-profiles/staff-gate.test.ts` — C3–C6
  - `tests/unit/guest-profiles/build-profile.test.ts` — C4
  - `tests/e2e/admin/guest-profile-overlay.spec.ts` — C7–C8

## Traceability (final)

Run: 2026-09-24 · plan: res-116_guest_profile_overlay_7c41d9e2 · issue: RES-116

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profiles.md GP-2 | tests/unit/guest-profiles/route-param.test.ts::route email param is decoded once before lookup and display | lib/guest-profiles.ts, app/admin/customers/[email]/page.tsx | P0 | shipped |
| C2 | guest-profiles.md GP-10 | tests/unit/guest-profiles/update-pii.test.ts::updateGuestProfilePii returns ok when rows update and notFound when none match | app/actions/guest-profiles.ts, messages/en.json, messages/fr.json | P0 | shipped |
| C3 | guest-profiles.md GP-10 | tests/unit/guest-profiles/staff-gate.test.ts::staff ficha save shows success and error feedback | components/staff/guest-profile-panel.tsx | P1 | shipped |
| C4 | guest-profiles.md GP-14 | tests/unit/guest-profiles/build-profile.test.ts::summary counts total reservations completed visits and last visit; tests/unit/guest-profiles/staff-gate.test.ts::staff ficha shows reservation-derived summary only | lib/guest-profiles.ts, components/staff/guest-profile-panel.tsx | P1 | shipped |
| C5 | guest-profiles.md GP-4, GP-15 | tests/unit/guest-profiles/staff-gate.test.ts::staff ficha shows operational-only labels and privacy notices | components/staff/guest-profile-panel.tsx, messages/en.json, messages/fr.json | P1 | shipped |
| C6 | guest-profiles.md GP-5, GP-6 | tests/unit/guest-profiles/staff-gate.test.ts::staff ficha history is a table with visit marker and status badges | components/staff/guest-profile-panel.tsx | P1 | shipped |
| C7 | guest-profiles.md GP-13 | tests/e2e/admin/guest-profile-overlay.spec.ts::guest profile opens as a modal over reservations and closes back to the same date | app/admin/layout.tsx, app/admin/@modal/default.tsx, app/admin/@modal/(.)customers/[email]/page.tsx, components/staff/guest-profile-dialog.tsx | P1 | shipped |
| C8 | guest-profiles.md GP-10 | tests/e2e/admin/guest-profile-overlay.spec.ts::guest profile save persists name and phone after reload | components/staff/guest-profile-panel.tsx, app/actions/guest-profiles.ts | P0 | shipped |
| staging-validation | guest-profiles.md GP-2, GP-10, GP-13 | — | — | P1 | manual-uat |
| visual-design-match | guest-profiles.md GP-13 | — | — | P3 | manual-uat |

## Run metrics

Run: 2026-09-24 → 2026-09-24 · plan: res-116_guest_profile_overlay_7c41d9e2
Criteria: 8 shipped · 2 manual-uat · 10 total
Phases delegated: 26
Back-loops: C4: 1 extra Red (typecheck casts); C6: 1 extra Green (move history table into the panel) and 1 blocked Refactor before that Green
BLOCKED events: 1 — C6 refactor: i18n status-labels scan rejected `{row.status}` on the page; resolved by moving the table into the panel
Issues: 1 filed (RES-120) · 0 attached-to-existing · 17 left on ledger (below floor or already on the bus) — cap 3/run


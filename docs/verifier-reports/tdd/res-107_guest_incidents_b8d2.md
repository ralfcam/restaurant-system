# TDD close-out log — res-107_guest_incidents_b8d2

### GI-1

Suggested review order: incidents list contract — `components/staff/guest-profile-panel.tsx:158` [public-api]; `components/staff/guest-profile-panel.tsx:44`; `components/staff/guest-profile-panel.tsx:160`
Reusable pattern: none

### GI-3

Suggested review order:
- Late-cancel rule — `lib/guest-profiles.ts:5`, then `lib/guest-profiles.ts:24`
- Cancel stamp [booking] — `app/actions/reservations.ts:557`
- Cancellation clock [schema] — `supabase/migrations/00000000000000_baseline.sql:112`, then `supabase/migrations/00000000000000_baseline.sql:129`
- Guest INSERT boundary [security] — `supabase/migrations/00000000000000_baseline.sql:165`, then `supabase/migrations/00000000000000_baseline.sql:181`
Reusable pattern: When a server-owned reservation clock is added beside `completed_at`, put it on both `CREATE TABLE` and `ADD COLUMN IF NOT EXISTS`, keep it off the guest `GRANT INSERT` list, and name it in the privilege comment next to `completed_at`.

### GI-4

Suggested review order:
- Delay rule — `lib/guest-profiles.ts:4`, then `lib/guest-profiles.ts:28`
- Seat stamp [booking] — `app/actions/reservations.ts:559`
- Walk-in insert stamp — `app/actions/reservations.ts:346`
- Seat clock [schema] — `supabase/migrations/00000000000000_baseline.sql:114`, then `supabase/migrations/00000000000000_baseline.sql:134`
- Guest INSERT boundary [security] — `supabase/migrations/00000000000000_baseline.sql:170`, then `supabase/migrations/00000000000000_baseline.sql:186`
Reusable pattern: none

### GI-2

Suggested review order:
- No-show classification [booking] — `lib/guest-profiles.ts:17`
- Positive pin (`no_show` → one incident) — `tests/unit/guest-profiles/incidents.test.ts:374`
- Negative pin (`confirmed` → none) — `tests/unit/guest-profiles/incidents.test.ts:379`
Reusable pattern: none

### GI-6

Suggested review order:
- One type per reservation (status partition): `lib/guest-profiles.ts:17` [booking]
- Late cancel cannot also be a delay: `lib/guest-profiles.ts:20`
- Delay only for seated or completed: `lib/guest-profiles.ts:30`
- Pin: `tests/unit/guest-profiles/incidents.test.ts:402`
Reusable pattern: none
Green: no-op. The pin was already green because status predicates do not overlap.

### GI-5

Suggested review order:
- Staff gate before the service read [auth]: `app/actions/guest-profiles.ts:19`, then `app/actions/guest-profiles.ts:22`
- Normalized-email fan-out [security]: `app/actions/guest-profiles.ts:26`
- Incident attach from the same rows: `app/actions/guest-profiles.ts:32`, then `app/actions/guest-profiles.ts:35`
- Full-page ficha [public-api]: `app/admin/customers/[email]/page.tsx:42`
- Modal ficha: `app/admin/@modal/(.)customers/[email]/page.tsx:25`
Reusable pattern: When a ficha field is added, pass it from both `app/admin/customers/[email]/page.tsx` and `app/admin/@modal/(.)customers/[email]/page.tsx`; a source scan of only the full page does not pin the overlay.

## Suggested Review Order (collated)

- [auth] Staff gate before the service read — `app/actions/guest-profiles.ts:19`
- [security] Normalized-email fan-out — `app/actions/guest-profiles.ts:26`
- [security] Guest INSERT omits the new clocks — `supabase/migrations/00000000000000_baseline.sql:186`
- [schema] `cancelled_at` and `seated_at` — `supabase/migrations/00000000000000_baseline.sql:112`
- [booking] Cancel and seat stamps — `app/actions/reservations.ts:557`
- [booking] Walk-in `seated_at` — `app/actions/reservations.ts:346`
- [booking] Incident classifier — `lib/guest-profiles.ts:6`
- [public-api] Ficha list — `components/staff/guest-profile-panel.tsx:158`
- [public-api] Full-page and modal pass-through — `app/admin/customers/[email]/page.tsx:42`, `app/admin/@modal/(.)customers/[email]/page.tsx:25`

## Traceability (final)

Run: 2026-10-05 · plan: res-107_guest_incidents_b8d2 · issue: RES-107

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| GI-1 | guest-incident-history.md GI-1 | incidents.test.ts::staff ficha lists incidents and anonymous /admin follows the login redirect | components/staff/guest-profile-panel.tsx | P0 | shipped |
| GI-3 | guest-incident-history.md GI-3 | incidents.test.ts::cancel stamps cancelled_at and only a late cancel is a late_cancel incident | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql, lib/guest-profiles.ts | P0 | shipped |
| GI-4 | guest-incident-history.md GI-4 | incidents.test.ts::seat and walk-in stamp seated_at and only a late seat is a delay | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql, lib/guest-profiles.ts | P0 | shipped |
| GI-2 | guest-incident-history.md GI-2 | incidents.test.ts::no_show is an incident and confirmed is not | lib/guest-profiles.ts | P1 | shipped |
| GI-6 | guest-incident-history.md GI-6 | incidents.test.ts::each reservation contributes only one incident type | lib/guest-profiles.ts | P0 | shipped |
| GI-5 | guest-incident-history.md GI-5 | incidents.test.ts::reload returns the same incidents and another email is absent | app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, app/admin/@modal/(.)customers/[email]/page.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: res-107_guest_incidents_b8d2
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 17
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 4 left on ledger (below floor) — cap 3/run

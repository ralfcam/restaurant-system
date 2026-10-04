# TDD log res-118_standalone_widget_2491

### SW-3

Suggested review order:
- Authz before the service-role write
  - `app/actions/widget-page.ts:18` [auth]
  - `app/actions/widget-page.ts:21` [security]
- Nullable editorial columns on the singleton
  - `supabase/migrations/00000000000000_baseline.sql:1023` [schema]
- Blank text stores null; the view omits that block
  - `app/actions/widget-page.ts:5`
  - `app/actions/widget-page.ts:30`
  - `components/site/standalone-reserve-page.tsx:17`
  - `components/site/standalone-reserve-page.tsx:26`
- Settings marker only
  - `app/admin/settings/page.tsx:56`
Reusable pattern: Editorial copy trims to null on the super-admin `restaurant_settings` upsert (`id: 1` plus `updated_at`) and the reserve page omits a block when that value is null or whitespace.

### SW-6

Suggested review order:
- Phone gate (hide unless the flag is on and the number is non-blank)
  - `components/site/standalone-reserve-page.tsx:42` [security]
  - `components/site/standalone-reserve-page.tsx:29`
  - `components/site/standalone-reserve-page.tsx:59` [public-api]
- Hours and address stay rendered when the phone is hidden
  - `components/site/standalone-reserve-page.tsx:43`
  - `components/site/standalone-reserve-page.tsx:60`
  - `components/site/standalone-reserve-page.tsx:61`
- Editorial blocks still omit blank copy (SW-3, same helper)
  - `components/site/standalone-reserve-page.tsx:21`
  - `components/site/standalone-reserve-page.tsx:50`
Reusable pattern: Optional contact line renders only when the boolean flag is true and trim-to-null copy is non-null; default the flag to false so a missing prop cannot leak the value.

### SW-4

Suggested review order:
- Name is the saved display name, or no name node — `components/site/standalone-reserve-page.tsx:50` [public-api]
- Trim and omit blank — `components/site/standalone-reserve-page.tsx:29`
- Display-name block id — `components/site/standalone-reserve-page.tsx:22`
- Trimmed name assertion — `tests/unit/site/standalone-reservation-widget.test.ts:390`
- Null, empty, and whitespace omit the node and `Restaurant Link` — `tests/unit/site/standalone-reservation-widget.test.ts:394`
Reusable pattern: none
Green: skipped — characterization pin was already green.

### SW-1

Suggested review order:
- Public unauthenticated route
  - `app/[locale]/reserve/page.tsx:4` [public-api]
  - `app/[locale]/reserve/page.tsx:9`
- Centered single column from `md`
  - `app/[locale]/reserve/page.tsx:13`
- Widget embed with a blank phone prop
  - `app/[locale]/reserve/page.tsx:17` [security]
Reusable pattern: `ReservationWidget`'s `phone` default is `RESTAURANT.phone` only when the prop is omitted; pass `phone=""` on the public page so `undefined` does not fall back to that number.

### SW-5

Suggested review order:
- Hero src contract [public-api]
  - `components/site/standalone-reserve-page.tsx:45`
  - `components/site/standalone-reserve-page.tsx:53`
  - `components/site/standalone-reserve-page.tsx:56`
- Hours taken from the passed windows
  - `components/site/standalone-reserve-page.tsx:46`
  - `components/site/standalone-reserve-page.tsx:68`
- Address omitted only when null
  - `components/site/standalone-reserve-page.tsx:69`
Reusable pattern: When a unit test asserts the stored image URL as `src`, keep a plain `<img>` and `@next/next/no-img-element` disable — `images.unoptimized` does not rewrite absolute URLs, but `next/image` still requires `fill` or width/height and changes the markup.

### SW-2

Suggested review order:
- Booking flow stays on the existing widget
  - `app/[locale]/reserve/page.tsx:50` [public-api]
  - `app/[locale]/reserve/page.tsx:33`
  - `app/[locale]/reserve/page.tsx:27`
- Accordions and slot cards stay in the widget source
  - `components/site/reservation-widget.tsx:673` [booking]
  - `components/site/reservation-widget.tsx:769`
  - `components/site/reservation-widget.tsx:851`
  - `components/site/reservation-widget.tsx:187`
  - `components/site/reservation-widget.tsx:231`
- Guest page load of settings and hours
  - `app/[locale]/reserve/page.tsx:14` [security]
  - `app/[locale]/reserve/page.tsx:23`
Reusable pattern: none

### SW-3 editor

Suggested review order:
- Authz before the upsert, including the phone flag
  - `app/actions/widget-page.ts:19` [auth]
  - `app/actions/widget-page.ts:22` [public-api]
  - `app/actions/widget-page.ts:31`
- Editor submits the six fields
  - `components/staff/widget-page-editor.tsx:6`
  - `components/staff/widget-page-editor.tsx:32`
- Mounted on settings
  - `app/admin/settings/page.tsx:57`
Reusable pattern: none

## Suggested Review Order (collated)

- Authz before the service-role editorial write — `app/actions/widget-page.ts:19` [auth], `app/actions/widget-page.ts:22` [public-api], `app/actions/widget-page.ts:31`
- Settings editor submits the six fields — `components/staff/widget-page-editor.tsx:32`, `app/admin/settings/page.tsx:57`
- Guest page loads settings with the service-role client — `app/[locale]/reserve/page.tsx:14` [security], `app/[locale]/reserve/page.tsx:23`
- Phone stays hidden unless the flag is on and the number is non-blank — `components/site/standalone-reserve-page.tsx:42` [security], `app/[locale]/reserve/page.tsx:27`
- Widget embed passes a blank phone when the flag is off — `app/[locale]/reserve/page.tsx:50` [public-api]
- Nullable editorial columns — `supabase/migrations/00000000000000_baseline.sql:1023` [schema]
- Public unauthenticated route and centered column — `app/[locale]/reserve/page.tsx:4` [public-api], `app/[locale]/reserve/page.tsx:33`
- Hero src is the stored URL — `components/site/standalone-reserve-page.tsx:45` [public-api]
- Name is the saved display name or no name node — `components/site/standalone-reserve-page.tsx:50` [public-api]
- Existing widget accordions and slot cards — `components/site/reservation-widget.tsx:673` [booking]

## Traceability (final)

Run: 2026-10-04 · plan: res-118_standalone_widget_2491 · issue: RES-118

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| SW-3 | standalone-reservation-widget.md SW-3 | tests/unit/site/standalone-reservation-widget.test.ts::SW-3 super-admin saves editorial fields; tests/unit/site/standalone-reservation-widget.test.ts::SW-3 settings editor submits editorial fields and the phone flag | app/actions/widget-page.ts, app/admin/settings/page.tsx, components/staff/widget-page-editor.tsx, components/site/standalone-reserve-page.tsx, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| SW-6 | standalone-reservation-widget.md SW-6 | tests/unit/site/standalone-reservation-widget.test.ts::SW-6 phone hidden unless flag and number | components/site/standalone-reserve-page.tsx | P0 | shipped |
| SW-4 | standalone-reservation-widget.md SW-4 | tests/unit/site/standalone-reservation-widget.test.ts::SW-4 name is display name or nothing | components/site/standalone-reserve-page.tsx | P1 | shipped |
| SW-1 | standalone-reservation-widget.md SW-1 | tests/unit/site/standalone-reservation-widget.test.ts::SW-1 public reserve page centers the widget | app/[locale]/reserve/page.tsx | P1 | shipped |
| SW-5 | standalone-reservation-widget.md SW-5 | tests/unit/site/standalone-reservation-widget.test.ts::SW-5 hero hours and address | components/site/standalone-reserve-page.tsx | P1 | shipped |
| SW-2 | standalone-reservation-widget.md SW-2 | tests/unit/site/standalone-reservation-widget.test.ts::SW-2 existing widget accordions stay | app/[locale]/reserve/page.tsx, components/site/reservation-widget.tsx | P2 | shipped |

## Run metrics

Run: 2026-10-04 → 2026-10-04 · plan: res-118_standalone_widget_2491
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 21
Back-loops: SW-4: 1 extra Red (behavior already green from SW-3; characterization pin kept); SW-3: 1 extra Red/Green/Refactor (settings editor submits the five fields and show_reservation_phone)
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 19 left on ledger (below floor or attach-only; 3 prior lines archived as resolved) — cap 3/run

# res-86_guest_segmentation_88f7

### GS-1

Suggested review order:
- authz guard — `app/actions/guest-profiles.ts:157` [auth]
- authz guard — `app/admin/customers/page.tsx:27` [auth]
- service-role read — `app/actions/guest-profiles.ts:160` [security]
- filter form shell — `app/admin/customers/page.tsx:7`
- filter form shell — `app/admin/customers/page.tsx:20`
- filter form shell — `app/admin/customers/page.tsx:35`

Reusable pattern: none

### GS-5

Suggested review order:
- authz before the service-role read — `app/actions/guest-profiles.ts:157` [auth]
- read-only column list — `app/actions/guest-profiles.ts:162` [security]
- blank page before the filter form on `result.error` — `app/admin/customers/page.tsx:27` [auth]
- GET filter form, no profile-write actions — `app/admin/customers/page.tsx:35`

Reusable pattern: none

### GS-2

Suggested review order:
- Newest row per normalized email — `lib/guest-profiles.ts:183` blank emails skipped via `normalizeGuestEmail`
- Newest row per normalized email — `lib/guest-profiles.ts:186` [public-api] date then time, missing values as `""`, tie keeps the stored row
- Newest row per normalized email — `lib/guest-profiles.ts:192` winner stored under the normalized email
- Sorted list and ficha link — `lib/guest-profiles.ts:195` [public-api] emails ascending, `href` from `guestProfileHref`
- Filters not applied — `lib/guest-profiles.ts:179` `void filters`

Reusable pattern: single-pass newest reservation — `localeCompare` date then time after `?? ""`, and keep the stored row when the candidate is older or equal (`<=` on time).

### GS-3

Suggested review order:
- AND filters — `lib/guest-profiles.ts:240` five optional predicates, unset fields do not filter
- Name match — `lib/guest-profiles.ts:244` [public-api] trimmed lowercased substring; null displayed name fails
- Phone match — `lib/guest-profiles.ts:251` [public-api] trimmed stored substring, not `normalizeGuestPhone`; null phone fails
- Visit count and no-show — `lib/guest-profiles.ts:225` `completed` count and `no_show` flag
- Visit count and no-show — `lib/guest-profiles.ts:255` `minCompleted` and `hasNoShow === true`
- Last completed date — `lib/guest-profiles.ts:261` [public-api] no completed row fails; `date ?? ""` compared with `>`

Reusable pattern: optional AND filters — trim name/phone to `""` means unset, `hasNoShow` only when `=== true`, and last completed `date ?? ""` uses `>` so a missing date is not after the cutoff.

### GS-6

Suggested review order:
- Empty filters still mean every guest — `lib/guest-profiles.ts:173` `GuestSegmentFilters`
- Empty filters still mean every guest — `lib/guest-profiles.ts:181` `parseGuestSegmentFilters`
- Empty filters still mean every guest — `lib/guest-profiles.ts:232` unset name/phone/date become empty sentinels
- Empty filters still mean every guest — `lib/guest-profiles.ts:286` each check no-ops when unset
- Empty filters still mean every guest — `app/actions/guest-profiles.ts:171` `{}` is passed through to `segmentGuests`
- Staff read stays gated — `app/actions/guest-profiles.ts:160` [auth] `requireStaffUser`
- Staff read stays gated — `app/actions/guest-profiles.ts:165` [security] service-role select
- Staff read stays gated — `app/admin/customers/page.tsx:29` `result.error` before the form
- Page wiring — `app/admin/customers/page.tsx:21` awaited `searchParams` into `parseGuestSegmentFilters`
- Page wiring — `app/admin/customers/page.tsx:37` `guest-segment-filters` GET form

Reusable pattern: none

### GS-4

Suggested review order:
- Empty match resolves to a list — `app/actions/guest-profiles.ts:171` [public-api]
- Empty match resolves to a list — `lib/guest-profiles.ts:284`
- Empty match resolves to a list — `app/admin/customers/page.tsx:29`
- Empty match resolves to a list — `app/admin/customers/page.tsx:68`
- Name filter changes which rows remain — `lib/guest-profiles.ts:232`
- Name filter changes which rows remain — `lib/guest-profiles.ts:288`
- Staff gate still wraps the read — `app/actions/guest-profiles.ts:160` [auth]
- Staff gate still wraps the read — `app/actions/guest-profiles.ts:165` [security]

Reusable pattern: none

## Suggested Review Order (collated)

- [auth] Staff gate before the service-role read — `app/actions/guest-profiles.ts:160`
- [security] Read-only select of guest columns — `app/actions/guest-profiles.ts:165`
- [auth] Page returns null before the filter form when the action errors — `app/admin/customers/page.tsx:29`
- [public-api] AND filters on name, phone, completed count, no-show, and last completed date — `lib/guest-profiles.ts:232`, `lib/guest-profiles.ts:288`
- [public-api] One row per normalized email, newest name and phone, ficha href — `lib/guest-profiles.ts:252`
- [public-api] GET form and guest links — `app/admin/customers/page.tsx:21`, `app/admin/customers/page.tsx:37`

## Traceability (final)

Run: 2026-10-06 · plan: res-86_guest_segmentation_88f7 · issue: RES-86

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| GS-1 | guest-segmentation.md GS-1 | segmentation.test.ts::listing guests requires staff and the filter form is guest-segment-filters | app/actions/guest-profiles.ts, app/admin/customers/page.tsx | P0 | shipped |
| GS-5 | guest-segmentation.md GS-5 | segmentation.test.ts::loading filtering and clearing the guest list writes no reservation column | app/actions/guest-profiles.ts, app/admin/customers/page.tsx | P0 | shipped |
| GS-2 | guest-segmentation.md GS-2 | segmentation.test.ts::one normalized email uses the newest name and phone and links to the ficha | lib/guest-profiles.ts | P1 | shipped |
| GS-3 | guest-segmentation.md GS-3 | segmentation.test.ts::combined filters keep only guests that match every set filter | lib/guest-profiles.ts | P1 | shipped |
| GS-6 | guest-segmentation.md GS-6 | segmentation.test.ts::clearing every filter returns every guest row | lib/guest-profiles.ts, app/actions/guest-profiles.ts, app/admin/customers/page.tsx | P1 | shipped |
| GS-4 | guest-segmentation.md GS-4 | segmentation.test.ts::changing a filter changes the rows and an empty match does not error | lib/guest-profiles.ts, app/actions/guest-profiles.ts | P2 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-86_guest_segmentation_88f7
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 17
Back-loops: GS-1: 1 extra Red (isStaffUser cast typecheck)
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 14 left on ledger (below floor/cap) — cap 3/run

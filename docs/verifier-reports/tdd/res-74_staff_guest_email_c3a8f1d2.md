# TDD log — res-74_staff_guest_email_c3a8f1d2

### C1

Suggested review order:
- visible guest-email chrome — `components/staff/reservations-manager.tsx:360` [public-api] [booking]
- name + phone stay in the same block — `components/staff/reservations-manager.tsx:356`
- name + phone stay in the same block — `components/staff/reservations-manager.tsx:357`
- GP-9 ficha link unchanged — `components/staff/reservations-manager.tsx:346` [public-api]
- GP-9 ficha link unchanged — `components/staff/reservations-manager.tsx:361`
- stored email mapping — `components/staff/reservations-manager.tsx:45`
- stored email mapping — `components/staff/reservations-manager.tsx:60`

Reusable pattern: Source-scan staff chrome by stripping `guestProfileHref(r.email)` and `attr={r.email}` before asserting a visible `{r.email}` interpolation so a GP-9 link cannot false-pass STAFF-GUEST-EMAIL.

### C2

Suggested review order:
- blank-safe address gate — `components/staff/reservations-manager.tsx:360` [booking] [public-api]
- stored `{r.email}` interpolation in the open branch — `components/staff/reservations-manager.tsx:361` [public-api]
- name stays in the same block — `components/staff/reservations-manager.tsx:356`
- phone stays in the same block — `components/staff/reservations-manager.tsx:357`
- GP-9 ficha assignment unchanged — `components/staff/reservations-manager.tsx:346` [public-api]
- GP-9 ficha link unchanged — `components/staff/reservations-manager.tsx:363`

Reusable pattern: Staff absent-email chrome: ternary `r.email?.trim() ? <p>{r.email}</p> : null` — trim only gates the node; interpolate the stored string so C1 source-scan and C2 blank-omit both hold.

## Suggested Review Order (collated)

Highest-risk first.

- [public-api] Visible guest-email chrome — `components/staff/reservations-manager.tsx:360` `r.email?.trim()` gate; `:361` `{r.email}`
- [booking] Blank-safe omit — `components/staff/reservations-manager.tsx:360` address line omitted unless trimmed email is non-empty
- [public-api] Name and phone stay in the same block — `components/staff/reservations-manager.tsx:356` `{r.guestName}`; `:357-358` phone
- [public-api] GP-9 ficha link unchanged — `components/staff/reservations-manager.tsx:346` `guestProfileHref(r.email)`; `:363` Link
- Stored email mapping — `components/staff/reservations-manager.tsx:45` `email: string | null`; `:60` `email: r.email ?? null`

## Traceability (final)

Run: 2026-09-16 · plan: res-74_staff_guest_email_c3a8f1d2 · issue: RES-74

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | booking-rules.md STAFF-GUEST-EMAIL | staff-list-guest-email.test.ts::staff list displays stored guest email with name and phone | components/staff/reservations-manager.tsx | P1 | shipped |
| C2 | booking-rules.md STAFF-GUEST-EMAIL-ABSENT | staff-list-guest-email.test.ts::staff list still shows name and phone when email is absent | components/staff/reservations-manager.tsx | P1 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: res-74_staff_guest_email_c3a8f1d2
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 7 left on ledger (below floor) — cap 3/run


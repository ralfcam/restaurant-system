# TDD close-out log — res-84_guest_profile_merge_a475

### GM-1

Suggested review order:
- authz guard — `app/actions/guest-profiles.ts:79` [auth], `app/actions/guest-profiles.ts:95` [auth]
- staff-only read, empty list, no rewrite — `app/actions/guest-profiles.ts:82` [security], `app/actions/guest-profiles.ts:98`
- page loads candidates — `app/admin/customers/[email]/page.tsx:19`, `app/admin/customers/[email]/page.tsx:42` [public-api]
- ficha marker — `components/staff/guest-profile-panel.tsx:159`
Reusable pattern: When a page starts calling a new server-action export and an existing test `vi.mock`s that module with a partial factory, use one namespace import plus `"exportName" in namespace` before calling it, so the old mock still renders.

### GM-4

Suggested review order:
- authz guard — `app/actions/guest-profiles.ts:93` [auth]
- unauthorized return, no write — `app/actions/guest-profiles.ts:94`
- surviving-email rewrite — `app/actions/guest-profiles.ts:96` [security], `app/actions/guest-profiles.ts:98` [booking], `app/actions/guest-profiles.ts:99`, `app/actions/guest-profiles.ts:100`
Reusable pattern: none

### GM-5

Green: no-op. The pin was already green because the update filter is only the other normalized email.
Suggested review order:
- write predicate [booking] — `app/actions/guest-profiles.ts:98`, `app/actions/guest-profiles.ts:99`
- staff gate [auth] — `app/actions/guest-profiles.ts:93`
- pinned assertion — `tests/unit/guest-profiles/merge.test.ts:335`
Reusable pattern: none

### GM-2

Suggested review order:
- phone normalize — `lib/guest-profiles.ts:48`
- blank subject — `lib/guest-profiles.ts:63`
- subject phones and other emails — `lib/guest-profiles.ts:66`, `lib/guest-profiles.ts:78`
- read-only list [auth] — `app/actions/guest-profiles.ts:79`, `app/actions/guest-profiles.ts:82`, `app/actions/guest-profiles.ts:85`
Reusable pattern: none

### GM-6

Suggested review order:
- staff gate and blank/identical refusal [auth] — `app/actions/guest-profiles.ts:95`
- candidate check before write [security] — `app/actions/guest-profiles.ts:104`
- rewrite [booking] — `app/actions/guest-profiles.ts:110`
Reusable pattern: One `createServiceClient()` for a confirm read-then-update; each `.from()` is a new builder.

### GM-3

Suggested review order:
- named action import and PII save [security] — `components/staff/guest-profile-panel.tsx:6`, `components/staff/guest-profile-panel.tsx:58`
- merge submit waits, then refresh [security] — `components/staff/guest-profile-panel.tsx:163`, `components/staff/guest-profile-panel.tsx:168`, `components/staff/guest-profile-panel.tsx:181`
Reusable pattern: Slice a source region from one `data-testid` to the next, allow a named import of the action outside it, and require `confirmGuestMerge(` plus both argument orders only inside the region.

## Suggested Review Order (collated)

- [auth] Staff gate before the service client — `app/actions/guest-profiles.ts:79`, `app/actions/guest-profiles.ts:95`
- [security] Candidate check before the rewrite — `app/actions/guest-profiles.ts:104`, `app/actions/guest-profiles.ts:112`
- [booking] Surviving email is the normalized address — `app/actions/guest-profiles.ts:112`
- [public-api] Full page passes `mergeCandidates` — `app/admin/customers/[email]/page.tsx:19`
- [public-api] Ficha control offers both survivors — `components/staff/guest-profile-panel.tsx:163`

## Traceability (final)

Run: 2026-10-06 · plan: res-84_guest_profile_merge_a475 · issue: RES-84

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| GM-1 | guest-profile-merge.md GM-1 | merge.test.ts::listing and confirming a merge require staff and the ficha control is guest-merge | app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, components/staff/guest-profile-panel.tsx | P0 | shipped |
| GM-4 | guest-profile-merge.md GM-4 | merge.test.ts::confirm rewrites the other email onto the surviving email and does not copy rows | app/actions/guest-profiles.ts | P0 | shipped |
| GM-5 | guest-profile-merge.md GM-5 | merge.test.ts::confirm leaves a third email and a blank email unchanged | app/actions/guest-profiles.ts | P0 | shipped |
| GM-2 | guest-profile-merge.md GM-2 | merge.test.ts::candidates share one normalized phone and the list does not write | lib/guest-profiles.ts, app/actions/guest-profiles.ts | P1 | shipped |
| GM-6 | guest-profile-merge.md GM-6 | merge.test.ts::confirm writes nothing for a non-candidate, the same email, or a blank email | app/actions/guest-profiles.ts, lib/guest-profiles.ts | P0 | shipped |
| GM-3 | guest-profile-merge.md GM-3 | merge.test.ts::opening the ficha and listing candidates writes no email change | app/actions/guest-profiles.ts, components/staff/guest-profile-panel.tsx, app/admin/customers/[email]/page.tsx | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: res-84_guest_profile_merge_a475
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 19
Back-loops: GM-4: 1 extra Red (test types), GM-3: 1 extra Red (named import allowed outside the merge region)
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 13 left on ledger (below floor/cap) — cap 3/run


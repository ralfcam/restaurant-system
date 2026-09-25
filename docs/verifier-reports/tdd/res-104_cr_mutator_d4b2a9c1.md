# TDD log — res-104_cr_mutator_d4b2a9c1

### C1

Suggested review order:
- [booking] mutator membership (GP-10 write of GP-2 group) · `app/actions/guest-profiles.ts:33-35`
- [auth] staff gate before service-role update · `app/actions/guest-profiles.ts:28-31`
- [security] update payload is `guest_name`/`phone` only (no `email`) · `app/actions/guest-profiles.ts:33`
- reader membership unchanged (GP-2) · `app/actions/guest-profiles.ts:16-17`
- C1 pin · `tests/unit/guest-profiles/update-pii.test.ts:79-82`

Reusable pattern: Pin `.eq("email_normalized", normalizeGuestEmail(...))` as column+helper together, and label the write-site comment GP-10 so it cannot be mistaken for a leftover exact-email pin.

## Suggested Review Order (collated)

Highest-risk first.

- [booking] Mutator membership (GP-10 write of GP-2 group) — `app/actions/guest-profiles.ts:35` `.eq("email_normalized", normalizeGuestEmail(input.email))`
- [auth] Staff gate before service-role update — `app/actions/guest-profiles.ts:28-31`
- [security] Update payload is `guest_name`/`phone` only (no `email`) — `app/actions/guest-profiles.ts:33`
- [booking] Reader membership unchanged (GP-2) — `app/actions/guest-profiles.ts:17` `.eq("email_normalized", normalizeGuestEmail(email))`
- C1 pin — `tests/unit/guest-profiles/update-pii.test.ts:79-82`

## Traceability (final)

Run: 2026-09-16 · plan: res-104_cr_mutator_d4b2a9c1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profiles.md GP-10 | update-pii.test.ts::updateGuestProfilePii writes name and phone on the email group and never email | app/actions/guest-profiles.ts | P0 | shipped |

## Run metrics

Run: 2026-09-16 → 2026-09-16 · plan: res-104_cr_mutator_d4b2a9c1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor/Cloud no-create) — cap 3/run


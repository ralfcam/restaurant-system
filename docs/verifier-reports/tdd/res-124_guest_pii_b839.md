# TDD verifier — res-124_guest_pii_b839

## C1 — blank or oversized guest name

Suggested review order:
- Staff gate, then name rejection, before any write
  - `app/actions/guest-profiles.ts:62`
  - `app/actions/guest-profiles.ts:65` [security]
  - `app/actions/guest-profiles.ts:67` [security]
  - `app/actions/guest-profiles.ts:71`
- Bound constant
  - `app/actions/guest-profiles.ts:55`
- Success payload stays the submitted values
  - `app/actions/guest-profiles.ts:73`
- Catalog strings
  - `messages/en.json:736`
  - `messages/fr.json:736`

Reusable pattern: Name the rejection-only trim `trimmedGuestName` and keep a file-local `GUEST_NAME_MAX_LENGTH`, so the update payload stays on the raw input until the store-trimmed criterion.

## C2 — invalid phone, blank phone allowed

Suggested review order:
- Staff gate, then reject a non-blank phone that fails `PHONE_RE`, before any write
  - `app/actions/guest-profiles.ts:63` [auth]
  - `app/actions/guest-profiles.ts:72`
  - `app/actions/guest-profiles.ts:73` [security]
  - `app/actions/guest-profiles.ts:77`
- Check-only trim; the update still stores the submitted values
  - `app/actions/guest-profiles.ts:10`
  - `app/actions/guest-profiles.ts:79`
- Catalog key `errors.guestProfiles.phoneInvalid`
  - `messages/en.json:738`
  - `messages/fr.json:738`

Reusable pattern: Gate `PHONE_RE` with a truthy trimmed phone (`if (trimmed && !PHONE_RE.test(trimmed))`) so a blank phone stays allowed; `""` fails `{6,20}` and must not be tested on its own.

## C3 — store trimmed guest_name and phone

Suggested review order:
- Stored payload [security]: `app/actions/guest-profiles.ts:79`
- Trim and catalog rejections before the service client: `app/actions/guest-profiles.ts:66-75`
- Email-group filter (payload has no `email`): `app/actions/guest-profiles.ts:81`
- Padded name/phone stored trimmed, whitespace phone stored as `""`: `tests/unit/guest-profiles/update-pii.test.ts:206-229`

Reusable pattern: none

## Suggested Review Order (collated)

- [security] Staff gate, then reject a blank name, an oversized name, or a non-blank phone that fails `PHONE_RE`, before `createServiceClient` → `app/actions/guest-profiles.ts:63`, `app/actions/guest-profiles.ts:66`, `app/actions/guest-profiles.ts:73`
- [security] The update stores only the trimmed name and phone → `app/actions/guest-profiles.ts:79`
- Email-group filter, no `email` in the payload → `app/actions/guest-profiles.ts:81`
- Catalog strings → `messages/en.json:736`, `messages/fr.json:736`

## Traceability (final)

Run: 2026-10-08 · plan: res-124_guest_pii_b839 · issue: RES-124

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profiles.md GP-10 | tests/unit/guest-profiles/update-pii.test.ts::updateGuestProfilePii rejects a blank or oversized guest_name and does not update | app/actions/guest-profiles.ts, messages/en.json, messages/fr.json | P0 | shipped |
| C2 | guest-profiles.md GP-10 | tests/unit/guest-profiles/update-pii.test.ts::updateGuestProfilePii rejects an invalid phone and allows a blank phone | app/actions/guest-profiles.ts, messages/en.json, messages/fr.json | P0 | shipped |
| C3 | guest-profiles.md GP-10 | tests/unit/guest-profiles/update-pii.test.ts::updateGuestProfilePii stores trimmed guest_name and phone | app/actions/guest-profiles.ts | P0 | shipped |

## Run metrics

Run: 2026-10-08 → 2026-10-08 · plan: res-124_guest_pii_b839
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 9
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 3 left on ledger (below floor) — cap 3/run

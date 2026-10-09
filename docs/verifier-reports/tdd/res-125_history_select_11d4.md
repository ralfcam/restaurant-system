# TDD verifier — res-125_history_select_11d4

## C1 — GP-8 select allowlist

Suggested review order:
- query contract — `app/actions/guest-profiles.ts:25-27` [security]
- staff gate still runs before that read — `app/actions/guest-profiles.ts:20-21` [auth]
- `cancelled_at` / `seated_at` stay on the same rows for incidents — `app/actions/guest-profiles.ts:38-52`

Reusable pattern: none

## C2 — GP-5 named history fields

Suggested review order:
- named history copy, no spread [security] · `lib/guest-profiles.ts:139-151`
- optional `id` on the input row · `lib/guest-profiles.ts:101`
- optional `id` on the history row · `lib/guest-profiles.ts:123`
- retained `party_size` / `status` casts · `lib/guest-profiles.ts:147` · `lib/guest-profiles.ts:149`

Reusable pattern: Copy each allowed response field by name instead of spreading a database row, and do not add a helper for that single map.

## Suggested Review Order (collated)

- [security] Reservations read uses the named allowlist and never `*` → `app/actions/guest-profiles.ts:25-27`
- [auth] Staff gate still runs before that read → `app/actions/guest-profiles.ts:20-21`
- [security] History rows copy named fields and do not spread the reservation row → `lib/guest-profiles.ts:139-151`
- `cancelled_at` and `seated_at` stay on the query rows for incidents and stay off history → `app/actions/guest-profiles.ts:38-52`
- Optional `id` stays on the history row so a merged ficha list can keep reservation ids → `lib/guest-profiles.ts:123`

## Traceability (final)

Run: 2026-10-08 · plan: res-125_history_select_11d4 · issue: RES-125

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profiles.md GP-8 | tests/unit/guest-profiles/live-read.test.ts::getGuestProfile selects the ficha allowlist and never star | app/actions/guest-profiles.ts | P0 | shipped |
| C2 | guest-profiles.md GP-5 | tests/unit/guest-profiles/build-profile.test.ts::history rows keep named fields and drop extra reservation columns | lib/guest-profiles.ts | P0 | shipped |

## Run metrics

Run: 2026-10-08 → 2026-10-08 · plan: res-125_history_select_11d4
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 2 left on ledger (below floor) — cap 3/run

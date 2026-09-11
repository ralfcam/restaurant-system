# TDD verifier report — RES-41 guest note cap (`res-41_guest_note_cap_49176a07`)

FIX run. Linear: [RES-41](https://linear.app/realized/issue/RES-41/restaurant-system-unbounded-guest-note-on-scheduling-save-and-public).

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

## Criterion close-outs (incremental)

### RES41-C1 — Bounded server save (OH-NOTE-SAVE)

Suggested review order:
- Shared cap (OH-NOTE-SAVE) `[booking]`
  - `lib/reservations/operating-hours.ts:216`
  - `lib/reservations/operating-hours.ts:220`
- Trust-boundary reject before RPC `[booking]` `[public-api]`
  - `lib/reservations/operating-hours.ts:411`
  - `lib/reservations/operating-hours.ts:417`
  - `app/actions/availability.ts:186` `[auth]`
  - `app/actions/availability.ts:189`
- Closed-day omit (not an RPC bypass)
  - `lib/reservations/operating-hours.ts:497`
  - `lib/reservations/operating-hours.ts:505`
- Action-boundary pin
  - `tests/unit/availability/actions.test.ts:187`

Reusable pattern: Export one `MAX_*` cap, trim then reject (never truncate), and interpolate the constant into the error so the action-boundary test can assert `/240/` without a second magic number.

### RES41-C2 — Matching staff input cap (OH-NOTE-INPUT)

Suggested review order:
- [booking] `lib/reservations/operating-hours.ts:217` — shared `MAX_GUEST_NOTE_LENGTH = 240`
- [booking] `lib/reservations/operating-hours.ts:418-421` — trim then reject over-limit (trust boundary)
- [booking] `components/staff/scheduling-manager.tsx:28` — named import of that constant
- [staff-ux] `components/staff/scheduling-manager.tsx:509-524` — guest-note input `maxLength={MAX_GUEST_NOTE_LENGTH}`
- `components/staff/scheduling-manager.tsx:352-356` — address still literal `240` (do not conflate)
- `tests/unit/scheduling/schema.test.ts:122-132` — C2 source pin isolates the guest-note block
- `tests/unit/availability/actions.test.ts:187` — C1 240/241 RPC boundary

Reusable pattern: none — C1 already proposed one exported `MAX_*` across validator + input; no new recipe here.

## Suggested Review Order (collated)

- `[validation/public-data]` OH-NOTE-SAVE trust boundary — `docs/specs/scheduling.md` §13; `lib/reservations/operating-hours.ts:217` (`MAX_GUEST_NOTE_LENGTH`); `lib/reservations/operating-hours.ts:220` (`trimmedGuestNote`); `lib/reservations/operating-hours.ts:411` (closed-day skip); `lib/reservations/operating-hours.ts:417-421` (trim then reject, never truncate); `app/actions/availability.ts:186` `[auth]`; `app/actions/availability.ts:189` (validator errors before RPC); `lib/reservations/operating-hours.ts:497-505` (closed-day `guest_note: null`); `tests/unit/availability/actions.test.ts:187`
- `[staff-ux]` OH-NOTE-INPUT staff affordance — `components/staff/scheduling-manager.tsx:28` (named import); `components/staff/scheduling-manager.tsx:509-524` (guest-note `<input maxLength={MAX_GUEST_NOTE_LENGTH}>`); `components/staff/scheduling-manager.tsx:352-356` (address still literal `240` — do not conflate); `tests/unit/scheduling/schema.test.ts:122-132`
- `[cross-spec]` BW-4 inherits the cap — `docs/specs/booking-rules.md` BW-4 (widget does not independently truncate)

## Traceability (final)

Run: 2026-09-10 · plan: res-41_guest_note_cap_49176a07 · issue: RES-41

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| RES41-C1 | `scheduling.md` §13 OH-NOTE-SAVE | `tests/unit/availability/actions.test.ts::accepts 240-character guest notes and rejects 241 before replace_operating_windows` | `lib/reservations/operating-hours.ts` | P2 | shipped |
| RES41-C2 | `scheduling.md` §13 OH-NOTE-INPUT | `tests/unit/scheduling/schema.test.ts::limits each scheduling guest-note input with the shared 240-character cap` | `components/staff/scheduling-manager.tsx`; shared constant from `lib/reservations/operating-hours.ts` | P2 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: res-41_guest_note_cap_49176a07
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 6 left on ledger (below floor) — cap 3/run


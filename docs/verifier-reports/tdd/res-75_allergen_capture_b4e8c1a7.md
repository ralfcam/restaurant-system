# TDD log — res-75_allergen_capture_b4e8c1a7

## AL-1 Refactor

Suggested review order:
- Guest field on the details step → `components/site/reservation-widget.tsx:1055`, `components/site/reservation-widget.tsx:312`, `components/site/reservation-widget.tsx:468`, `components/site/reservation-widget.tsx:518`
- Blank stored as null, off the guest insert → `app/actions/reservations.ts:171`, `app/actions/reservations.ts:153`, `app/actions/reservations.ts:183`
- Payload type and copy → `lib/reservations/validation.ts:35`, `messages/en.json:119`, `messages/fr.json:119`

Reusable pattern: Keep optional guest text off the anon INSERT by normalizing a blank string beside the other trimmed fields, then service-role update `{ column: null }` only after insert success; clear the new widget state inside the existing `reset()` with name, email, and phone.

## AL-2 Refactor

Suggested review order:
- Guest INSERT still excludes allergens → `supabase/migrations/00000000000000_baseline.sql:167`, `app/actions/reservations.ts:179`
- Service-role write of only `{ allergens }` and rollback on that `conf_code` → `app/actions/reservations.ts:191`, `app/actions/reservations.ts:199`
- Over 500 returns before insert → `app/actions/reservations.ts:157`

Reusable pattern: One service-role client should own both a post-insert single-column update and the compensating delete on the same `conf_code`, so rollback does not construct a second client.

## AL-3 Refactor

Suggested review order:
- Staff row shows allergen text only when the value is non-null → `components/staff/reservations-manager.tsx:404`, `components/staff/reservations-manager.tsx:407`, `components/staff/reservations-manager.tsx:409`
- Database row is copied onto the shared staff reservation → `components/staff/reservations-manager.tsx:71`, `components/staff/reservations-manager.tsx:55`

Reusable pattern: none

## AL-4

The isolation test passed on the first run because each staff row already renders its own `r.allergens`. The provider `children` prop was corrected so `pnpm typecheck` exits 0. No production change.

Suggested review order:
- Per-row allergen text → `components/staff/reservations-manager.tsx:404`

Reusable pattern: none

## AL-5

`transitionReservationStatus` to `completed` already leaves `allergens` unchanged. The new test passed on the first run. No production change.

## AL-6

`validateReservationPayload` still rejects an empty name, an invalid email, and a party of 9. A successful `createReservation` still calls `sendBookingConfirmation`. The new test passed on the first run. No production change.

## Suggested Review Order (collated)

- Guest INSERT still excludes allergens → `supabase/migrations/00000000000000_baseline.sql:167`, `app/actions/reservations.ts:179`
- Service-role write of only `{ allergens }` and rollback → `app/actions/reservations.ts:191`, `app/actions/reservations.ts:199`
- Over 500 returns before insert → `app/actions/reservations.ts:157`
- Staff row shows allergen text only when non-null → `components/staff/reservations-manager.tsx:404`
- Guest field on the details step → `components/site/reservation-widget.tsx`

## Traceability (final)

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| AL-1 | allergen-capture.md AL-1 | tests/unit/reservations/allergen-capture.test.ts::AL-1 guest field stores null when blank | components/site/reservation-widget.tsx, app/actions/reservations.ts, lib/reservations/validation.ts | P1 | shipped |
| AL-2 | allergen-capture.md AL-2 | tests/unit/reservations/allergen-capture.test.ts::AL-2 trimmed service-role write and rollback | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| AL-3 | allergen-capture.md AL-3 | tests/unit/reservations/allergen-capture.test.ts::AL-3 staff row shows allergens | components/staff/reservations-manager.tsx, app/actions/reservations.ts | P1 | shipped |
| AL-4 | allergen-capture.md AL-4 | tests/unit/reservations/allergen-capture.test.ts::AL-4 allergen text stays on its reservation | components/staff/reservations-manager.tsx | P0 | shipped |
| AL-5 | allergen-capture.md AL-5 | tests/unit/reservations/allergen-capture.test.ts::AL-5 completed transition leaves allergens | app/actions/reservations.ts | P1 | shipped |
| AL-6 | allergen-capture.md AL-6 | tests/unit/reservations/allergen-capture.test.ts::AL-6 guest validation and confirmation stay | lib/reservations/validation.ts, app/actions/reservations.ts | P1 | shipped |

## Run metrics

- Criteria shipped: 6
- Manual-UAT: 0
- Layer: unit
- Verification command: `pnpm test:unit tests/unit/reservations/allergen-capture.test.ts` — 6 passed




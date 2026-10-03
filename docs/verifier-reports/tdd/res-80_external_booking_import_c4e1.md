# TDD log — res-80_external_booking_import_c4e1

### EI-1

Suggested review order:
- Authz guard: `app/actions/reservations.ts:364` [auth] — `requireStaffUser` before any service client
- Authz guard: `app/actions/reservations.ts:370` [auth] — anonymous caller redirects to `/auth/login`
- Authz guard: `app/actions/reservations.ts:371` — signed-in non-staff gets `errors.reservation.unauthorized`
- Service-role boundary: `app/actions/reservations.ts:374` [security] — `createServiceClient()` only on the staff path
- Import control: `components/staff/reservations-manager.tsx:303` — `data-testid="reservation-import"`
- Import label: `messages/en.json:201`, `messages/fr.json:201`

Reusable pattern: none

### EI-8

Suggested review order:
- Guest cannot set the id [security] → `supabase/migrations/00000000000000_baseline.sql:176` (`GRANT INSERT` allowlist), then `:158-161` (server-owned column note).
- Nullable column [schema] → `:113-114` (`external_booking_id TEXT`), then `:142-144` (`ADD COLUMN IF NOT EXISTS`).
- Non-null uniqueness [schema] → `:145-148` (`reservations_external_booking_id_uidx` … `WHERE external_booking_id IS NOT NULL`).

Reusable pattern: Hidden nullable reservation columns — declare on `CREATE TABLE`, repeat `ADD COLUMN IF NOT EXISTS` for reset, partial unique index `WHERE col IS NOT NULL`, leave the column off the guest `GRANT INSERT` list, and tag comments `RES-xx / EI-n` the way `RES-75 / AL-2` does.

### EI-3

Suggested review order:
- Authz before the service client [auth] → `app/actions/reservations.ts:363`, `:369`, `:373`
- Inserted-row mapping (trim vs blank-as-null, confirmed, unassigned, `TVL-####`) [booking] → `:374`, `:389`, `:396`, `:400`
- One RPC call with that row list [public-api] → `app/actions/reservations.ts:404`

Reusable pattern: Optional CSV cells use `value.trim() || null` (blank email/notes become null); required name and phone stay `trim()` so an omission is `''`.

### EI-4

Suggested review order:
- In-file duplicate rejects before any write — `app/actions/reservations.ts:404` [booking]
- Catalog copy for that error — `messages/en.json:598`, `messages/fr.json:598`
- Existing-id skip returns only the two counts — `app/actions/reservations.ts:412` [public-api]

Reusable pattern: Reject a repeated trimmed `external_booking_id` with a `Set` scan that returns a catalog key and never calls the RPC; pass `{ inserted, skipped }` through only when both are numbers.

### EI-5

Suggested review order:
- Reject a non-integer party before any write [booking] → `app/actions/reservations.ts:392`, `:404`, `:406`
- Trigger refusal reports no inserted rows [booking] → `app/actions/reservations.ts:421`
- All-existing file stays a successful no-op → `app/actions/reservations.ts:422`

Reusable pattern: Reject import party sizes with `!Number.isInteger(n) || n < 1` (same predicate as `seatWalkIn`, without the online cap of 8) in a pass before the service-role RPC so a mixed file never reaches the write.

### EI-6

Suggested review order:
- Service-role boundary [security]: `supabase/migrations/00000000000000_baseline.sql:584` (`search_path = ''`, invoker), then `:640`–`:642` (revoke public/anon/authenticated, grant `service_role`)
- Trigger still applies [booking]: `supabase/migrations/00000000000000_baseline.sql:604`–`:628` (insert into `public.reservations` with no handler), availability body unchanged at `:288`
- Skip-then-insert: `supabase/migrations/00000000000000_baseline.sql:597`–`:602` (existing `external_booking_id`), counts returned at `:633`–`:636`

Reusable pattern: none

### EI-2

Suggested review order:
- File-shape gate (refuse before RPC): `app/actions/reservations.ts:375` header, `app/actions/reservations.ts:410` [booking] blank id / `DATE_RE` / `TIME_RE` / phone / email / party size
- Shared patterns: `lib/reservations/validation.ts:19` [public-api] `DATE_RE`, `lib/reservations/validation.ts:20` `TIME_RE`, `app/actions/reservations.ts:18` imports
- Catalog copy: `messages/en.json:599`, `messages/fr.json:599`

Reusable pattern: Export reservation `DATE_RE` and `TIME_RE` from `lib/reservations/validation.ts` beside `PHONE_RE` and `EMAIL_RE`, and import them into the server action instead of copying the literals.

### EI-7

Suggested review order:
- Result contract: `components/staff/reservations-manager.tsx:338` [public-api] — `reservation-import-result` and the `inserted` / `skipped` values passed into `staff.reservations.importResult`
- Result contract: `components/staff/reservations-manager.tsx:128` — `importCsv` sets those counts only when both are numbers and `error` is absent, otherwise clears them
- Result contract: `components/staff/reservations-manager.tsx:136` [security] — `toast.error(t(result.error))` sends whatever string the action returned through the catalog
- Result contract: `messages/en.json:202` and `messages/fr.json:202` — same `{inserted}` / `{skipped}` placeholders
- List refresh: `components/staff/reservations-manager.tsx:140` — success bumps `listEpoch` and calls `router.refresh()`
- List refresh: `components/staff/reservations-manager.tsx:166` — the date fetch effect also depends on `listEpoch`, so imported rows replace client state via `rowToReservation` with no `external_booking_id` filter
- File input: `components/staff/reservations-manager.tsx:325` — CSV input clears its value and calls `importCsv`

Reusable pattern: Source-scan tests that slice ±800 characters around a `data-testid` fail if a refactor moves the asserted identifiers (`inserted`, `skipped`) into a helper outside that window — keep those keys in the JSX next to the marker.

## Suggested Review Order (collated)

- Authz before the service client [auth] → `app/actions/reservations.ts` `requireStaffUser`, anonymous `/auth/login` redirect, non-staff `errors.reservation.unauthorized`
- Service-role import function [security] → `supabase/migrations/00000000000000_baseline.sql` `import_external_reservations` (`search_path = ''`, execute granted only to `service_role`, no exception handler)
- Guest cannot set the id [security] → `supabase/migrations/00000000000000_baseline.sql` guest `GRANT INSERT` still omits `external_booking_id`
- Failure toast [security] → `components/staff/reservations-manager.tsx` `toast.error(t(result.error))` with the action's RPC `error.message`
- Nullable unique column [schema] → `supabase/migrations/00000000000000_baseline.sql` `external_booking_id TEXT` and `reservations_external_booking_id_uidx`
- One RPC row list [booking] → `app/actions/reservations.ts` trim vs blank-as-null, `confirmed`, `table_label` null, `TVL-####`, duplicate-id reject, party integer >= 1, header/`DATE_RE`/`TIME_RE`/phone/email
- Skip existing id inside the function [booking] → `supabase/migrations/00000000000000_baseline.sql` exists-check then `INSERT INTO public.reservations`
- Result and refresh [public-api] → `components/staff/reservations-manager.tsx` `reservation-import-result`, `importCsv`, `router.refresh()`
- Catalog copy → `messages/en.json`, `messages/fr.json` import labels and `importResult` / `importInvalidFile` / `importDuplicateId`

## Traceability (final)

Run: 2026-10-03 · plan: res-80_external_booking_import_c4e1 · issue: RES-80

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| EI-1 | external-booking-import.md EI-1 | tests/unit/reservations/external-booking-import.test.ts::EI-1 staff gate and import control | app/actions/reservations.ts, components/staff/reservations-manager.tsx | P0 | shipped |
| EI-8 | external-booking-import.md EI-8 | tests/unit/reservations/external-booking-import.test.ts::EI-8 hidden id and guest insert cannot set it | supabase/migrations/00000000000000_baseline.sql, components/staff/reservations-manager.tsx, components/staff/guest-profile-panel.tsx | P0 | shipped |
| EI-3 | external-booking-import.md EI-3 | tests/unit/reservations/external-booking-import.test.ts::EI-3 inserted row shape and no confirmation mail | app/actions/reservations.ts, lib/reservations/validation.ts | P0 | shipped |
| EI-4 | external-booking-import.md EI-4 | tests/unit/reservations/external-booking-import.test.ts::EI-4 existing id skipped, duplicate in file invalid | app/actions/reservations.ts, messages/en.json, messages/fr.json | P0 | shipped |
| EI-5 | external-booking-import.md EI-5 | tests/unit/reservations/external-booking-import.test.ts::EI-5 one transaction writes nothing on failure | app/actions/reservations.ts | P0 | shipped |
| EI-6 | external-booking-import.md EI-6 | tests/unit/reservations/external-booking-import.test.ts::EI-6 availability trigger has no import exception | supabase/migrations/00000000000000_baseline.sql | P0 | shipped |
| EI-2 | external-booking-import.md EI-2 | tests/unit/reservations/external-booking-import.test.ts::EI-2 bad file shape writes nothing | app/actions/reservations.ts, lib/reservations/validation.ts | P1 | shipped |
| EI-7 | external-booking-import.md EI-7 | tests/unit/reservations/external-booking-import.test.ts::EI-7 result counts and list shows imported rows | components/staff/reservations-manager.tsx, messages/en.json, messages/fr.json | P1 | shipped |

## Run metrics

Run: 2026-10-03 → 2026-10-03 · plan: res-80_external_booking_import_c4e1
Criteria: 8 shipped · 0 manual-uat · 8 total
Phases delegated: 24
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 19 left on ledger (below floor) — cap 3/run






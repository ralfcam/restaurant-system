# External booking import

**Status:** Draft
**Last updated:** 2026-10-03

## Scope

Staff on `/admin/reservations` can import reservations from a CSV file. Each new row becomes a normal `reservations` row. The action uses `requireStaffUser` and the service-role client. A guest cannot import. Direct booking stays as specified in [booking-rules.md](./booking-rules.md).

The file is UTF-8 CSV with a header row. The header names are exactly `external_booking_id`, `guest_name`, `party_size`, `date`, `time`, `phone`, `email`, and `notes`. `date` is `YYYY-MM-DD`. `time` is 24-hour `HH:MM`. Party size is an integer of at least 1. The online party cap of 8 does not apply. Omitted name and phone are stored as `''`, because those columns are `NOT NULL`. Omitted email is stored as null. Omitted notes are stored as null. A non-blank phone must match `PHONE_RE`. A non-blank email must match `EMAIL_RE`.

`external_booking_id` is required on every data row. It is stored on `reservations.external_booking_id`, a nullable text column with a unique index for non-null values. The column is not shown in the reservation UI. The guest INSERT allowlist does not include it. An id that already exists is skipped and does not insert a second row. A repeated id inside the same file is invalid.

The file is one transaction. If any data row is invalid, or the existing `validate_reservation_availability` trigger refuses an insert, the transaction writes nothing. Existing reservations stay as they are. There is no import exception on that trigger. A successful row is inserted as `confirmed`, with `table_label` null, and a unique `conf_code` matching `TVL-####`. No booking confirmation email is sent.

Out of this spec: an API or webhook ingest, a channel column, Google Reserve, a partial commit of a mixed file, an import confirmation email, and applying the online party cap of 8 to an import.

## Acceptance criteria

1. **EI-1 — Staff gate.** The import action uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot import. A `super_admin` session can. The control lives on `/admin/reservations` with `data-testid="reservation-import"`.

2. **EI-2 — File shape.** A file whose header is not exactly those eight names, a non-CSV body, or a data row missing `external_booking_id` writes nothing. `date` must be `YYYY-MM-DD`. `time` must be `HH:MM`. Party size must be an integer of at least 1. A non-blank phone must match `PHONE_RE`. A non-blank email must match `EMAIL_RE`. Any failed check writes nothing.

3. **EI-3 — Inserted row.** A valid new id inserts one `reservations` row with `status = 'confirmed'`, `table_label` null, the submitted `party_size`, `date`, and `time`, and `external_booking_id` trimmed. Omitted name and phone are stored as `''`. Omitted email and notes are stored as null. A provided name, phone, email, and notes are stored trimmed. `conf_code` matches `TVL-####` and is unique. The action does not send a booking confirmation email. A party larger than 8 is accepted when the availability trigger allows it. Guest `validateReservationPayload` still rejects a party larger than 8.

4. **EI-4 — Idempotent id.** Uploading a file whose `external_booking_id` already exists inserts no second row for that id. The existing row is unchanged. A second copy of the same id inside one file is invalid and writes nothing.

5. **EI-5 — All or nothing.** When any data row is invalid, or the availability trigger refuses any new insert, the import writes no rows from that file. Reservations that existed before the upload are unchanged. A file whose every id already exists inserts nothing and leaves those rows unchanged.

6. **EI-6 — Trigger unchanged.** A blocked date, a closed day, a time outside opening hours, or a full restaurant, slot, or service cover cap refuses the import and writes no row. `validate_reservation_availability` gains no import exception.

7. **EI-7 — Result.** After a successful upload the page reports how many rows were inserted and how many existing ids were skipped, with `data-testid="reservation-import-result"`. Imported rows appear in `/admin/reservations` for that date alongside reservations created directly. The guest INSERT allowlist is unchanged.

8. **EI-8 — Hidden id.** `external_booking_id` is not rendered on `/admin/reservations` or the guest ficha. A guest insert cannot set the column.

## Implementation trace (non-normative)

FEATURE `res-80_external_booking_import_c4e1` (RES-80, 2026-10-03). EI-1–EI-8 shipped. `importExternalReservations` in `app/actions/reservations.ts` uses `requireStaffUser` then `createServiceClient`. An unauthenticated caller redirects to `/auth/login`. An authenticated non-staff caller returns `errors.reservation.unauthorized`. The header must equal `external_booking_id,guest_name,party_size,date,time,phone,email,notes`. A blank `external_booking_id`, a date failing exported `DATE_RE`, or a time failing exported `TIME_RE` returns `errors.reservation.importInvalidFile` and does not call `import_external_reservations`. A non-blank phone failing `PHONE_RE` returns `errors.reservation.phoneInvalid`. A non-blank email failing `EMAIL_RE` returns `errors.reservation.emailInvalid`. A party size that is not an integer of at least 1 returns `errors.reservation.partySizeInvalid`. A repeated trimmed id in the file returns `errors.reservation.importDuplicateId` before the RPC. `DATE_RE` and `TIME_RE` are exported from `lib/reservations/validation.ts` beside `PHONE_RE` and `EMAIL_RE`. The RPC inserts `status` `confirmed`, `table_label` null, trimmed fields, omitted email and notes as null, and `conf_code` from `generateConfCode()` (`TVL-####`). An id already stored is skipped. `import_external_reservations(jsonb)` is `GRANT EXECUTE` to `service_role` only. `validate_reservation_availability` has no import exception. `reservations.external_booking_id` is nullable text (`CREATE TABLE` and `ADD COLUMN IF NOT EXISTS`) with partial unique index `reservations_external_booking_id_uidx` `WHERE external_booking_id IS NOT NULL`, and it is omitted from the guest `GRANT INSERT` list. Staff `/admin/reservations` uses `data-testid="reservation-import"` and, on success, `data-testid="reservation-import-result"` (`staff.reservations.importResult`). The column is not rendered. No `sendBookingConfirmation`.

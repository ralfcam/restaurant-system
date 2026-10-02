# TDD log — res-83_walk_in_seating_41f0

### WI-1

Suggested review order:
- Staff gate [auth] `app/actions/reservations.ts:225-232` — `requireStaffUser` first; no session redirects to `/auth/login`; authenticated non-staff returns `errors.reservation.unauthorized`
- Service-role boundary [security] `app/actions/reservations.ts:235` — `createServiceClient()` only after that staff check
- Floor control [public-api] `components/staff/floor-plan.tsx:1297-1304` and `components/staff/floor-plan.tsx:1603-1608` — `data-testid="walk-in-seat"` on both selected-table panels
- Catalog labels `messages/en.json:446` and `messages/fr.json:446` — `staff.floor.seatWalkIn`
- Reserved payload `app/actions/reservations.ts:219-224` — input object kept; `void input` satisfies unused-vars

Reusable pattern: Reserved server-action args that a later criterion will read must be referenced with `void arg`, because eslint-config-next unused-vars has no `argsIgnorePattern` and a leading underscore still fails `pnpm lint` (`--max-warnings 0`).

### WI-2

Suggested review order:
- Staff gate before the write [auth] — `app/actions/reservations.ts:226-236` (`requireStaffUser`, then `createServiceClient()`)
- Seated insert payload [booking] — `app/actions/reservations.ts:237-247` (`status` seated, submitted label, `getTodayInRestaurantTZ()`, `getNowTimeInRestaurantTZ()`, party size, `guest_name`/`phone` `?? ""`, `email` `?? null`, `generateConfCode()`)
- No confirmation email [public-api] — `app/actions/reservations.ts:248-249` (returns after the insert; `sendBookingConfirmation` is not called)
- Insert failure text [security] — `app/actions/reservations.ts:248` (raw PostgREST `error.message`)

Reusable pattern: none

### WI-6

Suggested review order:
- Trigger refusal is returned and the insert is not treated as success: `app/actions/reservations.ts:248` [booking]
- Canonical trigger refuses every status before any success return: `supabase/migrations/00000000000000_baseline.sql:300` [schema], then `supabase/migrations/00000000000000_baseline.sql:347`, then `supabase/migrations/00000000000000_baseline.sql:562`
- Test pins that message and the absence of a seated or walk-in bypass: `tests/unit/reservations/walk-in.test.ts:287`, `tests/unit/reservations/walk-in.test.ts:307`

Reusable pattern: Pin “no exception” by returning the trigger `error.message` unchanged and asserting the canonical function body has no walk-in match, no early `RETURN NEW`, and no seated bypass — do not map that text through the guest P0001 catalog.

### WI-5

Suggested review order:
- Table fit — seats below the party refuses and writes no row
  - `app/actions/reservations.ts:245` [booking]
  - `app/actions/reservations.ts:240`
- Occupying overlap — same date and label, `confirmed` or `seated` only
  - `app/actions/reservations.ts:249`
  - `app/actions/reservations.ts:257` [booking]
  - `app/actions/reservations.ts:266`
  - `app/actions/reservations.ts:272`
  - `app/actions/reservations.ts:274`

Reusable pattern: Walk-in overlap stays inline beside `assignReservationTable`; that path fail-closes on settings and occupancy reads and skips its own id, so only `occupyingWindowMinutes`, `occupyingWindowsOverlap`, and `ACTIVE_RESERVATION_STATUSES` are shared.

### WI-8

Suggested review order:
- No new status edge [booking] — `app/actions/reservations.ts:359` (`seated: ["completed"]` only), then `tests/unit/reservations/walk-in.test.ts:466` (matrix slice has that edge and no walk-in token)
- Staff gate before the service client [auth] — `app/actions/reservations.ts:369`
- Persist completed, stamp `completed_at`, clear the label [booking] — `app/actions/reservations.ts:387`, then `app/actions/reservations.ts:394`, then `tests/unit/reservations/walk-in.test.ts:537`
- Free the table — `app/actions/reservations.ts:420` (available sync when the label is cleared), then `app/actions/operations.ts:514`, then `tests/unit/reservations/walk-in.test.ts:545`

Reusable pattern: When seated-to-completed already matches the spec, pin the matrix slice plus the update (`completed`, `completed_at`, null `table_label`) and the table-group `available` write, and skip Green — do not add a status edge to force a red.

### WI-3

Suggested review order:
- Walk-in party rule [booking] `app/actions/reservations.ts:236` — integer ≥ 1, `errors.reservation.partySizeInvalid`, no cap of 8
- Guest cap stays on the guest validator [public-api] `lib/reservations/validation.ts:57` — `partyTooLarge` above `RESERVATION_ONLINE_MAX_PARTY`; `seatWalkIn` does not call it
- Service-role client only after that guard [security] `app/actions/reservations.ts:245`
- Acceptance of a party of 9 when the table fits: `tests/unit/reservations/walk-in.test.ts:603`
- Guest payload of that same size still refused: `tests/unit/reservations/walk-in.test.ts:615`

Reusable pattern: Keep the walk-in party check inline (integer ≥ 1, before `createServiceClient`) and do not call `validateReservationPayload`, which also returns `partyTooLarge` above `RESERVATION_ONLINE_MAX_PARTY` — the same split inquiry validation already uses.

### WI-4

Suggested review order:
- Format gate before any write [booking] `app/actions/reservations.ts:247` — trim `guest_name` and `phone` with `?? ""`
- Null versus blank email [booking] `app/actions/reservations.ts:249` — `== null` keeps omitted email null; `""` and whitespace-only stay `''`
- Regex refusal [security] `app/actions/reservations.ts:250` and `app/actions/reservations.ts:253` — non-blank `PHONE_RE` / `EMAIL_RE` failures return catalog keys and do not insert
- Trimmed insert payload [booking] `app/actions/reservations.ts:304` — `guest_name`, `phone`, and `email` are the trimmed locals, not the raw input
- Guest rules unchanged [public-api] `lib/reservations/validation.ts:85` — phone optional, email required; `seatWalkIn` does not call this

Reusable pattern: When phone and email are both optional, trim first and invert both checks (`if (value && !RE)`), and keep omitted email null with `== null` rather than `|| null`, which would also turn a blank string into null. Do not call `validateReservationPayload`.

### WI-7

Suggested review order:
- Seat the table group the same way as the existing seated transition
  - `app/actions/reservations.ts:311` [booking] — after the insert succeeds, `table?.id` then `syncTableGroupStatus(input.table_label, "seated")`
  - `app/actions/reservations.ts:441` — existing seated transition uses that same helper
  - `app/actions/operations.ts:503` [auth] — helper re-checks staff before its service client
  - `app/actions/operations.ts:519` [booking] — `applyStatusToIds` fans out to the merge or the single id; not copied into `seatWalkIn`
  - `app/actions/operations.ts:529` — `seated` restarts the merge clock and does not dissolve the group
- Floor overlay already shows party size and time for a seated walk-in
  - `lib/reservations/auto-assign.ts:322` — overlay `partySize` and `time`
  - `lib/reservations/auto-assign.ts:340` — seated reservation sets `displayStatus` to `seated`
  - `components/staff/floor-plan.tsx:1130` — party size on the chip
  - `components/staff/floor-plan.tsx:1139` — time on the chip
- Sync failure and cache scope stay on the helper
  - `app/actions/operations.ts:504` — unauthorized and invalid status still throw
  - `app/actions/operations.ts:514` — a failed or missing table read returns without throwing
  - `app/actions/operations.ts:539` — revalidates `/admin/floor` and `/pos` only

Reusable pattern: After a successful walk-in insert, call `syncTableGroupStatus(label, "seated")` behind the `table?.id` guard instead of copying `applyStatusToIds`, so merge fan-out, status events, and floor/POS revalidation stay on the existing seated-transition path.

## Suggested Review Order (collated)

- Staff gate before any write [auth] `app/actions/reservations.ts:226-236` — `requireStaffUser`, then redirect or `errors.reservation.unauthorized`
- Service-role client only after that gate [security] `app/actions/reservations.ts:257`
- Table-group seat uses the existing helper [auth] `app/actions/operations.ts:503` — `syncTableGroupStatus` re-checks staff; called from `app/actions/reservations.ts:311`
- Seated insert payload [booking] `app/actions/reservations.ts:298-308` — status, label, today, now, party, blank name and phone, null email, `generateConfCode`, no confirmation email
- Trigger refusal stays verbatim [booking] `app/actions/reservations.ts:309` — insert `error.message`, no walk-in exception in `supabase/migrations/00000000000000_baseline.sql:347`
- Fit and overlap [booking] `app/actions/reservations.ts:266` and `app/actions/reservations.ts:295`
- Party size [booking] `app/actions/reservations.ts:239` — integer ≥ 1; guest cap stays in `lib/reservations/validation.ts:57`
- Contact format [security] `app/actions/reservations.ts:250` and `app/actions/reservations.ts:253`
- Completion stays the existing edge [booking] `app/actions/reservations.ts:387` — `completed`, `completed_at`, clear label, then `app/actions/reservations.ts:449` frees the table
- Floor overlay [public-api] `lib/reservations/auto-assign.ts:322` and `components/staff/floor-plan.tsx:1130`

## Traceability (final)

Run: 2026-10-02 · plan: res-83_walk_in_seating_41f0 · issue: RES-83

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| WI-1 | walk-in-seating.md WI-1 | tests/unit/reservations/walk-in.test.ts::walk-in create requires a staff session and the floor control is walk-in-seat | app/actions/reservations.ts, components/staff/floor-plan.tsx, messages/en.json, messages/fr.json | P0 | shipped |
| WI-2 | walk-in-seating.md WI-2 | tests/unit/reservations/walk-in.test.ts::successful walk-in inserts one seated reservation for today and now and sends no confirmation email | app/actions/reservations.ts | P0 | shipped |
| WI-6 | walk-in-seating.md WI-6 | tests/unit/reservations/walk-in.test.ts::walk-in create returns the availability trigger refusal and adds no walk-in exception | app/actions/reservations.ts | P0 | shipped |
| WI-5 | walk-in-seating.md WI-5 | tests/unit/reservations/walk-in.test.ts::walk-in create refuses a table that is too small or overlaps an occupying reservation | app/actions/reservations.ts | P0 | shipped |
| WI-8 | walk-in-seating.md WI-8 | tests/unit/reservations/walk-in.test.ts::seated walk-in completion persists completed, stamps completed_at, clears the label, and frees the table | app/actions/reservations.ts | P0 | shipped |
| WI-3 | walk-in-seating.md WI-3 | tests/unit/reservations/walk-in.test.ts::walk-in party size must be an integer of at least 1 and may exceed 8 | app/actions/reservations.ts | P1 | shipped |
| WI-4 | walk-in-seating.md WI-4 | tests/unit/reservations/walk-in.test.ts::walk-in stores trimmed valid contact and refuses a bad phone or email | app/actions/reservations.ts | P1 | shipped |
| WI-7 | walk-in-seating.md WI-7 | tests/unit/reservations/walk-in.test.ts::successful walk-in sets the table group seated and the floor overlay shows party size and time | app/actions/reservations.ts | P1 | shipped |

## Run metrics

Run: 2026-10-02 → 2026-10-02 · plan: res-83_walk_in_seating_41f0
Criteria: 8 shipped · 0 manual-uat · 8 total
Phases delegated: 25
Back-loops: WI-7: 1 extra Red/Green/Refactor cycle
BLOCKED events: none
Issues: 3 filed · 0 attached · left on ledger (below floor) — cap 3/run

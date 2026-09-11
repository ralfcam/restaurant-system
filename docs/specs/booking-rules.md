# Booking rules

**Status:** Draft  
**Last updated:** 2026-09-11

## Scope

Guest online reservations via server actions (`app/actions/reservations.ts`,
`app/actions/availability.ts`). Staff admin at `app/admin/reservations`.

## Acceptance criteria

_(Expand during first `/sdd-to-tdd` run.)_

1. **Party size cap** — Online bookings reject `partySize > 8` server-side with a
   stable error; client cannot bypass.
2. **Blocked dates** — Reservations on blocked dates are rejected per DB policy and
   `isDateBlocked` / `getOperatingWindowForDate`.
3. **Operating window** — Times outside the restaurant operating window for the
   selected date are rejected.
4. **Confirmation code** — Successful booking returns a unique `conf_code` (format
   `TVL-####`). Successful booking still returns `TVL-####` for on-screen
   display. After the INSERT succeeds, the server MUST send a post-booking
   confirmation to the guest email. Mailer failure MUST NOT fail the booking
   or withhold `conf_code`.
   **CONF-CODE-UNIQUE** — `public.reservations.conf_code` MUST have an
   idempotently-created database unique constraint or unique index. Baseline
   `00000000000000_baseline.sql` MUST contain
   `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)`
   immediately after the `reservations` table creation. After a fresh local
   reset, the first otherwise-valid insert of a given `TVL-####` succeeds; a
   second insert of the same code in a different reservation slot MUST fail with
   SQLSTATE `23505`; exactly one row with that code remains.
5. **RLS / RES-PRIV** — Guest booking is insert-only on `reservations`. Table
   privileges MUST `REVOKE ALL ON TABLE reservations FROM PUBLIC, anon, authenticated`
   and then grant guest INSERT only on the guest-column allowlist:
   `GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated`
   in `00000000000000_baseline.sql`,
   `20260825140000_operating_windows_privilege.sql`, and
   `20260827160000_public_catalog_privileges.sql`. Table-wide guest
   `GRANT INSERT ON TABLE reservations` is forbidden. Server-owned or defaulted
   columns `id`, `status`, `table_label`, `created_at`, and `completed_at` MUST
   be absent from that allowlist. A normal guest insert therefore receives
   database defaults (`status = 'confirmed'`, generated `id` / `created_at`,
   null `table_label` / `completed_at`); a guest attempt to provide those
   protected columns MUST be denied before persistence. There MUST NOT be
   `GRANT SELECT ON TABLE reservations TO anon` or `TO authenticated`. Policy
   `Allow public insert reservations` stays. Policy
   `Allow public read reservations` MUST be dropped (`DROP POLICY IF EXISTS` …;
   no `CREATE`). There MUST NOT be an authenticated `FOR ALL` (or other write)
   RLS policy on `reservations`. Every staff reservation list and mutation path,
   including `getReservations`, MUST use `requireStaffUser` plus
   `createServiceClient`. `GRANT ALL TO service_role` stays (scheduling.md §17).
   Guest PII (name, phone, notes) MUST NOT be readable via the anon key.

## Guest booking widget (segmented slots)

Guest widget at `components/site/reservation-widget.tsx`. Segment source is
`/admin/scheduling` (`operating_windows`). Restaurant-wide slot interval,
occupancy duration, and **staff-manageable** safety buffer live on `/admin/floor`
(`restaurant_settings.slot_interval_minutes`;
`occupancy_duration_minutes` default 90; `safety_buffer_minutes` default 15).

**Until-badge rule:** `until = start + restaurant occupancy duration` (default
90). The badge is predicted end (`19:00` → `20:30`), never next-bookable
(`20:45`). No table is assigned at booking, so the widget MUST NOT read a
specific table’s Expected time (`tables.expected_minutes` stays for live-floor
clocks only — FP-10).

**Labels/notes:** shown exactly as staff typed (no auto FR/EN translation).
Widget chrome (Réserver, guests, date, time, until prefix) uses `next-intl` for
the route locale. An in-widget language toggle is out of scope.

6. **BW-1 — Exclusive segment membership** — A bookable time belongs to
   **exactly one** opening-hour segment. If a later segment’s `opens_at` equals
   the time, that later segment wins (Lunch `12:00–14:00` and Afternoon
   `14:00–…` must not both own `14:00`). `assignSegmentForTime` encodes this.

7. **BW-2 — Until-badge math** — Each slot card shows an until-badge of
   `slotUntilTime(start, occupancyDurationMinutes)` = start + occupancy
   duration (default 90). MUST NOT add the safety buffer. Times wrap modulo
   24h (`23:00` → `00:30`, never `24:30`).

8. **BW-3 — Slot-interval clamp** — Guest slot spacing uses
   `clampSlotIntervalMinutes`: allowed set `{15, 30, 60}`, default **30**
   (invalid values including `20` and `NaN` become 30).

9. **BW-4 — Grouped bookable slots** — `groupBookableSlots` groups times by
   segment `sort_order`, assigns each time via BW-1, falls back unlabeled
   headings to the time range (`09:00–11:00`), omits empty groups, and
   attaches a non-empty `guest_note`. Blank/whitespace notes are omitted from
   the payload and render no helper. The attached note inherits scheduling
   §13 OH-NOTE-SAVE; the widget does not independently truncate it.

10. **BW-5 — Slot generation uses restaurant interval** — `getAvailableSlots`
    reads `restaurant_settings.slot_interval_minutes`, clamps via BW-3, and
    passes that step into existing `bookableTimesForDay` (no second generator).
    A 15-minute setting with lunch `12:00–14:00` includes `12:15`.

11. **BW-6 — Widget grouped cards** — The homepage widget renders grouped slot
    cards (not a flat time dropdown). It consumes `groupBookableSlots` and
    `slotUntilTime`; each group/card/until has `data-testid` `slot-group` /
    `slot-card` / `until`; there is no time `<Select>`.

12. **BW-7 — Accordion and Réserver gate** — Guests, date, and time are exclusive
    accordions (Time expanded by default). Picking a card does **not** skip to
    guest details and does **not** call `createReservation`. Réserver stays
    disabled until a slot is selected; it only advances to step 2. Step 2
    requires guest name and a valid email; **phone is optional** (SMS
    confirmation is out of scope).

13. **BW-8 — Widget chrome i18n** — Chrome strings (`reserve`, `until`,
    `guests`, `date`, `time`, collapsed summaries) live under
    `reservationWidget.*` in `messages/fr.json` and `messages/en.json` and the
    widget uses `useTranslations("reservationWidget")`. Segment labels and
    guest notes stay staff-entered.

14. **BW-9 — Occupancy window (next bookable)** — `confirmed` and `seated`
    reservations occupy `party_size` on the half-open interval
    `[start, start + occupancy + buffer)` **on the same reservation `date`**.
    Defaults are occupancy 90 and buffer 15. Example: a 19:00 seating shows
    until-badge 20:30 and first free instant 20:45. Candidate time `T` is
    unavailable when overlapping occupying covers + `partySize` >
    `sum(tables.seats)`. `getAvailableSlots` applies this window; the
    `validate_reservation_availability` trigger enforces it on INSERT/UPDATE
    (`P0001`; `createReservation` already returns that message). Cover-count on
    the confirm path MUST be serialized per BW-15. The next **generated** slot
    is the first `bookableTimesForDay` time at or after the free instant (on a
    30-min grid: 20:45 → 21:00 if 20:45 is not a step). Cover counting is not
    sufficient; BW-12 also requires a compatible table.
    Clock wrap is for until/next-bookable **strings**; overlap does not span
    the next calendar date in this run.

15. **BW-10 — Early-release** — Only `confirmed` and `seated` occupy.
    `completed`, `cancelled`, and `no_show` do not. Example: a 19:00
    reservation completed by 20:20 makes 20:30 bookable; MUST NOT hold until
    20:45.

16. **BW-11 — Occupancy settings + floor UX** — Occupancy duration uses
    `clampExpectedMinutes` (30–240, step 15, default 90). Safety buffer uses
    `clampSafetyBufferMinutes` (0–60 inclusive, step 5, default **15**;
    `Math.round` to step; invalid including NaN → 15). Both are
    **restaurant-wide, staff-manageable UX** on `/admin/floor` in the same
    chrome as slot interval (labeled controls, not the per-table inspector,
    not a hidden constant). Staff can change the buffer from 15 and persist
    `safety_buffer_minutes`; same for occupancy duration. Guest until-badge
    and occupancy windows read that singleton.

17. **BW-12 — Compatible-table bookability.** A generated slot `T` is bookable
    for party `P` only when `P` plus every occupying reservation (`confirmed` /
    `seated`, BW-10) whose BW-9 window overlaps `T` can be assigned to
    **distinct units** under FP-3 best-fit (smallest `seats >= party_size`;
    larger party first, then earlier `created_at`):

    - A unit is a physical table or an **existing** staff merge collapsed as
      one table (FP-8 / `toAssignableTables`). Guests MUST NOT invent a merge
      at booking.
    - `out_of_service` units are excluded. Live `seated` / `reserved` /
      `cleaning` MUST NOT hide a future slot; occupying reservations + BW-9
      windows do.
    - Guest INSERT MUST NOT write `table_label` (FP-2).
    - `getAvailableSlots` MUST set `available: false` when this fails, even if
      occupying covers + `P` is still `<= sum(tables.seats)`.
    - `validate_reservation_availability` MUST refuse occupying INSERT/UPDATE
      with `P0001` `Booking denied: This time is fully booked.` when this
      fails (same user-facing string as BW-9 cover overflow). Last-writer SQL
      (table-fit block) MUST be byte-identical in
      `00000000000000_baseline.sql`,
      `20260818162000_operating_hour_segments.sql`,
      `20260827180000_occupancy_duration_buffer.sql`, and a new dated forward
      for remotes that already recorded occupancy.
    - Concurrent inserts competing for the last compatible unit at the same
      slot: exactly one succeeds.

18. **BW-13 — Guest email intake** — `createReservation` accepts `email`.
    Validation: trimmed non-empty; MUST look like `local@domain` with a `.` in
    the domain. Missing/invalid email is a reservation error (no INSERT).
    Persist on `reservations.email`. Blank/whitespace phone is accepted and
    stored as `""` (`phone` stays `NOT NULL` — no migration). A non-blank
    phone still MUST match the existing phone pattern. Widget Email is
    `required`; Phone is not. `confirm()` MUST pass `email` into
    `createReservation`. Anon MUST NOT `SELECT` the column (AC-5).

19. **BW-14 — Confirmation send** — After a successful reservations INSERT
    (not on validation errors, not on P0001, not on in-progress 23505 retries),
    send **one** confirmation to that email from the in-memory payload (MUST
    NOT `SELECT` the inserted row). Payload `{ to, html }` (no From/subject).
    HTML MUST include escaped guest name, date, time, party size, and
    `conf_code`. Implementation is a **server-only** helper, not
    `processDueReviewEmails` (PV-4 remains `completed`-only). A throwing
    mailer MUST be caught; the action still returns `{ confCode }`. Live
    provider stays manual-UAT (same stub class as review-email cron).

20. **STAFF-LIST — Staff date list is fail-closed.** `getReservationsByDate` is
    a staff read (`requireStaffUser` + `service_role`). Auth failure or query
    failure MUST return a Result `{ reservations: [], error }` with a stable
    message, never a successful empty array (no `error` field).
    `ReservationsManager` MUST surface that error and MUST NOT show filter-empty
    copy for a load failure. When the load succeeds with zero rows and no
    status/name/phone filter is excluding rows, empty copy states there are no
    reservations for that date. Filter-empty copy ("No reservations match your
    filters.") is only when filters are active and the filtered list is empty.

21. **RES-ISO — Mutating reservation integration is local-only.** Mutating
    automated coverage under `tests/integration/reservations/*.integ.test.ts`
    (cleanup deletes, service-role inserts, `createReservation` writes,
    `blocked_dates` probes) MUST run only against **local** Supabase
    (`NEXT_PUBLIC_SUPABASE_URL` host `127.0.0.1`, `localhost`, or `[::1]`). It
    MUST fail closed — not skip — when the URL is the shared linked project
    `tilcqrudqxznnpepxjqq` (or any other non-local host). Use the existing
    `authEnvReady` / `RESTAURANT_INTEGRATION_STRICT` setup symbols **plus**
    `assertIsolatedHoursMutationTarget()` from
    `lib/scheduling/hours-mutation-target.ts` (same helper as scheduling.md
    §15). Call it as the **first statement** of `beforeAll` and of every
    cleanup hook that writes (`afterEach` / `afterAll`). The call MUST be
    **zero-argument** (`assertIsolatedHoursMutationTarget()`). A call that
    passes an explicit URL MUST be treated as missing the pin: the helper’s
    “explicit URL wins” rule (scheduling.md §15) would accept a local string
    while `createServiceClient()` still uses `NEXT_PUBLIC_SUPABASE_URL`. The
    unit scan MUST reject `arguments.length !== 0`. Do not put the guard
    in `createServiceClient` (staff/admin against the linked project remains
    valid production). A new file matching that glob MUST include the same
    pin. Helper fail-closed behavior (omitted URL follows env; explicit URL
    wins; missing/empty/invalid/non-local throws) stays owned by scheduling
    §15 / `tests/unit/scheduling/hours-mutation-target.test.ts`.

22. **BW-15 — Occupancy cover is serialized.** Occupying INSERT/UPDATE
    (`confirmed` / `seated`) MUST acquire the date-scoped advisory lock
    `pg_advisory_xact_lock(305, (date - 1970-01-01)::int)` (classid 305 =
    REAZED-305; objid = days since epoch, **not** slot) **before** the
    occupancy cover SELECT that sums overlapping `party_size`. Concurrent
    occupying inserts whose BW-9 windows overlap MUST NOT together exceed
    `sum(tables.seats)`. The rejected writer MUST raise P0001
    `Booking denied: This time is fully booked.` (same user-facing string as
    BW-9 / BW-12). Last-writer SQL (lock, then cover-count, then table-fit)
    MUST be byte-identical in `00000000000000_baseline.sql`,
    `20260818162000_operating_hour_segments.sql`,
    `20260827180000_occupancy_duration_buffer.sql`,
    `20260828121224_table_fit_availability.sql`, and a new dated forward for
    remotes that already recorded table-fit. `SELECT FOR UPDATE` of existing
    occupancy rows is not sufficient (empty-date phantom insert).

23. **RES-TRIGGER-EXEC — Booking trigger is not a guest RPC.**
    `public.validate_reservation_availability()` MUST remain `SECURITY DEFINER`
    with `SET search_path TO public` and remain the enabled
    `enforce_booking_rules` `BEFORE INSERT OR UPDATE` trigger on `reservations`.
    `PUBLIC`, `anon`, and `authenticated` MUST have no effective `EXECUTE` on
    that function. Every repo migration that contains
    `CREATE OR REPLACE FUNCTION validate_reservation_availability()` MUST
    immediately follow that function body with
    `REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM PUBLIC`
    and
    `REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM anon, authenticated`;
    no later migration may re-grant guest EXECUTE. A full local reset MUST
    converge on that ACL. **RES-TRIGGER-EXEC-AUTHLESS — Trigger ACL catalog
    coverage is auth-environment-independent.** The repository migration scan
    and local Docker/Postgres catalog assertion in
    `tests/integration/security/sibling-privileges.integ.test.ts` MUST execute
    independently of `authEnvReady`: the named “local reset keeps
    validate_reservation_availability trigger-only and denies guest EXECUTE”
    test MUST live outside `describe.skipIf(!authEnvReady)`, retain a
    zero-argument `assertIsolatedHoursMutationTarget()` in its own `beforeAll`,
    and fail rather than skip when local Docker/Postgres is unavailable. Other
    sibling tests retain their current gating and behavior. The linked
    project, whose latest recorded function writer is currently
    `20260828121224_table_fit_availability.sql`, is updated by separately
    authorized execution of the latest idempotent function-defining forward
    even when its history row already exists; do not `db push` or reset its
    forked migration history.

24. **BD-READ-FAIL — Blocked-date SELECT errors fail closed.** `isDateBlocked`,
    `getBlockedDatesInMonth`, and `getBlockedDatesInRange` in
    `app/actions/availability.ts` MUST distinguish a successful empty result from
    any non-null Supabase/PostgREST SELECT `error`, including authorization,
    missing-table, and schema-cache errors. On such an error, the reader MUST
    log the backend message server-side and reject with an `Error` whose exact
    public message is `Could not load blocked dates.`; it MUST NOT resolve
    `false` or `[]`. On success, `isDateBlocked` returns `true` for a row and
    `false` for no row, while the list readers return mapped ISO date strings and
    return `[]` only for a successful null/empty result. The three functions
    retain their existing success return types and anon-client queries.
    Caller-specific recovery UI is not part of this criterion.

## Implementation trace (non-normative)

| Criterion             | Shipped in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BW-1                  | `lib/reservations/operating-hours.ts` — `assignSegmentForTime`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `tests/unit/reservations/operating-hours.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| BW-2                  | `lib/reservations/operating-hours.ts` — `slotUntilTime(start, occupancyDurationMinutes)`, `wrapMinutesOfDay`; widget via `getGuestOccupancyDurationMinutes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | same — until-badge uses occupancy duration, not the safety buffer                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| BW-3                  | same — `clampSlotIntervalMinutes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | same — `clampSlotIntervalMinutes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| BW-4                  | same — `groupBookableSlots`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | same — `groupBookableSlots`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| BW-5                  | `app/actions/reservations.ts` — `getAvailableSlots` (slot interval + occupancy cover)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `tests/unit/reservations/available-slots.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| BW-6                  | `components/site/reservation-widget.tsx` — `slotUntilTime(time, occupancyDurationMinutes)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `tests/unit/reservation-widget/segment-groups.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| BW-7                  | same                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | same (Réserver gate)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| BW-8                  | same; `messages/en.json`, `messages/fr.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `tests/unit/reservation-widget/chrome-i18n.test.ts`, `tests/unit/i18n/messages-parity.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| AC-4 CONF-CODE-UNIQUE | `CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)` immediately after the `reservations` table create in `supabase/migrations/00000000000000_baseline.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `tests/integration/reservations/confirmation-code-uniqueness.integ.test.ts` → "rejects a second guest insert of the same conf_code with SQLSTATE 23505"                                                                                                                                                                                                                                                                                                                                                                       |
| AC-5 RES-PRIV         | `REVOKE ALL` then `GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code)` on `reservations` (table-wide guest INSERT forbidden); server-owned `id`/`status`/`table_label`/`created_at`/`completed_at` default or stay null; drop authenticated `FOR ALL`; `DROP POLICY IF EXISTS "Allow public read reservations"` (no `CREATE`); no `GRANT SELECT`; staff list/mutation including `getReservations` is `requireStaffUser` + `createServiceClient` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql`. Nullable `reservations.email` is extra PII on that insert-only table (post-visit-review-email PV-9).                                                                                | `tests/integration/reservations/public-privileges.integ.test.ts` → "guest INSERT rejects server-owned reservation fields and non-guest status"; same file → "guest roles can INSERT reservations only and no authenticated full-access policy remains"; `tests/integration/security/sibling-privileges.integ.test.ts` column-privilege matrix; `tests/unit/reservations/get-range-service-client.test.ts`; `tests/integration/reservations/review-email-pii.integ.test.ts` → "anon cannot SELECT guest email on reservations" |
| BW-9                  | `nextBookableTime`; `getAvailableSlots` half-open `[start, nextBookableTime(start))` with `normalizeTime`; `validate_reservation_availability` same-date elapsed `TIME` in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `tests/unit/reservations/available-slots.test.ts` occupancy-window / 30-min grid; `tests/integration/reservations/occupancy-window.integ.test.ts`                                                                                                                                                                                                                                                                                                                                                                             |
| BW-10                 | `ACTIVE_RESERVATION_STATUSES` (`confirmed`/`seated`); trigger occupying set matches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `available-slots.test.ts` early-release; occupancy-window integ completed early-release                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| BW-11                 | `occupancy_duration_minutes` / `safety_buffer_minutes` (defaults 90/15); `clampExpectedMinutes` + `clampSafetyBufferMinutes`; floor chrome `occupancy-duration-control` / `safety-buffer-control`; `app/actions/branding.ts` getters/updaters                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `tests/unit/branding/schema.test.ts`; `tests/unit/floor/occupancy-settings.test.ts`; `operating-hours.test.ts` clamps                                                                                                                                                                                                                                                                                                                                                                                                         |
| BW-12                 | `lib/reservations/auto-assign.ts` `canSeatPartyOnTables` / `pickBestFitTable` (collapse via `toAssignableTables`; drop only `out_of_service`); `getAvailableSlots` covers AND table-fit; `validate_reservation_availability` date lock then cover-count then table-fit (BW-15); lock still classid 305 / epoch-days — last-writer identical in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql`, and the BW-15 dated forward                                                                                                                                                                                                                                                                                                                                   | `tests/unit/reservations/table-fit.test.ts`; `available-slots.test.ts` → "does not offer a slot when covers fit but no compatible table remains"; `tests/integration/reservations/table-fit.integ.test.ts`; `atomic-booking.integ.test.ts` last compatible unit                                                                                                                                                                                                                                                               |
| STAFF-LIST            | `app/actions/reservations.ts` `getReservationsByDate` — `{ reservations, error? }`; auth `Unauthorized.`; query `Could not load reservations.`; success omits `error`. `lib/reservations/list-empty-copy.ts` `staffListEmptyCopy` (error then filter flags). `ReservationsManager` unwraps `.reservations` / `.error`. `app/admin/reservations/page.tsx` SSR unwraps `{ reservations }` only                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `tests/unit/reservations/get-by-date.test.ts` → "does not present auth or query failure as a successful empty list"; `tests/unit/reservations/list-empty-copy.test.ts` → "distinguishes load error, empty date, and filter-empty copy"                                                                                                                                                                                                                                                                                        |
| RES-ISO               | `assertIsolatedHoursMutationTarget()` (zero-arg) at start of `beforeAll` and write-cleanup hooks in every `tests/integration/reservations/*.integ.test.ts`. Scan rejects an explicit-URL call. Same helper as scheduling.md §15.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `tests/unit/reservations/reservation-integ-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BW-15                 | `validate_reservation_availability` acquires `pg_advisory_xact_lock(305, epoch-days)` before occupancy cover `SUM` / `INTO v_occupying`, then table-fit — last-writer identical in baseline, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql`, and the dated `*_occupancy_cover_lock.sql` forward                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `tests/unit/reservations/occupancy-cover-lock.test.ts`; `tests/integration/reservations/occupancy-cover-lock.integ.test.ts` overlapping-window leftover race                                                                                                                                                                                                                                                                                                                                                                  |
| RES-TRIGGER-EXEC      | Immediate `REVOKE ALL ON FUNCTION public.validate_reservation_availability() FROM PUBLIC` then `FROM anon, authenticated` after every `CREATE OR REPLACE` in `00000000000000_baseline.sql`, `20260818162000_operating_hour_segments.sql`, `20260827180000_occupancy_duration_buffer.sql`, `20260828121224_table_fit_availability.sql`. Function stays `SECURITY DEFINER` with `SET search_path TO public`; `enforce_booking_rules` remains enabled. Linked `tilcqrudqxznnpepxjqq` re-run of `20260828121224` is C2 manual-UAT (`docs/runbooks/deploy.md`). RES-TRIGGER-EXEC-AUTHLESS: the named catalog `it()` lives outside `describe.skipIf(!authEnvReady)` in a dedicated describe whose `beforeAll` starts with zero-arg `assertIsolatedHoursMutationTarget()`; missing local Docker/Postgres fails rather than skips. Other sibling tests keep their gating. | `tests/integration/security/sibling-privileges.integ.test.ts` → "local reset keeps validate_reservation_availability trigger-only and denies guest EXECUTE"; `tests/unit/reservations/reservation-integ-isolation.test.ts` → "RES-TRIGGER-EXEC local catalog coverage is outside the auth environment skip and retains its local guard"                                                                                                                                                                                       |
| BD-READ-FAIL          | `app/actions/availability.ts` — `isDateBlocked`, `getBlockedDatesInMonth`, `getBlockedDatesInRange` log any non-null `blocked_dates` SELECT `error` server-side and reject with `Error("Could not load blocked dates.")`; they MUST NOT resolve `false` or `[]`. Success: `isDateBlocked` is `true` for a row and `false` for no row; list readers map ISO date strings and return `[]` only for successful null/empty data. Anon-client queries and success return types stay. Caller recovery UI is out of scope.                                                                                                                                                                                                                                                                                                                                               | `tests/unit/availability/actions.test.ts` → "blocked-date readers reject SELECT errors without changing successful results"                                                                                                                                                                                                                                                                                                                                                                                                   |

## References

- [../architecture/Reservation-Flow.md](../architecture/Reservation-Flow.md)
- [post-visit-review-email.md](./post-visit-review-email.md) (PV-9 guest email PII)
- `supabase/migrations/00000000000000_baseline.sql` — `validate_reservation_availability()`
  trigger `enforce_booking_rules` on `reservations`
- `app/actions/reservations.ts` — `getReservationsByDate`
- `lib/reservations/list-empty-copy.ts`

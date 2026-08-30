# Scheduling & floor plan

**Status:** Draft  
**Last updated:** 2026-08-28

## Scope

Staff scheduling (`app/admin/scheduling`), floor plan (`app/admin/floor`),
and `/admin` Dashboard floor-occupancy widgets (FP-11).
Operating hours and blocked dates: `operating_windows` / `blocked_dates` in
`supabase/migrations/00000000000000_baseline.sql`; default hours seeded in
`supabase/seed.sql`. Dining-room tables persist in `tables` (see FP-1).

## Acceptance criteria

1. **Table status** — Valid statuses: `available`, `seated`, `reserved`,
   `cleaning`, `out_of_service`; transitions are enforced consistently in UI
   and (when persisted) in DB.
2. **Blocked dates (staff)** — Staff blocked-date management respects service-role
   policy `Allow service_role full access to blocked_dates` in baseline migration.
   Table privileges MUST `GRANT ALL ON TABLE blocked_dates TO service_role`
   (§17), not only that RLS policy.
3. **Timezone** — Scheduling and “today” use restaurant TZ helpers in `lib/timezone.ts`.

### Live floor ↔ reservations (FP)

4. **FP-1 — Persisted floor tables** — Schema defines `tables` (`label`, `seats`,
   `status`, `x`, `y`, `shape`) with staff/service-role access. Seed loads the
   dining-room inventory so capacity checks and `/admin/floor` share the same
   rows. Status values match criterion 1.

5. **FP-2 — Auto-assign at the proper time** — A `confirmed` reservation with no
   `table_label` is auto-assigned when its **date is today** (restaurant TZ) and
   restaurant-local now is at or after **booked time minus expected turn**,
   default **90** (`DEFAULT_EXPECTED_MINUTES`). The due-check runs **before** a
   table is chosen, so the unassigned lead is the restaurant default **90** —
   not per-table expected time and not max-of-inventory. Creating or confirming
   a reservation does **not** assign a table. Past-due confirmed reservations
   today are still assigned. Future dates and terminal statuses (`completed`,
   `cancelled`, `no_show`) are never auto-assigned.

6. **FP-3 — Best-fit available table** — Auto-assign picks the **smallest**
   `available` table with `seats >= party_size`. Same-time reservations are
   assigned in **larger party first** order, then earlier `created_at`. A table
   already reserved, seated, cleaning, out of service, or claimed in the same
   batch is not reused. Staff auto-assign treats an assignable `table_label` as
   taken only when another occupying reservation (`confirmed` or `seated`) on
   the **same reservation `date`** already holds that label **and** the two
   occupying windows overlap. Occupying window is booking-rules BW-9: half-open
   `[start, start + occupancy_duration_minutes + safety_buffer_minutes)`
   (defaults 90 + 15), restaurant-wide `/admin/floor` settings, **not**
   `tables.expected_minutes`. Overlap does not span the next calendar date.
   Non-overlapping occupying windows MAY reuse the same table (lunch then
   dinner). `completed`, `cancelled`, and `no_show` do not occupy (BW-10).
   `planAutoAssignments` in-batch claims are the same windowed rule (not a
   day-wide label set). Table **status** still follows the existing FP-3
   sentence (reserved/seated/cleaning/out of service are not auto-assigned).
   If no table fits, the reservation stays unassigned. Guest widget
   bookability uses the same assignable units (existing merges collapsed; no
   speculative merge) — booking-rules BW-12.

7. **FP-4 — Live Floor Plan via hooks** — `/admin/floor` is a live view. The
   dining-room UI reads tables and today’s reservations through `useFloorPlan`
   (SWR hook, 5s refresh). Overlay: a table with a `confirmed` reservation
   displays as reserved; `seated` displays as seated; the chip shows guest,
   party size, and time. The hook runs auto-assign on each refresh so a table
   appears at the proper time without a manual dropdown. Tonight’s book helper
   copy describes auto-assign as booked time minus expected turn (default 90),
   not a 15-minute lead.

8. **FP-5 — Status stays in sync** — Seating a reservation sets its assigned
   table to `seated`. Completing, cancelling, or marking no-show clears
   `table_label` and returns a `reserved` or `seated` table to `available`.
   Staff can still assign or clear a table manually from `/admin/reservations`.
   Manual assign (`assignReservationTable` and the `/admin/reservations`
   dropdown) MUST require `seats >= party_size` (same fit as FP-3; exact fit
   allowed; **no** staff override) and MUST refuse a label whose occupying
   window overlaps another occupying reservation on that assignable label. The
   write path enforces both rules even if the UI is bypassed. Undersized tables
   MUST NOT appear in the dropdown except the reservation's currently assigned
   label. Clearing `table_label` is always allowed and skips fit/overlap.
   Closed reservations (`completed`, `cancelled`, `no_show`) stay unassignable.

9. **FP-6 — Seat capacity drives table shape** — On `/admin/floor`, **odd**
   seat capacity is depicted as a **round** table; **even** seat capacity is
   depicted as a **square** table (`tableShapeForSeats` in `lib/table-shape.ts`).
   Creating a table or changing seat capacity persists the matching shape.
   Chips stay circular or square (equal width and height); they do not stretch
   into rectangles.

10. **FP-7 — Expected time use** — Admin can set each table’s max/expected
    turn time on `/admin/floor` (`expected_minutes`, default **90**, stepped
    **15**, range **30–240**). The inspector shows and persists this value.
    Creating a table starts at 90 minutes.

11. **FP-8 — Temporary table merges** — Admin can merge two or more
    **available** tables into a temporary arrangement. On `/admin/floor`,
    **dragging one available table onto another** is the favoured merge UX
    (drop-to-merge). Dropping an available table onto an **available**
    arrangement adds it to that group. **Dragging a merged table out onto
    the floor** (or the inspector **Split tables** action) dissolves the
    arrangement. Split must **not throw a 500**; it returns `{ error }` and
    writes a dissolved `status_events` payload (`dissolved: true`, still
    JSON so it is visible to the fallback reader). Tables that are reserved, seated,
    cleaning, out of service, already merged with a different group, or
    holding a reservation overlay cannot be merged — the UI must not call
    merge in those cases. The merge server action must **not throw a 500**
    on `/admin/floor`; it returns `{ error }` for validation failures. If
    `table_merges` is missing from Postgres or the PostgREST schema cache,
    the arrangement is still persisted on `status_events` with
    `entity_type = table` (live DBs reject `table_merge` via
    `status_events_entity_type_check`) so drop-to-merge works before that
    migration is applied. Combined **seat capacity** is the
    sum of the members. Duration
    defaults to the **longest** expected time among those tables and can be
    edited on the arrangement. Unused **available** merges expire at that
    duration. Status is shared: changing Available / Reserved / Seated /
    Cleaning / Out of service on any member updates every member.
    **Available** and **Out of service** dissolve the merge; **Reserved**
    and **Seated** refresh the expected-use clock; **Cleaning** keeps the
    group. Auto-assign treats a merge as one table (primary = lowest label,
    seats = sum). A reservation on the primary overlays every member.

12. **FP-9 — Room layout and move-lock** — `/admin/floor` places each table
    on a persisted grid (`tables.x`, `tables.y`) so the canvas matches the
    dining room. Each chip has a **move-lock** (default locked) so a table
    cannot be dragged by accident. Unlocking a table lets staff drag it to
    a new cell; the new coordinates persist via `updateTableState`. Dropping an
    unlocked table on another available table still merges (FP-8). Dropping a
    merged table on an empty cell still splits. Locked tables stay put and
    are only selectable. Creating a table occupies the next free cell.

13. **Guest note on opening-hour segments** — Staff can set an optional
    **guest note** per opening-hour segment on `/admin/scheduling`. It is stored
    on `operating_windows.guest_note` and shown under that group in the guest
    widget when non-empty (blank/whitespace notes render no helper).
    `replace_operating_windows` persists the column.

14. **FP-10 — Slot interval** — `/admin/floor` exposes a restaurant-wide slot
    interval (15 / 30 / 60 minutes, default **30**) persisted on
    `restaurant_settings.slot_interval_minutes`. Guest slot generation uses
    this value (`clampSlotIntervalMinutes`). Per-table Expected time
    (`tables.expected_minutes`) stays for live-floor clocks only and does
    **not** change the guest until-badge. Restaurant-wide occupancy duration
    plus a **staff-manageable** safety buffer (booking-rules BW-9–BW-11, floor
    chrome, buffer default 15) drive guest next-bookable availability and
    MUST NOT be confused with per-table Expected time. Guest availability is
    assignment-feasible table-fit (booking-rules BW-12), not per-table
    Expected time.

15. **FP-11 — Dashboard occupancy is live floor inventory** — `/admin` Floor
    occupancy, Service is live copy, and Floor status MUST count persisted
    `tables` rows from the same live snapshot as `/admin/floor`
    (`getFloorSnapshot`). They MUST NOT use the static `TABLES` seed in
    `lib/data.ts`. Occupancy is seated-count / table-count of those snapshot
    rows; “ready for guests” is the `available` count; Floor status is a
    count per valid table status (criterion 1). Counts are physical table
    rows (merged members share status per FP-8 and each still counts). FP-4
    reservation overlay does not rewrite these Dashboard counts — persisted
    `status` is the source. Each Dashboard load re-reads the snapshot (the
    page is request-dynamic).

16. **FP-12 — Selection overlay is mobile-only** — On `/admin/floor`, the
    live canvas uses a side inspector from the `lg` breakpoint up
    (`lg:grid-cols-[1fr_300px]`, inspector `lg:block`) and a bottom Sheet
    inspector below `lg`. Selecting a table:
    - **At `lg` and above (Tailwind `lg`, 1024px):** updates the side
      inspector only. The mobile inspector Sheet MUST NOT be open. No
      `SheetOverlay` (including `backdrop-blur-xs`) may cover the floor or
      inspector. The canvas and side inspector stay readable and interactive
      (not inert / `aria-hidden` behind a dialog). This holds whenever the
      viewport is `lg` or wider, including after a resize from below `lg`.
    - **Below `lg`:** selecting a table opens the bottom Sheet inspector so
      status and reservation actions remain reachable without the side
      column.
      Hiding only the Sheet panel (`lg:hidden` on `SheetContent`) while the
      Sheet stays open does **not** satisfy this criterion.

**15. OH-SAVE — Persist opening hours via deployed RPC** — Staff **Save Changes**
on `/admin/scheduling` persists the weekly opening-hour schedule by calling
public RPC `replace_operating_windows(p_windows jsonb)`. The function MUST
exist on the deployed database (not only in repo SQL), be `GRANT EXECUTE`
to `service_role` only (not `anon` or `authenticated`), and be visible in
the PostgREST schema cache. The RPC
atomically replaces all `operating_windows` rows and MUST accept multiple
segments per weekday (`label`, `sort_order`; no `UNIQUE` on `day_of_week`).
A PostgREST schema-cache miss (PGRST202 / “Could not find the function …
in the schema cache”) is a failed invariant: save must succeed, not
surface that error.

- The RPC MUST persist **exactly** the `p_windows` payload: same cardinality,
  including **closed** rows; leftover rows (including extra Monday rows not in
  the payload) are a failed invariant. Time fields compare after the existing
  `normalizeTime` normalization; weekday + `sort_order` ordering is part of the
  expected set.
- Mutating automated coverage (snapshot, RPC replace, table insert/delete
  restore) MUST run only against **local** Supabase
  (`NEXT_PUBLIC_SUPABASE_URL` host `127.0.0.1`, `localhost`, or `[::1]`). It
  MUST fail closed — not skip — when the URL is the shared linked project
  `tilcqrudqxznnpepxjqq` (or any other non-local host). Use the existing
  `authEnvReady` / `RESTAURANT_INTEGRATION_STRICT` setup symbols **plus** this
  isolation check; do not put the guard in `createServiceClient` (staff Save
  against the linked project remains valid production).
- The isolation helper resolves an optional **explicit URL**, otherwise
  `NEXT_PUBLIC_SUPABASE_URL`. Omitted/`undefined` is the **runner pin** (same as
  `assertIsolatedHoursMutationTarget()` in hours integ `beforeAll`/`afterAll`).
  It MUST accept a local env host and MUST throw when env is missing, empty,
  invalid, or non-local (including `tilcqrudqxznnpepxjqq`).
- An **explicit URL wins** over env. Explicit empty or invalid MUST throw even
  if env is local. Explicit non-local MUST throw even if env is local.
- Unit coverage of those cases MUST stub `NEXT_PUBLIC_SUPABASE_URL` for the
  assertion. It MUST NOT treat omitted/`undefined` as “no URL” while process env
  may still hold a local URL from a prior command in the same shell.
- A PostgREST schema-cache miss on the **deployed** linked project remains a
  failed invariant, verified by **manual-UAT** (click Save Changes on
  `/admin/scheduling` against the linked project) and by applying
  `20260818162000_operating_hour_segments.sql` per
  [docs/runbooks/deploy.md](../runbooks/deploy.md) — not by mutating
  `operating_windows` on that shared project from CI.

**16. OH-PRIV — Opening-hours table writes are not a Data API staff path** —
`anon` and `authenticated` MAY `SELECT` `operating_windows` (guest widget /
public reads). They MUST NOT `INSERT`, `UPDATE`, or `DELETE` those rows.
There MUST NOT be an `authenticated` `FOR ALL` (or other write) RLS policy on
`operating_windows`. Table privileges MUST `GRANT SELECT` to `anon` and
`authenticated` and `REVOKE INSERT, UPDATE, DELETE` from those roles. Table
privileges MUST `GRANT ALL ON TABLE operating_windows TO service_role` in
`00000000000000_baseline.sql` and `20260825140000_operating_windows_privilege.sql`.
If `20260825140000` is already recorded on a remote, a new idempotent forward
file MUST carry the same `GRANT ALL` (editing an applied file does not re-run).
Staff Save stays `requireStaffUser` + `service_role` `replace_operating_windows`
(`upsertOperatingWindows`). `EXECUTE` on that RPC remains `service_role` only
(§15). Mutating automated coverage stays local-isolated (§15). Linked remote
`tilcqrudqxznnpepxjqq` MUST receive the same privilege surface via a forward
migration (do not `db push` the forked history); apply that file per
[docs/runbooks/deploy.md](../runbooks/deploy.md).

**17. EARLY-PRIV — Early-baseline tables GRANT ALL to service_role** —
`blocked_dates`, `reservations`, and `menu_items` MUST
`GRANT ALL ON TABLE <t> TO service_role` in `00000000000000_baseline.sql` and
`20260825140000_operating_windows_privilege.sql`. If `20260825140000` is
already recorded on a remote, a new idempotent forward file MUST carry the
same three `GRANT ALL` strings (editing an applied file does not re-run).
This MUST NOT drop their `authenticated` `FOR ALL` RLS policies (REAZED-299).
Anon/authenticated table privileges on these tables are specified by
PUBLIC-READ-PRIV (§18) for `blocked_dates` and by booking-rules AC-5 for
`reservations` — not frozen by this section. Linked remote
`tilcqrudqxznnpepxjqq` MUST receive the same `GRANT ALL` via that forward
file per [docs/runbooks/deploy.md](../runbooks/deploy.md).

**18. PUBLIC-READ-PRIV — Catalog tables guests read via the anon Data API** —
`blocked_dates` MUST `GRANT SELECT ON TABLE blocked_dates TO anon, authenticated`
and
`REVOKE INSERT, UPDATE, DELETE ON TABLE blocked_dates FROM anon, authenticated`
in `00000000000000_baseline.sql`, `20260825140000_operating_windows_privilege.sql`,
and `20260827160000_public_catalog_privileges.sql`. Public SELECT RLS stays.
Authenticated `FOR ALL` stays (REAZED-299). `menu_items` uses the same
GRANT/REVOKE strings (menu-availability AC-2) in those same three files. This
MUST NOT `GRANT SELECT ON TABLE reservations`. If `20260825140000` is already
recorded on a remote, the new dated file MUST carry the GRANT/REVOKE (editing
an applied file does not re-run). Linked remote `tilcqrudqxznnpepxjqq` receives
that forward file per [docs/runbooks/deploy.md](../runbooks/deploy.md).
Linked-remote apply is manual-UAT.

## Implementation trace (non-normative)

| Criterion              | Shipped in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Tests                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest note (§13)       | `operating_windows.guest_note` — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260818162000_operating_hour_segments.sql`; `components/staff/scheduling-manager.tsx`; `app/actions/availability.ts` (`WINDOW_COLUMNS`, `replace_operating_windows`)                                                                                                                                                                                                                                                                                                                                                   | `tests/unit/scheduling/schema.test.ts`, `tests/unit/availability/actions.test.ts`                                                                                                                                                                       |
| FP-10                  | `restaurant_settings.slot_interval_minutes` plus occupancy/buffer columns (`occupancy_duration_minutes` default 90, `safety_buffer_minutes` default 15) — baseline + `20260823130000_restaurant_info_and_chefs_picks.sql` + `20260827180000_occupancy_duration_buffer.sql`; `app/actions/branding.ts` (`getSlotIntervalMinutes`, `getOccupancyDurationMinutes`, `getSafetyBufferMinutes` + updaters); floor chrome `occupancy-duration-control` / `safety-buffer-control` (not per-table Expected time). Guest slot availability is assignment-feasible table-fit (`canSeatPartyOnTables` / BW-12), not per-table Expected time. | `tests/unit/branding/schema.test.ts`, `tests/unit/floor/slot-interval.test.ts`, `tests/unit/floor/occupancy-settings.test.ts`; `tests/unit/reservations/available-slots.test.ts` table-fit                                                              |
| FP-11                  | `app/admin/page.tsx` (`AdminDashboardPage`) — `getFloorSnapshot` + `countFloorOccupancy(snapshot.tables)`; helper `lib/floor/table-use.ts`; page is `dynamic = "force-dynamic"`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `tests/unit/floor/dashboard-occupancy.test.ts`                                                                                                                                                                                                          |
| FP-12                  | `lib/floor/layout.ts` — `FLOOR_LG_MIN_PX` (1024), `shouldOpenMobileInspector`; `components/staff/floor-plan.tsx` `selectTable` calls the helper and `setMobileInspectorOpen(true)` only below `lg`; resize listener closes the Sheet at `lg+`; desktop side inspector remains `lg:block`; mobile `<Sheet open={mobileInspectorOpen}>` / `SheetContent side="bottom"` `lg:hidden`. Shared `components/ui/sheet.tsx` unchanged.                                                                                                                                                                                                    | `tests/unit/floor/schema.test.ts` → "selecting a table at lg does not open the mobile inspector Sheet"; "selecting a table below lg opens the bottom Sheet inspector"                                                                                   |
| OH-SAVE (§15)          | `replace_operating_windows(p_windows jsonb)` — `supabase/migrations/20260818162000_operating_hour_segments.sql` applied on linked remote `tilcqrudqxznnpepxjqq` (version recorded; `DELETE … WHERE TRUE`; `GRANT EXECUTE` to `service_role`; `NOTIFY pgrst, 'reload schema'`); `app/actions/availability.ts` `upsertOperatingWindows`. Mutating pin is **local isolated**; unit pin stubs `NEXT_PUBLIC_SUPABASE_URL` (omitted follows env; explicit URL wins; helper `url ?? process.env.NEXT_PUBLIC_SUPABASE_URL` unchanged); linked-remote apply stays runbook + manual-UAT.                                                   | `tests/unit/scheduling/hours-mutation-target.test.ts` → "omitted url follows env; explicit url wins even when env is local"; `tests/integration/scheduling/replace-operating-windows.integ.test.ts` (local only)                                        |
| OH-PRIV (§16)          | `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` for `anon, authenticated`; `GRANT ALL ON TABLE operating_windows TO service_role`; and `DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows"` (no `CREATE`) — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql` (`NOTIFY pgrst, 'reload schema'`). Staff Save remains `service_role` `replace_operating_windows` (§15). Linked-remote apply stays runbook + manual-UAT.                                                                                                           | `tests/unit/scheduling/schema.test.ts` → "operating_windows grants ALL to service_role in baseline and privilege forward files"; `tests/integration/scheduling/replace-operating-windows.integ.test.ts` (authenticated Data API DML denial, local only) |
| EARLY-PRIV (§17)       | `GRANT ALL ON TABLE blocked_dates TO service_role`, same for `reservations` and `menu_items` — `supabase/migrations/00000000000000_baseline.sql` (after each table's service_role RLS block, `-- REAZED-297`); `supabase/migrations/20260825140000_operating_windows_privilege.sql` (before `NOTIFY pgrst`; header names the siblings). Authenticated `FOR ALL` on those tables is kept. Anon/authenticated privileges: PUBLIC-READ-PRIV (§18) for `blocked_dates`; booking-rules AC-5 for `reservations`; menu-availability AC-2 for `menu_items`. Linked-remote apply stays runbook + manual-UAT.                              | `tests/unit/scheduling/schema.test.ts` → "early-baseline tables grant ALL to service_role in baseline and privilege forward files"                                                                                                                      |
| PUBLIC-READ-PRIV (§18) | `GRANT SELECT` / `REVOKE INSERT, UPDATE, DELETE` for `anon, authenticated` on `blocked_dates` (same strings for `menu_items`, menu-availability AC-2) — `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations/20260825140000_operating_windows_privilege.sql`, `supabase/migrations/20260827160000_public_catalog_privileges.sql` (`NOTIFY pgrst, 'reload schema'`). Must not `GRANT SELECT ON TABLE reservations` (booking-rules AC-5). Linked-remote apply stays runbook + manual-UAT.                                                                                                                       | `tests/integration/reservations/public-privileges.integ.test.ts` → "anon can SELECT blocked_dates and cannot INSERT"; "anon can SELECT menu_items and cannot INSERT"                                                                                    |
| FP-2                   | `lib/reservations/auto-assign.ts` — `TABLE_ASSIGNMENT_LEAD_MINUTES` aliases `DEFAULT_EXPECTED_MINUTES` (90); due-check is booked time minus expected turn **before** a table is chosen; confirm/create does not assign                                                                                                                                                                                                                                                                                                                                                                                                           | `tests/unit/reservations/auto-assign.test.ts` → "is due once the lead window opens"; "is not due before the lead window"; `planAutoAssignments` "assigns due reservations and leaves future ones unassigned"                                            |
| FP-4 helper copy       | `components/staff/floor-plan.tsx` — Tonight’s book helper: booked time minus expected turn (default 90), not a 15-minute lead                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `tests/unit/floor/schema.test.ts` → "Tonight’s book copy uses expected-turn lead default 90"                                                                                                                                                            |
| FP-3 occupancy-window  | `lib/reservations/auto-assign.ts` — `occupyingWindowMinutes` (BW-9 via `nextBookableTime`; wrap `endMin <= startMin` → 24:00), `occupyingWindowsOverlap`; `planAutoAssignments` seeds same-date `confirmed`/`seated` claims and takes a label only when windows overlap (defaults 90+15). Guest bookability uses the same assignable units via `canSeatPartyOnTables` (existing staff merges collapsed; no speculative merge) — BW-12.                                                                                                                                                                                           | `tests/unit/reservations/auto-assign.test.ts` → "reuses a table when occupying windows do not overlap and refuses when they do"; `tests/unit/reservations/table-fit.test.ts`                                                                            |
| FP-5                   | `app/actions/reservations.ts` `assignReservationTable` — `select("label, seats")`; `if (table && table.seats < party_size)` before overlap; unassign is a null table; live `restaurant_settings` → occupying window. Dropdown: `selectableTablesForAssignment` (`lib/reservations/selectable-tables.ts`) in `TableAssignment`                                                                                                                                                                                                                                                                                                    | `tests/unit/reservations/assign-table.test.ts` overlap + undersize; `tests/unit/reservations/selectable-tables.test.ts` → "omits undersize tables except the reservation current label"                                                                 |

## References

- [../architecture/Floor-Plan.md](../architecture/Floor-Plan.md)
- [../runbooks/deploy.md](../runbooks/deploy.md) (linked remote apply of `20260818162000_operating_hour_segments`, `20260825140000_operating_windows_privilege`, `20260827160000_public_catalog_privileges`, `20260827180000_occupancy_duration_buffer`, and `20260828121224_table_fit_availability`)
- [../testing/Vitest-Integration-Guide.md](../testing/Vitest-Integration-Guide.md)
- `lib/floor/layout.ts`
- `lib/floor/table-use.ts`
- `lib/reservations/auto-assign.ts`
- `lib/reservations/selectable-tables.ts`
- `app/actions/reservations.ts`
- `hooks/use-floor-plan.ts`
- `components/staff/floor-plan.tsx`
- `components/staff/reservations-manager.tsx`
- `app/admin/page.tsx`
- `app/admin/floor/page.tsx`

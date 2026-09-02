# Floor plan & table status

**Status:** Reference  
**Last updated:** 2026-09-02

Summary — criteria in [../specs/scheduling.md](../specs/scheduling.md).

Table statuses: `available` | `reserved` | `seated` | `cleaning` | `out_of_service`
(see `lib/data.ts`). Transitions are enforced in `app/actions/operations.ts`.

Each table has an admin-managed **expected turn time** (`tables.expected_minutes`,
default 90). Restaurant-wide occupancy duration and safety buffer (guest
next-bookable; [../specs/booking-rules.md](../specs/booking-rules.md) BW-9–BW-11)
sit in the same `/admin/floor` chrome as slot interval
(`occupancy-duration-control`, `safety-buffer-control`); they are not per-table
Expected time. Temporary **merges** (`table_merges` / `table_merge_members`) add up
member seat capacity and last that expected time by default. Status changes apply
to every member; Available and Out of service dissolve the arrangement. On
`/admin/floor`, staff merge by **dropping an available table onto another**
(`lib/floor/merge-drop.ts`); an available table dropped onto an available
arrangement is added to that group. `mergeTables` returns `{ error }` instead
of throwing (a throw became a 500 on the floor POST). If `table_merges` is
not in the database yet, the arrangement is stored on `status_events` as
`entity_type = table` (`status_events_entity_type_check` rejects `table_merge`).
Split (inspector button or drag a member onto the floor) writes a dissolved
JSON event so the fallback reader drops the arrangement.

Tables sit on a persisted grid (`tables.x`, `tables.y`). `/admin/floor`
renders that grid as a canvas (`lib/floor/layout.ts`). Each chip has a
**move-lock** (default locked) so a click does not drag. Unlocking a table
lets staff drag it to a new cell; coordinates persist through
`updateTableState`. Dropping an unlocked available table on another still
merges (FP-8). New tables take the next free cell.

UI: `components/staff/floor-plan.tsx`, `app/admin/floor/page.tsx`,
`hooks/use-floor-plan.ts`. From `lg` (1024px) up, table selection updates the
side inspector (`lg:block`); the mobile bottom Sheet MUST NOT be open on
desktop selection (FP-12). Inventory is persisted in Postgres (`tables`), not
mock-only. `/admin` Dashboard occupancy widgets (Floor occupancy, Service is
live, Floor status) read the same live `tables` snapshot as `/admin/floor`
(`getFloorSnapshot` + `countFloorOccupancy` in `app/admin/page.tsx`), not the
static `TABLES` seed in `lib/data.ts`. `/pos`'s Table picker lists live
`getTables()` rows via `app/pos/page.tsx` (`dynamic = "force-dynamic"`) into
`PosTerminal` `tables`, also not `TABLES`. The Server picker lists live
`getServers()` rows (`servers` in baseline + seed; not a `lib/data.ts`
`SERVERS` constant) in the same `Promise.all`. When `tables` or `servers` is
empty, that `Select` is `disabled` with `value={… || undefined}` and a
placeholder (`No tables available` / `No servers available`). Occupancy-duration
and safety-buffer chrome on `/admin/floor` take an `isSuperAdmin` prop (SA-10);
slot-interval stays ungated in chrome. Operating hours: `operating_windows` in
`supabase/migrations/00000000000000_baseline.sql`.

# Floor plan & table status

**Status:** Reference  
**Last updated:** 2026-08-18

Summary — criteria in [../specs/scheduling.md](../specs/scheduling.md).

Table statuses: `available` | `reserved` | `seated` | `cleaning` | `out_of_service`
(see `lib/data.ts`). Transitions are enforced in `app/actions/operations.ts`.

Each table has an admin-managed **expected turn time** (`tables.expected_minutes`,
default 90). Temporary **merges** (`table_merges` / `table_merge_members`) add up
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
`hooks/use-floor-plan.ts`. Inventory is persisted in Postgres (`tables`), not
mock-only. Operating hours: `operating_windows` in
`supabase/migrations/00000000000000_baseline.sql`.

# Floor plan & table status

**Status:** Reference  
**Last updated:** 2026-08-18

Summary — criteria in [../specs/scheduling.md](../specs/scheduling.md).

Table statuses: `available` | `reserved` | `seated` | `cleaning` | `out_of_service`
(see `lib/data.ts`). Transitions are enforced in `app/actions/operations.ts`.

Each table has an admin-managed **expected turn time** (`tables.expected_minutes`,
default 90). Temporary **merges** (`table_merges` / `table_merge_members`) add up
member seat capacity and last that expected time by default. Status changes apply
to every member; Available and Out of service dissolve the arrangement.

UI: `components/staff/floor-plan.tsx`, `app/admin/floor/page.tsx`,
`hooks/use-floor-plan.ts`. Inventory is persisted in Postgres (`tables`), not
mock-only. Operating hours: `operating_windows` in
`supabase/migrations/00000000000000_baseline.sql`.

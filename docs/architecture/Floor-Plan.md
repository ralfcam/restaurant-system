# Floor plan & table status

**Status:** Reference  
**Last updated:** 2026-06-27

Summary — criteria in [../specs/scheduling.md](../specs/scheduling.md).

Table statuses: `available` | `seated` | `reserved` | `cleaning` (see `lib/data.ts`).

UI: `components/staff/floor-plan.tsx`, `app/admin/floor/page.tsx`.

Table layout and status transitions are mock data in `lib/data.ts` (not persisted in
Postgres). Operating hours for scheduling context: `operating_windows` in
`supabase/migrations/00000000000000_baseline.sql`.

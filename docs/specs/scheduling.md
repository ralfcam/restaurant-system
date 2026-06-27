# Scheduling & floor plan

**Status:** Draft  
**Last updated:** 2026-06-27

## Scope

Staff scheduling (`app/admin/scheduling`), floor plan (`app/admin/floor`).
Operating hours and blocked dates: `operating_windows` / `blocked_dates` in
`supabase/migrations/00000000000000_baseline.sql`; default hours seeded in
`supabase/seed.sql`. Table status model remains mock data in `lib/data.ts` (no floor
tables in baseline yet).

## Acceptance criteria

_(Expand during first `/sdd-to-tdd` run.)_

1. **Table status** — Valid statuses: `available`, `seated`, `reserved`, `cleaning`;
   transitions are enforced consistently in UI and (when persisted) in DB.
2. **Blocked dates (staff)** — Staff blocked-date management respects service-role
   policy `Allow service_role full access to blocked_dates` in baseline migration.
3. **Timezone** — Scheduling and “today” use restaurant TZ helpers in `lib/timezone.ts`.

## References

- [../architecture/Floor-Plan.md](../architecture/Floor-Plan.md)

# Scheduling & floor plan

**Status:** Draft  
**Last updated:** 2026-08-18

## Scope

Staff scheduling (`app/admin/scheduling`), floor plan (`app/admin/floor`).
Operating hours and blocked dates: `operating_windows` / `blocked_dates` in
`supabase/migrations/00000000000000_baseline.sql`; default hours seeded in
`supabase/seed.sql`. Dining-room tables persist in `tables` (see FP-1).

## Acceptance criteria

1. **Table status** — Valid statuses: `available`, `seated`, `reserved`,
   `cleaning`, `out_of_service`; transitions are enforced consistently in UI
   and (when persisted) in DB.
2. **Blocked dates (staff)** — Staff blocked-date management respects service-role
   policy `Allow service_role full access to blocked_dates` in baseline migration.
3. **Timezone** — Scheduling and “today” use restaurant TZ helpers in `lib/timezone.ts`.

### Live floor ↔ reservations (FP)

4. **FP-1 — Persisted floor tables** — Schema defines `tables` (`label`, `seats`,
   `status`, `x`, `y`, `shape`) with staff/service-role access. Seed loads the
   dining-room inventory so capacity checks and `/admin/floor` share the same
   rows. Status values match criterion 1.

5. **FP-2 — Auto-assign at the proper time** — A `confirmed` reservation with no
   `table_label` is auto-assigned when its **date is today** (restaurant TZ) and
   restaurant-local now is at or after **15 minutes before** the booked time
   (`TABLE_ASSIGNMENT_LEAD_MINUTES`). Past-due confirmed reservations today are
   still assigned. Future dates and terminal statuses
   (`completed`, `cancelled`, `no_show`) are never auto-assigned.

6. **FP-3 — Best-fit available table** — Auto-assign picks the **smallest**
   `available` table with `seats >= party_size`. Same-time reservations are
   assigned in **larger party first** order, then earlier `created_at`. A table
   already reserved, seated, cleaning, out of service, or claimed in the same
   batch is not reused. If no table fits, the reservation stays unassigned.

7. **FP-4 — Live Floor Plan via hooks** — `/admin/floor` is a live view. The
   dining-room UI reads tables and today’s reservations through `useFloorPlan`
   (SWR hook, 5s refresh). Overlay: a table with a `confirmed` reservation
   displays as reserved; `seated` displays as seated; the chip shows guest,
   party size, and time. The hook runs auto-assign on each refresh so a table
   appears at the proper time without a manual dropdown.

8. **FP-5 — Status stays in sync** — Seating a reservation sets its assigned
   table to `seated`. Completing, cancelling, or marking no-show clears
   `table_label` and returns a `reserved` or `seated` table to `available`.
   Staff can still assign or clear a table manually from `/admin/reservations`.

9. **FP-6 — Seat capacity drives table shape** — On `/admin/floor`, **odd**
   seat capacity is depicted as a **round** table; **even** seat capacity is
   depicted as a **square** table (`tableShapeForSeats` in `lib/table-shape.ts`).
   Creating a table or changing seat capacity persists the matching shape.
   Chips stay circular or square (equal width and height); they do not stretch
   into rectangles.

## References

- [../architecture/Floor-Plan.md](../architecture/Floor-Plan.md)
- `lib/reservations/auto-assign.ts`
- `hooks/use-floor-plan.ts`
- `components/staff/floor-plan.tsx`
- `app/admin/floor/page.tsx`

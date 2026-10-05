# Restaurant cover capacity

**Status:** Draft
**Last updated:** 2026-10-05

## Scope

Staff on `/admin/floor` can set a restaurant-wide maximum cover capacity. The value is `restaurant_settings.max_cover_capacity` on the settings row `id = 1`, a nullable integer. Null means unset. The action uses `requireStaffUser` and the service-role client, the same gate as floor-table edits. Any staff session that can edit floor tables can set or clear it, including `super_admin`. A guest cannot write it. An already-baselined remote gains the column from `supabase/migrations/20261004161500_max_cover_capacity.sql`, because editing an applied baseline does not re-run. The authoritative ceiling check runs in the same database transaction as the write and takes `pg_advisory_xact_lock(69, 1)` before reading the seat total.

The total being capped is `sum(tables.seats)`. While the column is null, creating a table or raising a table's seats is refused, and the floor prompts staff to set the maximum. A set value must be an integer of at least 1. Saving a value below the current sum is refused and leaves tables unchanged. Saving a value equal to the current sum is allowed, and then no further seats can be added. When a value is set, `createTable` and a seat increase through `updateTableState` are refused when the resulting sum would exceed it, even if the floor UI is bypassed. Lowering seats and `deleteTable` stay allowed and both reduce the sum. Clearing the column back to null is allowed, and then creates and seat increases are refused again until it is set.

Per-table seats stay in 1–12. Booking occupancy stays `sum(tables.seats)` ([booking-rules.md](./booking-rules.md) BW-9). Per-slot and per-service `max_covers` stay ([scheduling.md](./scheduling.md) CL-2 and CL-3).

Out of this spec: a change to the booking-occupancy formula, a change to slot or service cover limits, automatically removing seats to fit a lower maximum, and a guest-facing control.

## Acceptance criteria

1. **CC-1 — Staff gate.** Setting and clearing `max_cover_capacity` uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot change it. A `super_admin` session can. The control lives on `/admin/floor` with `data-testid="floor-max-cover-capacity"`.

2. **CC-2 — Nullable ceiling.** The settings row `id = 1` stores `max_cover_capacity` as a nullable integer. Null is unset. A guest cannot write the column.

3. **CC-3 — Unset blocks growth.** While the column is null, `createTable` and a seat increase through `updateTableState` write nothing. The floor shows a prompt with `data-testid="floor-max-cover-prompt"`. Lowering seats and `deleteTable` still succeed.

4. **CC-4 — Integer of at least 1.** `0`, a negative, a fraction, and a non-number are refused. The stored value is unchanged.

5. **CC-5 — Not below the current sum.** Saving a maximum below `sum(tables.seats)` is refused. Tables and the stored maximum are unchanged. Saving a maximum equal to that sum succeeds.

6. **CC-6 — Write path.** When a maximum is set, `createTable` or a seat increase whose resulting sum would exceed it writes nothing, even if the floor UI is bypassed. The refusal tells staff that the restaurant's maximum cover capacity has been reached. A change whose resulting sum is on or under the maximum succeeds. When the sum already equals the maximum, no additional seat can be created.

7. **CC-7 — Shrink stays allowed.** Lowering a table's seats and `deleteTable` succeed while a maximum is set. The new sum is the previous sum minus the removed seats.

8. **CC-8 — Clear.** Setting the column back to null succeeds. After that, `createTable` and seat increases write nothing until a maximum is set again.

9. **CC-9 — Neighbor rules stay.** `updateTableState` still keeps seats in 1–12. Booking occupancy still uses `sum(tables.seats)` (BW-9). Per-slot and per-service `max_covers` (CL-2, CL-3) are unchanged.

10. **CC-10 — Forward column.** `supabase/migrations/20261004161500_max_cover_capacity.sql` adds `restaurant_settings.max_cover_capacity` as a nullable integer and the same check (`max_cover_capacity IS NULL OR max_cover_capacity >= 1`). The column add is `ADD COLUMN IF NOT EXISTS`. The check is added only when that constraint is missing. The baseline keeps the same nullable column and check.

11. **CC-11 — One locked capacity write.** A failed read of table seats writes nothing. `createTable` throws `errors.floor.addTableFailed` and does not insert. A seat increase through `updateTableState` throws `errors.floor.updateTableFailed` and does not update. `public.enforce_cover_capacity()` calls `pg_advisory_xact_lock(69, 1)` before it reads the seat total. A `BEFORE INSERT OR UPDATE OF seats` trigger on `tables` and a `BEFORE INSERT OR UPDATE OF max_cover_capacity` trigger on `restaurant_settings` both execute that function. A seat decrease and `DELETE` do not raise from it. The same function, both triggers, and `REVOKE` of `EXECUTE` from `PUBLIC`, `anon`, and `authenticated` are in the baseline and in `supabase/migrations/20261004161500_max_cover_capacity.sql`.

12. **CC-12 — Seed ceiling before dining-room tables.** `supabase/seed.sql` sets `restaurant_settings.max_cover_capacity` for `id = 1` to an integer equal to the sum of `seats` in that file's dining-room `INSERT INTO tables` values, and that statement runs before the table insert. When the row already exists with a null ceiling, the seed still writes the ceiling. A later seed run does not change a ceiling that is already non-null.

13. **CC-13 — A failed capacity read is not an unset ceiling.** When the `restaurant_settings.max_cover_capacity` read returns a PostgREST error, `createTable` throws `errors.floor.addTableFailed` and does not insert. A seat change through `updateTableState` throws `errors.floor.updateTableFailed` and does not update. The read does not return null for that error.

## Implementation trace (non-normative)

FIX `seed_cover_ceiling_c4e8` (RES-138, 2026-10-05). CC-12 shipped. `supabase/seed.sql` sets `restaurant_settings.max_cover_capacity` for `id = 1` to `38` (the dining-room `INSERT INTO tables` seat sum) before that insert. `ON CONFLICT (id) DO UPDATE` sets `max_cover_capacity` only `WHERE restaurant_settings.max_cover_capacity IS NULL`.

FIX `res138_cc13_baseline_e7c2` (RES-138, 2026-10-05). CC-13 shipped. `readMaxCoverCapacity` throws the caller's floor failure key when PostgREST returns an error. `createTable` and `getMaxCoverCapacity` pass `errors.floor.addTableFailed`. A seat change through `updateTableState` passes `errors.floor.updateTableFailed`. The read does not return null for that error.

-- RES-133: a walk-in overlap check in TypeScript commits before the insert.
-- validate_reservation_availability locks cover totals for the date, not
-- per-label windows. This BEFORE INSERT trigger takes a per-label lock and
-- refuses a second confirmed/seated row whose occupying window overlaps.

CREATE OR REPLACE FUNCTION reject_overlapping_table_label()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_occupancy_minutes INT;
  v_buffer_minutes INT;
  v_window INTERVAL;
  v_conflict BOOLEAN;
BEGIN
  IF NEW.table_label IS NULL OR NEW.status NOT IN ('confirmed', 'seated') THEN
    RETURN NEW;
  END IF;

  -- classid 133 = RES-133. Held until commit so the next insert sees this row.
  PERFORM pg_advisory_xact_lock(
    133,
    hashtext(NEW.table_label || '|' || (NEW.date::DATE)::TEXT)
  );

  SELECT occupancy_duration_minutes, safety_buffer_minutes
    INTO v_occupancy_minutes, v_buffer_minutes
    FROM restaurant_settings
   WHERE id = 1;

  v_occupancy_minutes := COALESCE(v_occupancy_minutes, 90);
  v_buffer_minutes := COALESCE(v_buffer_minutes, 15);
  v_window := (v_occupancy_minutes + v_buffer_minutes) * INTERVAL '1 minute';

  SELECT EXISTS (
    SELECT 1
      FROM reservations r
     WHERE r.date = NEW.date::DATE
       AND r.table_label = NEW.table_label
       AND r.status IN ('confirmed', 'seated')
       AND r.id IS DISTINCT FROM NEW.id
       AND (
            (NEW.time::TIME >= r.time::TIME
             AND (NEW.time::TIME - r.time::TIME) < v_window)
         OR (r.time::TIME >= NEW.time::TIME
             AND (r.time::TIME - NEW.time::TIME) < v_window)
       )
  ) INTO v_conflict;

  IF v_conflict THEN
    RAISE EXCEPTION 'That table is already reserved for an overlapping time.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_overlapping_table_label() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_overlapping_table_label() FROM anon, authenticated;

DROP TRIGGER IF EXISTS reject_overlapping_table_label ON reservations;

CREATE TRIGGER reject_overlapping_table_label
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION reject_overlapping_table_label();

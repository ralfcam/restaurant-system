-- =============================================================
-- Migration: enforce_booking_rules
-- Creates a BEFORE INSERT OR UPDATE trigger on `reservations`
-- that strictly enforces blocked dates and operating hours at
-- the database level. Idempotent — safe to re-run.
-- =============================================================

-- ── Validation function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION validate_reservation_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_window RECORD;
BEGIN
  -- 1. Blocked date check
  IF EXISTS (
    SELECT 1
    FROM blocked_dates
    WHERE blocked_date = NEW.date::DATE
  ) THEN
    RAISE EXCEPTION 'Booking denied: Date is explicitly blocked.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Operating hours check
  --    EXTRACT(DOW ...) returns 0=Sunday … 6=Saturday, matching the schema.
  SELECT *
    INTO v_window
    FROM operating_windows
   WHERE day_of_week = EXTRACT(DOW FROM NEW.date::DATE)::INT
   LIMIT 1;

  IF FOUND THEN
    -- Day exists in the schedule — enforce closed flag and time bounds
    IF v_window.is_closed THEN
      RAISE EXCEPTION 'Booking denied: Restaurant is closed on this day.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NEW.time::TIME < v_window.opens_at::TIME OR
       NEW.time::TIME > v_window.closes_at::TIME THEN
      RAISE EXCEPTION 'Booking denied: Outside operating hours.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  -- If no operating_windows row exists for that DOW the trigger is
  -- permissive — the application-layer defaults remain in force.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Trigger assignment ───────────────────────────────────────
-- Drop first so re-runs are clean (OR REPLACE is not supported for triggers).
DROP TRIGGER IF EXISTS enforce_booking_rules ON reservations;

CREATE TRIGGER enforce_booking_rules
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION validate_reservation_availability();

-- Forward migration for already-applied 20260823130000 (linked/remote).
-- Same columns are also defined idempotently in 00000000000000_baseline.sql
-- and 20260823130000_restaurant_info_and_chefs_picks.sql so
-- `supabase db reset --local` stays equivalent.
--
-- REAZED-309: occupancy duration (default 90) + safety buffer (default 15)
-- with CHECKs matching BW-11 clamps. New dated file because remotes have
-- already recorded earlier migrations; folding alone would not apply.

ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS occupancy_duration_minutes INT NOT NULL DEFAULT 90;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS safety_buffer_minutes INT NOT NULL DEFAULT 15;

DO $$
BEGIN
  ALTER TABLE public.restaurant_settings
    ADD CONSTRAINT restaurant_settings_occupancy_duration_minutes_check
    CHECK (
      occupancy_duration_minutes BETWEEN 30 AND 240
      AND occupancy_duration_minutes % 15 = 0
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.restaurant_settings
    ADD CONSTRAINT restaurant_settings_safety_buffer_minutes_check
    CHECK (
      safety_buffer_minutes BETWEEN 0 AND 60
      AND safety_buffer_minutes % 5 = 0
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.restaurant_settings.occupancy_duration_minutes IS
  'Restaurant-wide occupancy duration in minutes. 30–240 step 15; default 90.';
COMMENT ON COLUMN public.restaurant_settings.safety_buffer_minutes IS
  'Restaurant-wide safety buffer in minutes after occupancy. 0–60 step 5; default 15.';

-- Last-writer on remotes that already recorded earlier function definitions.
-- Same body as baseline / 20260818162000 so `db reset --local` stays equivalent.
CREATE OR REPLACE FUNCTION validate_reservation_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_dow INT;
  v_has_rows BOOLEAN;
  v_has_open BOOLEAN;
  v_in_segment BOOLEAN;
  v_occupancy_minutes INT;
  v_buffer_minutes INT;
  v_capacity INT;
  v_occupying INT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM blocked_dates
    WHERE date = NEW.date::DATE
  ) THEN
    RAISE EXCEPTION 'Booking denied: Date is explicitly blocked.'
      USING ERRCODE = 'P0001';
  END IF;

  v_dow := EXTRACT(DOW FROM NEW.date::DATE)::INT;

  SELECT EXISTS (
    SELECT 1 FROM operating_windows WHERE day_of_week = v_dow
  ) INTO v_has_rows;

  -- No rows for this weekday: fail open (legacy / unseeded).
  IF v_has_rows THEN
    SELECT EXISTS (
      SELECT 1
        FROM operating_windows
       WHERE day_of_week = v_dow
         AND is_closed = false
    ) INTO v_has_open;

    IF NOT v_has_open THEN
      RAISE EXCEPTION 'Booking denied: Restaurant is closed on this day.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
      SELECT 1
        FROM operating_windows
       WHERE day_of_week = v_dow
         AND is_closed = false
         AND NEW.time::TIME >= opens_at::TIME
         AND NEW.time::TIME <= closes_at::TIME
    ) INTO v_in_segment;

    IF NOT v_in_segment THEN
      RAISE EXCEPTION 'Booking denied: Outside operating hours.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- REAZED-309: BW-9 occupancy window + BW-10 early-release.
  -- DEFINER so anon INSERT can cover-count reservations/tables (no public SELECT).
  -- Identical occupancy block in baseline / 20260818162000 / 20260827180000.
  IF NEW.status IN ('confirmed', 'seated') THEN
    SELECT occupancy_duration_minutes, safety_buffer_minutes
      INTO v_occupancy_minutes, v_buffer_minutes
      FROM restaurant_settings
     WHERE id = 1;
    -- SELECT INTO NULLs both when id=1 is missing; columns themselves are NOT NULL.
    v_occupancy_minutes := COALESCE(v_occupancy_minutes, 90);
    v_buffer_minutes := COALESCE(v_buffer_minutes, 15);

    SELECT COALESCE(SUM(seats), 0) INTO v_capacity FROM tables;

    -- Same-date elapsed TIME (half-open). Do not add interval to TIME (wraps at 24h).
    SELECT COALESCE(SUM(r.party_size), 0)
      INTO v_occupying
      FROM reservations r
     WHERE r.date = NEW.date::DATE
       AND r.status IN ('confirmed', 'seated')
       AND r.id IS DISTINCT FROM NEW.id
       AND NEW.time::TIME >= r.time::TIME
       AND (NEW.time::TIME - r.time::TIME)
             < (v_occupancy_minutes + v_buffer_minutes) * INTERVAL '1 minute';

    IF v_occupying + NEW.party_size > v_capacity THEN
      RAISE EXCEPTION 'Booking denied: This time is fully booked.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

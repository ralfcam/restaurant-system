-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.
--
-- Opening-hour segments: multiple operating_windows rows per weekday.

ALTER TABLE operating_windows
  DROP CONSTRAINT IF EXISTS operating_windows_day_of_week_key;

ALTER TABLE operating_windows
  ADD COLUMN IF NOT EXISTS label TEXT;

ALTER TABLE operating_windows
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Optional guest-facing helper for this segment; blank/whitespace stored as NULL.
ALTER TABLE operating_windows
  ADD COLUMN IF NOT EXISTS guest_note TEXT;

CREATE OR REPLACE FUNCTION validate_reservation_availability()
RETURNS TRIGGER AS $$
DECLARE
  v_dow INT;
  v_has_rows BOOLEAN;
  v_has_open BOOLEAN;
  v_in_segment BOOLEAN;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atomic replace of the full weekly opening-hour schedule (staff / service role).
-- Maps optional guest_note with NULLIF(BTRIM(...)) so blank/whitespace becomes NULL.
CREATE OR REPLACE FUNCTION replace_operating_windows(p_windows jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- WHERE TRUE satisfies hosted safe-delete (error 21000 without a predicate).
  DELETE FROM operating_windows WHERE TRUE;

  INSERT INTO operating_windows (
    day_of_week, opens_at, closes_at, is_closed, label, sort_order, guest_note
  )
  SELECT
    (w->>'day_of_week')::INT,
    (w->>'opens_at')::TIME,
    (w->>'closes_at')::TIME,
    COALESCE((w->>'is_closed')::BOOLEAN, false),
    NULLIF(BTRIM(w->>'label'), ''),
    COALESCE((w->>'sort_order')::INT, 0),
    NULLIF(BTRIM(w->>'guest_note'), '')
  FROM jsonb_array_elements(p_windows) AS w;
END;
$$;

REVOKE ALL ON FUNCTION replace_operating_windows(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION replace_operating_windows(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION replace_operating_windows(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

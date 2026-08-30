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
  v_window INTERVAL;
  v_pick TEXT;
  v_taken TEXT[] := ARRAY[]::TEXT[];
  rec RECORD;
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
    v_window := (v_occupancy_minutes + v_buffer_minutes) * INTERVAL '1 minute';

    SELECT COALESCE(SUM(seats), 0) INTO v_capacity FROM tables;

    -- Same-date elapsed TIME (half-open). Do not add interval to TIME (wraps at 24h).
    SELECT COALESCE(SUM(r.party_size), 0)
      INTO v_occupying
      FROM reservations r
     WHERE r.date = NEW.date::DATE
       AND r.status IN ('confirmed', 'seated')
       AND r.id IS DISTINCT FROM NEW.id
       AND NEW.time::TIME >= r.time::TIME
       AND (NEW.time::TIME - r.time::TIME) < v_window;

    IF v_occupying + NEW.party_size > v_capacity THEN
      RAISE EXCEPTION 'Booking denied: This time is fully booked.'
        USING ERRCODE = 'P0001';
    END IF;

    -- REAZED-305: BW-12 table-fit after cover-count (same P0001 as BW-9).
    -- Last-writer table-fit block + date lock is byte-identical in
    -- 00000000000000_baseline.sql,
    -- 20260818162000_operating_hour_segments.sql,
    -- 20260827180000_occupancy_duration_buffer.sql, and
    -- 20260828121224_table_fit_availability.sql.
    -- FP-3 greedy: smallest seats >= party; larger party first, then earlier
    -- created_at; NEW has no created_at (last among equal sizes). Assigned
    -- table_label is a hard claim. Collapse existing staff merges as one
    -- unit; do not invent merges. Exclude out_of_service only.
    -- Serialize last-unit fit: one occupying INSERT per date at a time.
    -- classid 305 = REAZED-305; objid = days since 1970-01-01 (date, not slot).
    PERFORM pg_advisory_xact_lock(
      305,
      (NEW.date::DATE - DATE '1970-01-01')::INT
    );
    SELECT COALESCE(ARRAY_AGG(DISTINCT r.table_label), ARRAY[]::TEXT[])
      INTO v_taken
      FROM reservations r
     WHERE r.date = NEW.date::DATE
       AND r.status IN ('confirmed', 'seated')
       AND r.id IS DISTINCT FROM NEW.id
       AND r.table_label IS NOT NULL
       AND (
            (NEW.time::TIME >= r.time::TIME
             AND (NEW.time::TIME - r.time::TIME) < v_window)
         OR (r.time::TIME >= NEW.time::TIME
             AND (r.time::TIME - NEW.time::TIME) < v_window)
       );

    FOR rec IN
      SELECT party_size
        FROM (
          SELECT r.party_size, r.created_at
            FROM reservations r
           WHERE r.date = NEW.date::DATE
             AND r.status IN ('confirmed', 'seated')
             AND r.id IS DISTINCT FROM NEW.id
             AND r.table_label IS NULL
             AND (
                  (NEW.time::TIME >= r.time::TIME
                   AND (NEW.time::TIME - r.time::TIME) < v_window)
               OR (r.time::TIME >= NEW.time::TIME
                   AND (r.time::TIME - NEW.time::TIME) < v_window)
             )
          UNION ALL
          SELECT NEW.party_size, NULL::TIMESTAMPTZ
        ) parties
       ORDER BY party_size DESC, created_at ASC NULLS LAST
    LOOP
      SELECT u.label
        INTO v_pick
        FROM (
          SELECT label, seats
            FROM (
              SELECT
                (ARRAY_AGG(
                   t.label
                   ORDER BY (substring(t.label FROM '^[0-9]+'))::INT NULLS LAST,
                            t.label
                 ))[1] AS label,
                SUM(t.seats)::INT AS seats,
                CASE
                  WHEN COUNT(DISTINCT t.status) = 1 THEN MIN(t.status)
                  WHEN bool_or(t.status = 'seated') THEN 'seated'
                  WHEN bool_or(t.status = 'reserved') THEN 'reserved'
                  WHEN bool_or(t.status = 'cleaning') THEN 'cleaning'
                  WHEN bool_or(t.status = 'out_of_service') THEN 'out_of_service'
                  ELSE 'available'
                END AS status
              FROM table_merges m
              JOIN table_merge_members mm ON mm.merge_id = m.id
              JOIN tables t ON t.id = mm.table_id
              GROUP BY m.id
              HAVING COUNT(*) >= 2
            ) merged
           WHERE merged.status IS DISTINCT FROM 'out_of_service'
          UNION ALL
          SELECT t.label, t.seats
            FROM tables t
           WHERE t.status IS DISTINCT FROM 'out_of_service'
             AND NOT EXISTS (
               SELECT 1
                 FROM table_merge_members mm
                WHERE mm.table_id = t.id
                  AND (
                    SELECT COUNT(*)
                      FROM table_merge_members mm2
                      JOIN tables t2 ON t2.id = mm2.table_id
                     WHERE mm2.merge_id = mm.merge_id
                  ) >= 2
             )
        ) u
       WHERE u.seats >= rec.party_size
         AND NOT (u.label = ANY (v_taken))
       ORDER BY u.seats ASC,
                (substring(u.label FROM '^[0-9]+'))::INT NULLS LAST,
                u.label
       LIMIT 1;

      IF v_pick IS NULL THEN
        RAISE EXCEPTION 'Booking denied: This time is fully booked.'
          USING ERRCODE = 'P0001';
      END IF;

      v_taken := v_taken || v_pick;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

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

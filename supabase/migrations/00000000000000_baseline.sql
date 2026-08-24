-- ============================================================================
-- Consolidated baseline schema (restaurant-system)
-- Schema only — reference data lives in supabase/seed.sql
-- Idempotent — safe to re-run on db reset
-- ============================================================================

-- ── operating_windows ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operating_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  -- Opening-hour segments: multiple open rows per day (morning / lunch / dinner).
  label TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  -- Optional guest-facing helper for this segment; blank/whitespace stored as NULL.
  guest_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE operating_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read operating_windows" ON operating_windows;
CREATE POLICY "Allow public read operating_windows"
  ON operating_windows FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows" ON operating_windows;
CREATE POLICY "Allow authenticated full access to operating_windows"
  ON operating_windows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to operating_windows" ON operating_windows;
CREATE POLICY "Allow service_role full access to operating_windows"
  ON operating_windows FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── blocked_dates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  date DATE PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read blocked_dates" ON blocked_dates;
CREATE POLICY "Allow public read blocked_dates"
  ON blocked_dates FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON blocked_dates;
DROP POLICY IF EXISTS "Allow authenticated full access to blocked_dates" ON blocked_dates;
CREATE POLICY "Allow authenticated full access to blocked_dates"
  ON blocked_dates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access" ON blocked_dates;
DROP POLICY IF EXISTS "Allow service_role full access to blocked_dates" ON blocked_dates;
CREATE POLICY "Allow service_role full access to blocked_dates"
  ON blocked_dates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── reservations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  party_size INT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled')),
  phone TEXT NOT NULL,
  notes TEXT,
  table_label TEXT,
  conf_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert reservations" ON reservations;
CREATE POLICY "Allow public insert reservations"
  ON reservations FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read reservations" ON reservations;
CREATE POLICY "Allow public read reservations"
  ON reservations FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to reservations" ON reservations;
CREATE POLICY "Allow authenticated full access to reservations"
  ON reservations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to reservations" ON reservations;
CREATE POLICY "Allow service_role full access to reservations"
  ON reservations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── menu_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL,
  price_value NUMERIC,
  menu_id TEXT NOT NULL,
  section TEXT NOT NULL,
  section_en TEXT NOT NULL,
  popular BOOLEAN NOT NULL DEFAULT false,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS menu_items_menu_id_sort_idx ON menu_items (menu_id, sort_order);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read menu_items" ON menu_items;
CREATE POLICY "Allow public read menu_items"
  ON menu_items FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to menu_items" ON menu_items;
CREATE POLICY "Allow authenticated full access to menu_items"
  ON menu_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to menu_items" ON menu_items;
CREATE POLICY "Allow service_role full access to menu_items"
  ON menu_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Booking rules trigger ────────────────────────────────────────────────────
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
  DELETE FROM operating_windows;

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
GRANT EXECUTE ON FUNCTION replace_operating_windows(jsonb) TO service_role;

DROP TRIGGER IF EXISTS enforce_booking_rules ON reservations;

CREATE TRIGGER enforce_booking_rules
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION validate_reservation_availability();

-- ── tables (dining-room floor) ───────────────────────────────────────────────
-- FP-1: persisted inventory for /admin/floor and capacity checks.
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  seats INT NOT NULL CHECK (seats BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'seated', 'reserved', 'cleaning', 'out_of_service')),
  -- FP-7: max/expected turn time in minutes (admin-managed on /admin/floor).
  expected_minutes INT NOT NULL DEFAULT 90
    CHECK (expected_minutes BETWEEN 30 AND 240),
  x INT NOT NULL DEFAULT 0,
  y INT NOT NULL DEFAULT 0,
  shape TEXT NOT NULL DEFAULT 'round'
    CHECK (shape IN ('round', 'square', 'rect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tables ADD COLUMN IF NOT EXISTS expected_minutes INT NOT NULL DEFAULT 90;

DO $$
BEGIN
  ALTER TABLE tables
    ADD CONSTRAINT tables_expected_minutes_check
    CHECK (expected_minutes BETWEEN 30 AND 240);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to tables" ON tables;
CREATE POLICY "Allow authenticated full access to tables"
  ON tables FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to tables" ON tables;
CREATE POLICY "Allow service_role full access to tables"
  ON tables FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tables TO authenticated;
GRANT ALL ON TABLE tables TO service_role;

-- FP-8: temporary table arrangements (combined seat capacity + expected time).
CREATE TABLE IF NOT EXISTS table_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expected_minutes INT NOT NULL DEFAULT 90
    CHECK (expected_minutes BETWEEN 30 AND 240),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'seated', 'reserved', 'cleaning', 'out_of_service')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_merge_members (
  merge_id UUID NOT NULL REFERENCES table_merges(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  PRIMARY KEY (merge_id, table_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS table_merge_members_table_id_uidx
  ON table_merge_members (table_id);

ALTER TABLE table_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_merge_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to table_merges" ON table_merges;
CREATE POLICY "Allow authenticated full access to table_merges"
  ON table_merges FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to table_merges" ON table_merges;
CREATE POLICY "Allow service_role full access to table_merges"
  ON table_merges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to table_merge_members" ON table_merge_members;
CREATE POLICY "Allow authenticated full access to table_merge_members"
  ON table_merge_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to table_merge_members" ON table_merge_members;
CREATE POLICY "Allow service_role full access to table_merge_members"
  ON table_merge_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE table_merges TO authenticated;
GRANT ALL ON TABLE table_merges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE table_merge_members TO authenticated;
GRANT ALL ON TABLE table_merge_members TO service_role;

-- ── status_events (assignment / transition audit) ────────────────────────────
CREATE TABLE IF NOT EXISTS status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Live DBs already enforce this; keep the baseline equivalent.
-- Fallback merges must use entity_type 'table' (not 'table_merge').
DO $$
BEGIN
  ALTER TABLE status_events
    ADD CONSTRAINT status_events_entity_type_check
    CHECK (entity_type IN ('table', 'reservation', 'order'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to status_events" ON status_events;
CREATE POLICY "Allow authenticated full access to status_events"
  ON status_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to status_events" ON status_events;
CREATE POLICY "Allow service_role full access to status_events"
  ON status_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE status_events TO authenticated;
GRANT ALL ON TABLE status_events TO service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_merges;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- ── restaurant_settings (CMS singleton) ──────────────────────────────────────
-- Minimal branding CMS: one row (id = 1) holds the optional custom logo URL.
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  logo_url TEXT,
  -- FP-10: restaurant-wide guest booking slot interval (15 / 30 / 60).
  slot_interval_minutes INT NOT NULL DEFAULT 30
    CONSTRAINT restaurant_settings_slot_interval_minutes_check
    CHECK (slot_interval_minutes IN (15, 30, 60)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS slot_interval_minutes INT NOT NULL DEFAULT 30;

DO $$
BEGIN
  ALTER TABLE restaurant_settings
    ADD CONSTRAINT restaurant_settings_slot_interval_minutes_check
    CHECK (slot_interval_minutes IN (15, 30, 60));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow public read restaurant_settings"
  ON restaurant_settings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated full access to restaurant_settings"
  ON restaurant_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow service_role full access to restaurant_settings"
  ON restaurant_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated;
GRANT ALL ON TABLE restaurant_settings TO service_role;

INSERT INTO restaurant_settings (id, logo_url)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── branding storage bucket ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public read branding objects" ON storage.objects;
CREATE POLICY "Allow public read branding objects"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Allow service_role full access to branding objects" ON storage.objects;
CREATE POLICY "Allow service_role full access to branding objects"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'branding')
  WITH CHECK (bucket_id = 'branding');

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

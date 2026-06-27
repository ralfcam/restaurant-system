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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
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
  v_window RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM blocked_dates
    WHERE date = NEW.date::DATE
  ) THEN
    RAISE EXCEPTION 'Booking denied: Date is explicitly blocked.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
    INTO v_window
    FROM operating_windows
   WHERE day_of_week = EXTRACT(DOW FROM NEW.date::DATE)::INT
   LIMIT 1;

  IF FOUND THEN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_booking_rules ON reservations;

CREATE TRIGGER enforce_booking_rules
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION validate_reservation_availability();

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

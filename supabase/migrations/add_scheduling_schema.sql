-- Create operating_windows table
-- Stores the standard operating hours for each day of the week
CREATE TABLE IF NOT EXISTS operating_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(day_of_week)
);

-- Create blocked_dates table
-- Stores explicit date overrides (e.g., holidays, special closures).
-- Standardized column name: `date` (DATE PRIMARY KEY).
CREATE TABLE IF NOT EXISTS blocked_dates (
  date DATE PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE operating_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access (for the booking widget)
CREATE POLICY "Allow public read operating_windows"
  ON operating_windows FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read blocked_dates"
  ON blocked_dates FOR SELECT
  TO public
  USING (true);

-- RLS Policies: Allow authenticated (staff) full access
CREATE POLICY "Allow authenticated full access to operating_windows"
  ON operating_windows FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to blocked_dates"
  ON blocked_dates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default operating hours: Mon-Sat 09:00-22:00, Sunday closed
INSERT INTO operating_windows (day_of_week, opens_at, closes_at, is_closed)
VALUES
  (0, '00:00'::TIME, '00:00'::TIME, true),    -- Sunday: Closed
  (1, '09:00'::TIME, '22:00'::TIME, false),   -- Monday
  (2, '09:00'::TIME, '22:00'::TIME, false),   -- Tuesday
  (3, '09:00'::TIME, '22:00'::TIME, false),   -- Wednesday
  (4, '09:00'::TIME, '22:00'::TIME, false),   -- Thursday
  (5, '09:00'::TIME, '22:00'::TIME, false),   -- Friday
  (6, '09:00'::TIME, '22:00'::TIME, false)    -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;

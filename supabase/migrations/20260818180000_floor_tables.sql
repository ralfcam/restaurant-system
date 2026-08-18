-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.
--
-- FP-1: persist dining-room tables and assignment audit events.

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  seats INT NOT NULL CHECK (seats BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'seated', 'reserved', 'cleaning', 'out_of_service')),
  x INT NOT NULL DEFAULT 0,
  y INT NOT NULL DEFAULT 0,
  shape TEXT NOT NULL DEFAULT 'round'
    CHECK (shape IN ('round', 'square', 'rect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

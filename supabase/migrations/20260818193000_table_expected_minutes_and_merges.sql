-- Forward migration for already-applied baselines.
-- Same objects are defined idempotently in 00000000000000_baseline.sql.
--
-- FP-7: per-table max/expected turn time.
-- FP-8: temporary table merges (combined seat capacity, shared status).

ALTER TABLE tables ADD COLUMN IF NOT EXISTS expected_minutes INT NOT NULL DEFAULT 90;

DO $$
BEGIN
  ALTER TABLE tables
    ADD CONSTRAINT tables_expected_minutes_check
    CHECK (expected_minutes BETWEEN 30 AND 240);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

-- RES-42 / SIB-PRIV: table merges are service_role-only (keep DROP IF EXISTS; do not CREATE).
DROP POLICY IF EXISTS "Allow authenticated full access to table_merges" ON table_merges;
DROP POLICY IF EXISTS "Allow authenticated full access to table_merge_members" ON table_merge_members;

DROP POLICY IF EXISTS "Allow service_role full access to table_merges" ON table_merges;
CREATE POLICY "Allow service_role full access to table_merges"
  ON table_merges FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to table_merge_members" ON table_merge_members;
CREATE POLICY "Allow service_role full access to table_merge_members"
  ON table_merge_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- REAZED-297: default table privileges are REFERENCES/TRIGGER/TRUNCATE only.
REVOKE ALL ON TABLE table_merges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE table_merges TO service_role;
REVOKE ALL ON TABLE table_merge_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE table_merge_members TO service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_merges;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

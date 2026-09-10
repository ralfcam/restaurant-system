-- Forward migration for already-applied 20260825140000 (linked/remote).
-- Same reservation RES-PRIV and blocked_dates, menu_items PUBLIC-READ-PRIV
-- surface is also defined idempotently in 00000000000000_baseline.sql and
-- 20260825140000_operating_windows_privilege.sql so
-- `supabase db reset --local` stays equivalent.
--
-- RES-42 / REAZED-308: RES-PRIV — guest INSERT only on guest-column allowlist
-- (guest_name, party_size, date, time, phone, email, notes, conf_code). Server-owned
-- id, status, table_label, created_at, completed_at have no guest INSERT privilege.
-- Drop public SELECT and authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE).
-- REAZED-308: PUBLIC-READ-PRIV — blocked_dates and menu_items SELECT-only
-- (REVOKE ALL then GRANT SELECT; drop authenticated FOR ALL).

DROP POLICY IF EXISTS "Allow public read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated full access to reservations" ON reservations;
REVOKE ALL ON TABLE reservations FROM PUBLIC, anon, authenticated;
GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated;
GRANT ALL ON TABLE reservations TO service_role;

-- RES-42 / REAZED-308: PUBLIC-READ-PRIV — public SELECT only; drop authenticated
-- FOR ALL (keep DROP IF EXISTS; do not CREATE).
DROP POLICY IF EXISTS "Allow authenticated full access to blocked_dates" ON blocked_dates;
REVOKE ALL ON TABLE blocked_dates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE blocked_dates TO anon, authenticated;
GRANT ALL ON TABLE blocked_dates TO service_role;

-- RES-42 / REAZED-308: PUBLIC-READ-PRIV — public SELECT only; drop authenticated
-- FOR ALL (keep DROP IF EXISTS; do not CREATE).
DROP POLICY IF EXISTS "Allow authenticated full access to menu_items" ON menu_items;
REVOKE ALL ON TABLE menu_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE menu_items TO anon, authenticated;
GRANT ALL ON TABLE menu_items TO service_role;

NOTIFY pgrst, 'reload schema';

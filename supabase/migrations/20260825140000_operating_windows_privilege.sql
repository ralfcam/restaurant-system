-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.
--
-- REAZED-290: OH-PRIV — SELECT-only table privileges for anon/authenticated;
-- drop the authenticated FOR ALL policy on the forked remote.
-- REAZED-297: GRANT ALL ON TABLE operating_windows, blocked_dates,
-- reservations, menu_items TO service_role
-- (default table privileges are REFERENCES/TRIGGER/TRUNCATE only).
-- REAZED-298: BC-1 — restaurant_settings SELECT-only for anon/authenticated;
-- drop the authenticated FOR ALL policy on the forked remote.

DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows" ON operating_windows;

GRANT SELECT ON TABLE operating_windows TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE operating_windows FROM anon, authenticated;
-- REAZED-297: default table privileges are REFERENCES/TRIGGER/TRUNCATE only.
GRANT ALL ON TABLE operating_windows TO service_role;

-- RES-42 / REAZED-308: RES-PRIV — guest INSERT only; drop public SELECT and
-- authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE).
DROP POLICY IF EXISTS "Allow public read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated full access to reservations" ON reservations;
REVOKE ALL ON TABLE reservations FROM PUBLIC, anon, authenticated;
GRANT INSERT ON TABLE reservations TO anon, authenticated;
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

-- REAZED-298: BC-1 — drop authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE);
-- GRANT SELECT / REVOKE INSERT, UPDATE, DELETE for anon, authenticated.
DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings" ON restaurant_settings;
GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated;
GRANT ALL ON TABLE restaurant_settings TO service_role;

NOTIFY pgrst, 'reload schema';

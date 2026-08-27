-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.
--
-- REAZED-290: OH-PRIV — SELECT-only table privileges for anon/authenticated;
-- drop the authenticated FOR ALL policy on the forked remote.
-- REAZED-297: GRANT ALL ON TABLE operating_windows, blocked_dates,
-- reservations, menu_items TO service_role
-- (default table privileges are REFERENCES/TRIGGER/TRUNCATE only).

DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows" ON operating_windows;

GRANT SELECT ON TABLE operating_windows TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE operating_windows FROM anon, authenticated;
-- REAZED-297: default table privileges are REFERENCES/TRIGGER/TRUNCATE only.
GRANT ALL ON TABLE operating_windows TO service_role;
GRANT ALL ON TABLE blocked_dates TO service_role;
GRANT ALL ON TABLE reservations TO service_role;
GRANT ALL ON TABLE menu_items TO service_role;

NOTIFY pgrst, 'reload schema';

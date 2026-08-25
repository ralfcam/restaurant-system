-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.
--
-- REAZED-290: OH-PRIV — SELECT-only table privileges for anon/authenticated;
-- drop the authenticated FOR ALL policy on the forked remote.

DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows" ON operating_windows;

GRANT SELECT ON TABLE operating_windows TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE operating_windows FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

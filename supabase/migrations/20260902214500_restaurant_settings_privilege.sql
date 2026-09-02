-- Forward migration for already-applied 20260825140000 (linked/remote).
-- Same restaurant_settings privilege surface is also defined idempotently
-- in 00000000000000_baseline.sql and
-- 20260825140000_operating_windows_privilege.sql so
-- `supabase db reset --local` stays equivalent.
--
-- REAZED-298: BC-1 — restaurant_settings SELECT-only for anon/authenticated;
-- drop the authenticated FOR ALL policy on the forked remote.

-- REAZED-298: BC-1 — drop authenticated FOR ALL (keep DROP IF EXISTS; do not CREATE);
-- GRANT SELECT / REVOKE INSERT, UPDATE, DELETE for anon, authenticated.
DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings" ON restaurant_settings;
GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated;
GRANT ALL ON TABLE restaurant_settings TO service_role;

NOTIFY pgrst, 'reload schema';

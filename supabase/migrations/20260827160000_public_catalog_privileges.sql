-- Forward migration for already-applied 20260825140000 (linked/remote).
-- Same reservation RES-PRIV and blocked_dates, menu_items PUBLIC-READ-PRIV
-- surface is also defined idempotently in 00000000000000_baseline.sql and
-- 20260825140000_operating_windows_privilege.sql so
-- `supabase db reset --local` stays equivalent.
--
-- REAZED-308: RES-PRIV — drop public SELECT (keep DROP IF EXISTS; do not CREATE);
-- GRANT INSERT / REVOKE SELECT, UPDATE, DELETE for anon, authenticated.
-- REAZED-308: PUBLIC-READ-PRIV — GRANT SELECT / REVOKE INSERT, UPDATE, DELETE
-- for anon, authenticated on blocked_dates and menu_items.

DROP POLICY IF EXISTS "Allow public read reservations" ON reservations;
GRANT INSERT ON TABLE reservations TO anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON TABLE reservations FROM anon, authenticated;

-- REAZED-308: PUBLIC-READ-PRIV — GRANT SELECT / REVOKE INSERT, UPDATE, DELETE
-- for anon, authenticated.
GRANT SELECT ON TABLE blocked_dates TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE blocked_dates FROM anon, authenticated;

-- REAZED-308: PUBLIC-READ-PRIV — GRANT SELECT / REVOKE INSERT, UPDATE, DELETE
-- for anon, authenticated on menu_items.
GRANT SELECT ON TABLE menu_items TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE menu_items FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';

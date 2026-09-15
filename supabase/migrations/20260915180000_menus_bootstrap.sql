-- RES-70 / MT-4a: forward menus bootstrap + reorder_menu_tabs.
--
-- supabase-migrations.mdc all-three exception:
-- 1. Cannot be expressed only as an in-place companion edit — those files
--    already ran on hosted DBs and will not re-run, so an in-place CREATE
--    never reaches them.
-- 2. Must run against already-deployed environments that applied older
--    companions without CREATE TABLE IF NOT EXISTS menus.
-- 3. Folding the CREATE into companions-only is unsafe for those hosts;
--    applied files do not re-run. This dated forward is the only vehicle
--    that still applies.
--
-- Same CREATE + privilege trio + reorder_menu_tabs as baseline and the
-- companions (after the in-place CREATE edit). RLS + public-read /
-- service_role policies match baseline (and the branding dated-forward
-- recipe) so a hosted CREATE is not left without RLS. Companions already
-- applied and stay privilege-only. `supabase db reset --local` stays
-- equivalent via baseline.

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read menus" ON menus;
CREATE POLICY "Allow public read menus"
  ON menus FOR SELECT
  TO public
  USING (true);

-- RES-70 / MT-4: PUBLIC-READ-PRIV — public SELECT only; drop authenticated
-- FOR ALL (keep DROP IF EXISTS; do not CREATE).
DROP POLICY IF EXISTS "Allow authenticated full access to menus" ON menus;

DROP POLICY IF EXISTS "Allow service_role full access to menus" ON menus;
CREATE POLICY "Allow service_role full access to menus"
  ON menus FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE menus FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE menus TO anon, authenticated;
GRANT ALL ON TABLE menus TO service_role;

-- C1 added reorder_menu_tabs to baseline only; already-applied hosts lack it.
CREATE OR REPLACE FUNCTION reorder_menu_tabs(p_ordered_ids jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.menus AS m
  SET sort_order = (o.ordinality - 1)::INT
  FROM jsonb_array_elements_text(p_ordered_ids)
    WITH ORDINALITY AS o(id, ordinality)
  WHERE m.id = o.id;
END;
$$;

REVOKE ALL ON FUNCTION reorder_menu_tabs(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION reorder_menu_tabs(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION reorder_menu_tabs(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

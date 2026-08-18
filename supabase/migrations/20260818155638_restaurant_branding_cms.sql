-- Forward migration for already-applied baseline (linked/remote).
-- Same objects are also defined idempotently in 00000000000000_baseline.sql
-- so `supabase db reset --local` stays equivalent.

-- ── restaurant_settings (CMS singleton) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow public read restaurant_settings"
  ON restaurant_settings FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow authenticated full access to restaurant_settings"
  ON restaurant_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role full access to restaurant_settings" ON restaurant_settings;
CREATE POLICY "Allow service_role full access to restaurant_settings"
  ON restaurant_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated;
GRANT ALL ON TABLE restaurant_settings TO service_role;

INSERT INTO restaurant_settings (id, logo_url)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── branding storage bucket ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Allow public read branding objects" ON storage.objects;
CREATE POLICY "Allow public read branding objects"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Allow service_role full access to branding objects" ON storage.objects;
CREATE POLICY "Allow service_role full access to branding objects"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'branding')
  WITH CHECK (bucket_id = 'branding');

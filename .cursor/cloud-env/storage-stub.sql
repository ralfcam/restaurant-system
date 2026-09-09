-- Minimal storage schema so 00000000000000_baseline.sql can insert the
-- branding bucket and attach RLS policies. The official `supabase start`
-- stack provides this via the storage service; the slim Cloud Agent stack
-- does not.
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS graphql_public;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

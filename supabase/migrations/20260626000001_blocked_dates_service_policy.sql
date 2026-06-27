-- =============================================================
-- Migration: blocked_dates_service_policy
-- Adds a service_role bypass policy to blocked_dates and
-- operating_windows so server-action mutations using the
-- service-role key are never blocked by RLS.
-- Also reloads the PostgREST schema cache.
-- Idempotent — safe to re-run.
-- =============================================================

-- ── blocked_dates: service_role full access ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'blocked_dates'
      AND policyname = 'Allow service_role full access to blocked_dates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow service_role full access to blocked_dates"
        ON public.blocked_dates FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    $policy$;
  END IF;
END;
$$;

-- ── operating_windows: service_role full access ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'operating_windows'
      AND policyname = 'Allow service_role full access to operating_windows'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Allow service_role full access to operating_windows"
        ON public.operating_windows FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    $policy$;
  END IF;
END;
$$;

-- ── Force PostgREST to reload its schema cache ───────────────
-- This ensures the API immediately recognises any table/column
-- changes without requiring a container restart.
NOTIFY pgrst, 'reload schema';

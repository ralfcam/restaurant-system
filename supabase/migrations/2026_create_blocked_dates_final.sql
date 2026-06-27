-- ============================================================================
-- DEFINITIVE blocked_dates migration
-- ----------------------------------------------------------------------------
-- Run this directly in the Supabase Dashboard SQL Editor to resolve the
-- PGRST116 schema-cache error. The final NOTIFY forces PostgREST to reload its
-- schema cache so the REST API immediately recognizes the table.
--
-- Standardized column name: `date` (DATE PRIMARY KEY).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blocked_dates (
    date DATE PRIMARY KEY,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Public read access (booking widget reads blocked dates to disable them)
DROP POLICY IF EXISTS "Allow public read access" ON public.blocked_dates;
CREATE POLICY "Allow public read access"
    ON public.blocked_dates FOR SELECT
    USING (true);

-- Service role full access (admin scheduling page toggles blocked dates)
DROP POLICY IF EXISTS "Allow service_role full access" ON public.blocked_dates;
CREATE POLICY "Allow service_role full access"
    ON public.blocked_dates FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Force PostgREST to reload its schema cache (fixes PGRST116 / PGRST205)
NOTIFY pgrst, 'reload schema';

-- Forward migration for remotes that already recorded baseline.
-- CREATE TABLE IF NOT EXISTS is a no-op there, so replace
-- reservations_status_check and add completed_at if missing.
-- Same DROP/ADD CHECK + completed_at IF NOT EXISTS also live in
-- 00000000000000_baseline.sql so `supabase db reset --local` converges.
--
-- RES-67 / RES-STATUS-FORWARD: five-value status CHECK including no_show.
ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed', 'seated', 'completed', 'cancelled', 'no_show'));

-- RES-67 / PV-13: remotes that applied an older baseline without completed_at.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

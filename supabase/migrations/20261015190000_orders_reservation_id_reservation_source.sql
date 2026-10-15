-- RES-167: this file holds the RES-167 schema changes. Forward-only for
-- databases that already recorded the baseline. The same statements live in
-- 00000000000000_baseline.sql so `supabase db reset --local` converges.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_reservation_id_required;
-- Postgres still evaluates a NOT VALID check on UPDATE, so a pre-migration
-- order with a null reservation_id could not change status. The cutoff is
-- this migration's apply time: older rows stay exempt; new rows must set it.
DO $$
BEGIN
  EXECUTE format(
    'ALTER TABLE orders ADD CONSTRAINT orders_reservation_id_required CHECK (reservation_id IS NOT NULL OR created_at < %L) NOT VALID',
    now()
  );
END $$;

-- RES-167: reservation origin. Not guest-insertable. No backfill.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'online';
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_source_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_source_check CHECK (source IN ('online','staff','walk_in','external'));

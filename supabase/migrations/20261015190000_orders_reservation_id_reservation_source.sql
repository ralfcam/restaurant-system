-- RES-167: this file holds the RES-167 schema changes. Forward-only for
-- databases that already recorded the baseline. The same statements live in
-- 00000000000000_baseline.sql so `supabase db reset --local` converges.

-- RES-167: a kitchen order belongs to one visit. Default FK action is NO ACTION
-- (a visit's orders are not cascade-deleted).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_reservation_id_required;
-- NOT VALID leaves existing rows unscanned; new rows must carry reservation_id.
-- Postgres still evaluates the check on UPDATE, so a pre-existing null-visit
-- row fails unless that update sets reservation_id. No created_at clause:
-- created_at is writable and a cutoff would shift on reset or replay.
ALTER TABLE orders ADD CONSTRAINT orders_reservation_id_required CHECK (reservation_id IS NOT NULL) NOT VALID;

-- RES-167: reservation origin. Not guest-insertable. No backfill.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'online';
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_source_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_source_check CHECK (source IN ('online','staff','walk_in','external'));

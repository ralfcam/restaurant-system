-- RES-138: these objects were edited into 00000000000000_baseline.sql after
-- that version was already recorded on the shared project, so a hosted
-- apply never re-runs them. Keep the same definitions in the baseline.
-- max_cover_capacity itself is added by 20261004161500_max_cover_capacity.sql.

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS email_normalized TEXT
  GENERATED ALWAYS AS (lower(btrim(email))) STORED;

CREATE INDEX IF NOT EXISTS reservations_email_normalized_idx
  ON public.reservations (email_normalized);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS allergens TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS external_booking_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reservations_external_booking_id_uidx
  ON public.reservations (external_booking_id)
  WHERE external_booking_id IS NOT NULL;

ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS restaurant_display_name TEXT;
ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS show_reservation_phone BOOLEAN NOT NULL DEFAULT false;

-- RES-80 / EI-6: service-role import. An availability failure aborts the call.
CREATE OR REPLACE FUNCTION import_external_reservations(rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $import_ext$
DECLARE
  item jsonb;
  inserted_count integer := 0;
  skipped_count integer := 0;
BEGIN
  FOR item IN
    SELECT jsonb_array_elements(rows)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.reservations
      WHERE external_booking_id = (item->>'external_booking_id')
    ) THEN
      skipped_count := skipped_count + 1;
    ELSE
      INSERT INTO public.reservations (
        guest_name,
        party_size,
        date,
        time,
        phone,
        email,
        notes,
        status,
        table_label,
        conf_code,
        external_booking_id
      ) VALUES (
        COALESCE(item->>'guest_name', ''),
        (item->>'party_size')::integer,
        (item->>'date')::date,
        item->>'time',
        COALESCE(item->>'phone', ''),
        item->>'email',
        item->>'notes',
        'confirmed',
        NULL,
        item->>'conf_code',
        item->>'external_booking_id'
      );
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'skipped', skipped_count
  );
END;
$import_ext$;

REVOKE ALL ON FUNCTION import_external_reservations(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION import_external_reservations(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION import_external_reservations(jsonb) TO service_role;

-- A hosted apply does not run seed.sql. Write the dining-room seat sum only
-- when the ceiling is still null so an existing ceiling is left alone.
UPDATE restaurant_settings
SET max_cover_capacity = 38
WHERE id = 1 AND max_cover_capacity IS NULL;

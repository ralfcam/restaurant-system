-- RES-69: an already-applied baseline does not re-run. This forward file
-- adds the nullable ceiling and the same locked check as the baseline.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS max_cover_capacity INT;

DO $$
BEGIN
  ALTER TABLE public.restaurant_settings
    ADD CONSTRAINT restaurant_settings_max_cover_capacity_check
    CHECK (max_cover_capacity IS NULL OR max_cover_capacity >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CC-11: growth and a lower ceiling share pg_advisory_xact_lock(69, 1)
-- through the write. DELETE and seat decreases do not raise.
CREATE OR REPLACE FUNCTION public.enforce_cover_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ceiling INT;
  v_sum INT;
  v_next INT;
BEGIN
  IF TG_TABLE_NAME = 'restaurant_settings' THEN
    IF NEW.max_cover_capacity IS NULL THEN
      RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(69, 1);
    SELECT COALESCE(SUM(seats), 0)
      INTO v_sum
      FROM public.tables;

    IF NEW.max_cover_capacity < v_sum THEN
      RAISE EXCEPTION 'errors.floor.maxCoverCapacityBelowSum'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.seats <= OLD.seats THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(69, 1);

  SELECT max_cover_capacity
    INTO v_ceiling
    FROM public.restaurant_settings
   WHERE id = 1;

  IF v_ceiling IS NULL THEN
    RAISE EXCEPTION 'errors.floor.maxCoverCapacityUnset'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(seats), 0)
    INTO v_sum
    FROM public.tables;

  v_next := v_sum + NEW.seats;
  IF TG_OP = 'UPDATE' THEN
    v_next := v_sum - OLD.seats + NEW.seats;
  END IF;

  IF v_next > v_ceiling THEN
    RAISE EXCEPTION 'errors.floor.maxCoverCapacityReached'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_cover_capacity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_cover_capacity() FROM anon, authenticated;

DROP TRIGGER IF EXISTS enforce_cover_capacity_tables ON public.tables;
CREATE TRIGGER enforce_cover_capacity_tables
  BEFORE INSERT OR UPDATE OF seats ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cover_capacity();

DROP TRIGGER IF EXISTS enforce_cover_capacity_settings ON public.restaurant_settings;
CREATE TRIGGER enforce_cover_capacity_settings
  BEFORE INSERT OR UPDATE OF max_cover_capacity ON public.restaurant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_cover_capacity();

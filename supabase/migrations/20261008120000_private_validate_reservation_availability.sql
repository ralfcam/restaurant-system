-- RES-101: move the booking trigger function into schema private.
-- This is a new dated file because
-- 20260918140655_slot_service_cover_limits.sql is already recorded on
-- remotes, so editing that file would not run there.
--
-- Do not fold the move into 00000000000000_baseline.sql: later unqualified
-- CREATE OR REPLACE FUNCTION
-- validate_reservation_availability() files recreate the function in public
-- and would leave enforce_booking_rules on a stale private body.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

DO $$
BEGIN
  IF to_regprocedure('public.validate_reservation_availability()') IS NOT NULL THEN
    ALTER FUNCTION public.validate_reservation_availability() SET SCHEMA private;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS enforce_booking_rules ON public.reservations;

CREATE TRIGGER enforce_booking_rules
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_reservation_availability();

REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM anon, authenticated;

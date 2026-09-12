# Security findings (open)

- [ ] C8 still does not pin the SELECT allowlist string · tests/unit/analytics/staff-page.test.ts vs app/actions/analytics.ts:24-25 · thenables ignore .select(); select("*") would still pass C8; a live * would still load guest columns into data before the map · med · (found: tdd/analytics_tdd_wave_44867fc0/C8/green)
- [ ] RA-2 is application-only · supabase/migrations/00000000000000_baseline.sql service_role FOR ALL + GRANT ALL on reservations / tables / status_events · createServiceClient() can still mutate; a later .update in this action would succeed at the DB · med · (found: tdd/analytics_tdd_wave_44867fc0/C9/refactor)

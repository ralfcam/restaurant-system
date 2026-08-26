# Security findings (open)

- [ ] Isolation scheme is not pinned · `lib/scheduling/hours-mutation-target.ts:17` · `file://127.0.0.1/…` and `file://[::1]/…` pass because hostname matches; spec expects a Supabase HTTP URL · low · (seen: /triage 2026-08-26) (found: tdd/pr35_coderabbit_oh_save/C1/refactor)
- [ ] anon/authenticated still have TRUNCATE (and REFERENCES/TRIGGER) on `operating_windows` · `information_schema.role_table_grants` / C2 GRANT/REVOKE · C2 only REVOKE INSERT, UPDATE, DELETE; TRUNCATE is not RLS-gated in Postgres · low · (seen: /triage 2026-08-26) (found: tdd/reazed-290_hours_privilege/C1/green-recovery)
- [ ] REVOKE does not include `PUBLIC` · `supabase/migrations/00000000000000_baseline.sql:42-43` · a PUBLIC INSERT grant would still apply to `anon`/`authenticated` · low · (seen: /triage 2026-08-26) (found: tdd/reazed-290_hours_privilege/C2/refactor)

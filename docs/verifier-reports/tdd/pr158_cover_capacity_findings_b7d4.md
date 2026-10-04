# TDD log — pr158_cover_capacity_findings_b7d4

### CC-11

Suggested review order:
- Failed seat read writes nothing → `app/actions/operations.ts:970` [booking], `app/actions/operations.ts:461`
- Lock held through the ceiling check and the write [schema] → `supabase/migrations/00000000000000_baseline.sql:1085`, `:1101`, `:1135`; `supabase/migrations/20261004161500_max_cover_capacity.sql:34`, `:84`
- Execute revoked from API roles [security] → `supabase/migrations/00000000000000_baseline.sql:1131`, `supabase/migrations/20261004161500_max_cover_capacity.sql:80`

Reusable pattern: Assert the same `pg_advisory_xact_lock`, `BEFORE INSERT OR UPDATE` triggers, and `REVOKE` in both the baseline and the dated forward file; do not fold a trigger that an already-baselined remote must still apply.

### CC-10

Suggested review order:
- Forward nullable ceiling [schema] → `supabase/migrations/20261004161500_max_cover_capacity.sql:3`
- Idempotent null-or-at-least-one check [schema] → `supabase/migrations/20261004161500_max_cover_capacity.sql:7`
- Baseline twin → `supabase/migrations/00000000000000_baseline.sql:1022`, `:1058`

Reusable pattern: Assert `ADD COLUMN IF NOT EXISTS` without `NOT NULL` and the same `IS NULL OR >= 1` check in both the baseline and the dated forward file; keep the forward copy when an already-baselined remote must still apply it.

## Suggested Review Order (collated)

- Lock held through the ceiling check [schema] → `supabase/migrations/00000000000000_baseline.sql` `pg_advisory_xact_lock(69, 1)` and both `enforce_cover_capacity` triggers; the same function in `supabase/migrations/20261004161500_max_cover_capacity.sql`
- Execute revoked from API roles [security] → both files `REVOKE` on `public.enforce_cover_capacity()`
- Failed seat read writes nothing [booking] → `app/actions/operations.ts` `createTable` and the seat-increase sum read
- Forward nullable ceiling [schema] → `supabase/migrations/20261004161500_max_cover_capacity.sql` `ADD COLUMN IF NOT EXISTS max_cover_capacity INT` and the matching baseline check

## Traceability (final)

Run: 2026-10-04 · plan: pr158_cover_capacity_findings_b7d4 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| CC-11 | cover-capacity.md CC-11 | tests/unit/floor/cover-capacity.test.ts::CC-11 failed seat read writes nothing and the lock is shared | app/actions/operations.ts, supabase/migrations/00000000000000_baseline.sql, supabase/migrations/20261004161500_max_cover_capacity.sql | P0 | shipped |
| CC-10 | cover-capacity.md CC-10 | tests/unit/floor/cover-capacity.test.ts::CC-10 forward migration adds the nullable ceiling | supabase/migrations/20261004161500_max_cover_capacity.sql, supabase/migrations/00000000000000_baseline.sql | P0 | shipped |

## Run metrics

Run: 2026-10-04 → 2026-10-04 · plan: pr158_cover_capacity_findings_b7d4
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 5
Back-loops: CC-10 already green (column landed in the CC-11 forward file)
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 6 left on ledger (below floor) — cap 3/run


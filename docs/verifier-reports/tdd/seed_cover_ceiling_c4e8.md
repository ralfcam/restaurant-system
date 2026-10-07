# TDD log — seed_cover_ceiling_c4e8

## CC-12

Suggested review order:
- re-run wording → `supabase/seed.sql:141-146`
- [schema] null-only ceiling write → `supabase/seed.sql:147-159`
- tables insert after that write → `supabase/seed.sql:177-180`

Reusable pattern: Floor seed scans search the raw file for `/dining-room/i` before comments are masked, so an earlier comment must not contain that phrase or the tables-insert anchor moves.

## Suggested Review Order (collated)

- schema → `supabase/seed.sql:147-159` (null-only `max_cover_capacity` write, value 38)
- schema → `supabase/seed.sql:141-146` (re-run does not lower a set ceiling)
- schema → `supabase/seed.sql:177-180` (dining-room tables insert after the ceiling)

## Traceability (final)

Run: 2026-10-05 · plan: seed_cover_ceiling_c4e8 · issue: RES-138

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| CC-12 | cover-capacity.md CC-12 | tests/unit/floor/schema.test.ts::seed sets max cover capacity to the dining-room seat sum before inserting tables | supabase/seed.sql | P1 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: seed_cover_ceiling_c4e8
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: n/a

# TDD log — branding_seed_tuple_b7e4

### BC-10

Suggested review order:
- Column-aligned blank logo and hero → `tests/unit/branding/schema.test.ts:168`
- index `logo_url` and `hero_image_url` → `tests/unit/branding/schema.test.ts:179`
- same arity, and `id` is `1` → `tests/unit/branding/schema.test.ts:184`
- those positions are null → `tests/unit/branding/schema.test.ts:186` [schema]
- seed row the pin reads → `supabase/seed.sql:149`, `supabase/seed.sql:150`, `supabase/seed.sql:156` [schema]

Reusable pattern: Pin a seed `INSERT` by column index (split the column list, `indexOf`, compare the aligned value) instead of a fixed `VALUES` arity, so a later column does not invalidate an earlier null pin.

## Suggested Review Order (collated)

- schema → `tests/unit/branding/schema.test.ts:186` (logo_url and hero_image_url values are null)
- schema → `tests/unit/branding/schema.test.ts:168` (column list aligned with VALUES)
- schema → `supabase/seed.sql:156` (unchanged tuple still ends with the cover ceiling)

## Traceability (final)

Run: 2026-10-05 · plan: branding_seed_tuple_b7e4 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| BC-10 | branding-cms.md BC-10 | tests/unit/branding/schema.test.ts::seed keeps the CMS singleton blank by default (no logo, no hero photo) | supabase/seed.sql | P2 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: branding_seed_tuple_b7e4
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 2
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (below floor) — cap 3/run

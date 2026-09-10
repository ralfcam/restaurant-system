# TDD verifier report — migration-guidance-fix (`migration-guidance-fix_b5133bd4`)

FIX run. Free-text `bug:` — no Linear ID. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. `/review` is Mode 1 only.

Docs-only seed: no Red/Green/Refactor phases. Criterion `PRIV-FWD-DOC` is `manual-UAT`.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow filenames.

### 1. Migration-state contract `[security]`

- `docs/specs/scheduling.md` §§17–18 — defining files `00000000000000_baseline.sql` and `20260825140000_operating_windows_privilege.sql`; two-branch remote apply (absent → `20260825140000`; recorded → `20260827160000` for catalog privilege changes; no replay / no `db push`)
- `docs/architecture/Auth-And-RLS.md` — early-baseline sibling privilege paragraph (must name both branches; must not say “those same two files” after a four-file paragraph)

### 2. Validation source `[security]`

- `docs/runbooks/deploy.md` lines 171–187 and 268–288 — absent → apply `20260825140000`; recorded → apply `20260827160000` for catalog privilege changes; do not replay applied history or `db push`
- `supabase/migrations/20260825140000_operating_windows_privilege.sql` header — EARLY-PRIV + catalog recipes
- `supabase/migrations/20260827160000_public_catalog_privileges.sql` header — compatibility forward when `20260825140000` is already recorded

## Traceability (final)

Run: 2026-09-10 · plan: migration-guidance-fix_b5133bd4 · issue: none

| Criterion    | Spec ref               | Test file::name | Source file(s)                                                       | Risk | Status     |
| ------------ | ---------------------- | --------------- | -------------------------------------------------------------------- | ---- | ---------- |
| PRIV-FWD-DOC | scheduling.md §§17–18 | —               | docs/architecture/Auth-And-RLS.md sibling privilege paragraph               | P3   | manual-uat |

**manual-UAT (deferred):** compare the amended sibling paragraph in `docs/architecture/Auth-And-RLS.md` with `docs/runbooks/deploy.md` lines 171–187 and 268–288. Confirm it unambiguously says: `20260825140000` absent → apply `20260825140000`; already recorded → apply `20260827160000` for catalog privilege changes; do not replay applied history or `db push`.

## Run metrics

Run: 2026-09-10 → 2026-09-10 · plan: migration-guidance-fix_b5133bd4
Criteria: 0 shipped · 1 manual-uat · 1 total
Phases delegated: 0 tdd-red/green/refactor Task calls
Back-loops: none
BLOCKED events: none
Issues: n/a

## 4C findings

No-op: `docs/findings/runs/migration-guidance-fix_b5133bd4.md` is absent. Standing ledger files were not read or mutated.

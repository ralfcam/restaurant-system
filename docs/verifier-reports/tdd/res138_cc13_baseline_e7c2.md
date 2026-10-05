# TDD log — res138_cc13_baseline_e7c2

## CC-13

Suggested review order:
- [booking] throw the caller key when the settings read errors → `app/actions/operations.ts:404`
- [booking] seat change passes `errors.floor.updateTableFailed` → `app/actions/operations.ts:430`
- create passes `errors.floor.addTableFailed` → `app/actions/operations.ts:971` (`getMaxCoverCapacity` uses the same key at line 412)

Reusable pattern: none

## G-MIG6

Suggested review order:
- [schema] pinned dated-file sentence → `.cursor/rules/supabase-migrations.mdc:74`
- exact toContain string → `tests/unit/dev-toolchain/baseline-forward-migration.test.ts:88`
- path-list helper stays in the test file → `tests/unit/dev-toolchain/baseline-forward-migration.test.ts:10`

Reusable pattern: Pin a Cursor rule sentence with readFileSync plus toContain of the full sentence. `.mdc` has no Prettier parser, so do not wrap that sentence to satisfy prettier --check.

## Suggested Review Order (collated)

- booking → `app/actions/operations.ts:404` (throw the caller key when the settings read errors)
- booking → `app/actions/operations.ts:430` (seat change passes `errors.floor.updateTableFailed`)
- booking → `app/actions/operations.ts:971` (create passes `errors.floor.addTableFailed`; `getMaxCoverCapacity` uses the same key at line 412)
- schema → `.cursor/rules/supabase-migrations.mdc:74` (dated-file sentence)
- schema → `tests/unit/dev-toolchain/baseline-forward-migration.test.ts:88` (exact sentence assertion)
- schema → `tests/unit/dev-toolchain/baseline-forward-migration.test.ts:10` (path-list helper)

## Traceability (final)

Run: 2026-10-05 · plan: res138_cc13_baseline_e7c2 · issue: RES-138

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| CC-13 | cover-capacity.md CC-13 | tests/unit/floor/cover-capacity.test.ts::CC-13 surfaces a failed capacity read instead of an unset ceiling | app/actions/operations.ts | P1 | shipped |
| G-MIG6 | dev-toolchain.md G-MIG6 | tests/unit/dev-toolchain/baseline-forward-migration.test.ts::states that a baseline change must also add a dated migration | .cursor/rules/supabase-migrations.mdc | P2 | shipped |

## Run metrics

Run: 2026-10-05 → 2026-10-05 · plan: res138_cc13_baseline_e7c2
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 8
Back-loops: CC-13: 1 extra Green to revert then restore; G-MIG6: 1 extra Green to remove then restore the rule sentence
BLOCKED events: 0
Issues: 0 filed · 0 attached · 3 left on ledger (below floor) — cap 3/run

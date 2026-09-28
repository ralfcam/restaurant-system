# TDD log — lsp3_recipe_token_b21be849

### LSP-3

Suggested review order:
- whole-file port-ban conformance [public-api] — `docs/testing/Design-And-Patterns.md:184` (seed HOST denylist reference cell = path only)
- LSP-3 pin — `tests/unit/dev-toolchain/local-supabase-ports.test.ts:130-132` (`namesApiPort` + `includes("54321")` false)

Reusable pattern: When a whole-file port ban covers a recipe catalog, cite `tests/unit/auth/seed-super-admin-claim.test.ts` by path only — never paste an `it()` title that embeds a banned port digit run

## Suggested Review Order (collated)

Highest-risk first. The change is the seed-denylist recipe reference: a file path only, so the whole-file port ban stays intact.

- [public-api] Seed HOST denylist reference cell is a path only — `docs/testing/Design-And-Patterns.md:184`
- LSP-3 pin — `tests/unit/dev-toolchain/local-supabase-ports.test.ts:130-132` (`namesApiPort` and the retired API port token must be absent)

## Traceability (final)

Run: 2026-09-28 · plan: lsp3_recipe_token_b21be849 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| LSP-3 | LSP-3 | local-supabase-ports.test.ts::current local-stack instructions use the committed API and DB ports | docs/testing/Design-And-Patterns.md | P1 | shipped |

## Run metrics

Run: 2026-09-28 → 2026-09-28 · plan: lsp3_recipe_token_b21be849
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 1 left on ledger (below floor) — cap 3/run

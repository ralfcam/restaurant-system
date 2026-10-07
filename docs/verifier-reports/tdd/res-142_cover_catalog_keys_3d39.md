# TDD verifier report — RES-142 cover catalog keys (`res-142_cover_catalog_keys_3d39`)

FIX run. Linear: RES-142.

This file is a reading guide for `/commit`, not a verdict.

## Criterion close-outs (incremental)

### C1 — AC-21 / criterion 2 cover-capacity refusal keys

Suggested review order: catalog leaves [public-api] → `messages/en.json:639` and `messages/fr.json:639` (`maxCoverCapacityUnset`); `messages/en.json:640` and `messages/fr.json:640` (`maxCoverCapacityInvalid`); `messages/en.json:641` and `messages/fr.json:641` (`maxCoverCapacityBelowSum`); inequality assertion → `tests/unit/floor/message-keys.test.ts:717`
Reusable pattern: none

## Suggested Review Order (collated)

- Catalog leaves for the three refusal keys [public-api] → `messages/en.json:639`, `messages/fr.json:639` (`maxCoverCapacityUnset`); `messages/en.json:640`, `messages/fr.json:640` (`maxCoverCapacityInvalid`); `messages/en.json:641`, `messages/fr.json:641` (`maxCoverCapacityBelowSum`)
- French differs from English → `tests/unit/floor/message-keys.test.ts:717`

## Traceability (final)

Run: 2026-10-07 · plan: res-142_cover_catalog_keys_3d39 · issue: RES-142

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| AC-21 / criterion 2 | site-localization.md criterion 2, AC-21 | tests/unit/floor/message-keys.test.ts::cover-capacity refusal keys resolve in French and English | messages/en.json, messages/fr.json | P2 | shipped |

## Run metrics

Run: 2026-10-07 → 2026-10-07 · plan: res-142_cover_catalog_keys_3d39
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor) — cap 3/run

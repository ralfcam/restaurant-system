# TDD log — pr179_cr_page_reads_p2a8

In-loop fix for CodeRabbit local-ref `loc-179-p2a8` on PR #179. START and CLOSE-OUT skipped.

## C1 Refactor

Suggested review order:
- `readAllGuestMergeRows` pages with `POSTGREST_MAX_ROWS`
- list and confirm both use that helper

Reusable pattern: none

## Suggested Review Order (collated)

1. `app/actions/guest-profiles.ts` `readAllGuestMergeRows`
2. `tests/unit/guest-profiles/merge.test.ts` past-1000 candidate test

## Traceability (final)

Run: 2026-10-06 · plan: pr179_cr_page_reads_p2a8 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profile-merge.md GM-2 | merge.test.ts::a reservation past the first 1000 rows still counts as a merge candidate | app/actions/guest-profiles.ts | P1 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: pr179_cr_page_reads_p2a8
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (below floor/cap) — cap 3/run

# TDD log — pr179_cr_confirm_error_m4e1

In-loop fix for CodeRabbit local-ref `loc-179-m4e1` on PR #179. START and CLOSE-OUT skipped.

## C1 Refactor

Suggested review order:
- `app/actions/guest-profiles.ts` `confirmMergeUnmapped` logs and returns `errors.guestProfiles.unmapped`
- select error and update error both call that helper
- blank, same-email, and non-candidate still return `{ ok: true }`

Reusable pattern: a non-exported helper that logs `[guest-profiles] confirmGuestMerge:` and returns the mapped error key.

## Suggested Review Order (collated)

1. `confirmMergeUnmapped` and the two call sites in `confirmGuestMerge`
2. `tests/unit/guest-profiles/merge.test.ts` read-failure and rewrite-failure tests

## Traceability (final)

Run: 2026-10-06 · plan: pr179_cr_confirm_error_m4e1 · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | guest-profile-merge.md GM-4 | merge.test.ts::confirm returns unmapped and keeps bob@ex.com when the candidate read fails | app/actions/guest-profiles.ts | P0 | shipped |
| C1-update | guest-profile-merge.md GM-4 | merge.test.ts::confirm returns unmapped and keeps bob@ex.com when the email rewrite fails | app/actions/guest-profiles.ts | P0 | shipped |

## Run metrics

Run: 2026-10-06 → 2026-10-06 · plan: pr179_cr_confirm_error_m4e1
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 2 left on ledger (below floor/cap) — cap 3/run

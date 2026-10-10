# TDD log: res-149_step6_pick_08ba

### C18

Suggested review order: Permission gate before the Pick amend — `.cursor/commands/conduct.md:134` [security]; amend that must follow the STOP — `.cursor/commands/conduct.md:135`; order assertion — `.cursor/checks/ready-brief-policy.test.mjs:608`
Reusable pattern: Window a `### N.` command section, `search` two needles, and assert the earlier index (`permissionAt < amendAt`), reusing the sibling section’s permission regex.

### C19

Suggested review order: Start only after re-check and Queue — `.cursor/commands/conduct.md:140` [security]; complete-brief re-check that must precede it — `.cursor/commands/conduct.md:137`; lowest `Queue:` ranking — `.cursor/commands/conduct.md:139`; dispatch writes the brief and does not start — `.cursor/commands/conduct.md:136`; first-index assertion — `.cursor/checks/ready-brief-policy.test.mjs:629`
Reusable pattern: Keep the first `start`/`starts` in `### 6. Pick` on the Queue-pick sentence, after the complete-brief re-check; a `start` on the `/dispatch` to write the brief line fails C19’s first-index check.

### C20

Suggested review order:
- Permission before any Pick amend [auth]: `.cursor/commands/conduct.md:134` then `:135`
- Per-reason dispatch [public-api]: `.cursor/commands/conduct.md:136` (`/dispatch completes` for `spec_amend`), `:137` (re-check), `:138` (auto_brief write and skip `eligible: false`), `:139` (`ready` keeps its brief)
- Start only after re-check and Queue: `.cursor/commands/conduct.md:140` then `:141`
Reusable pattern: Keep a Step 6 needle’s contiguous substring unbroken (no backtick inside `/dispatch completes the brief for `spec_amend``), and keep `auto_brief` on the same line as `` `/conduct next` runs `/dispatch` to write the brief `` so the per-line unconditional-dispatch check stays scoped.

## Suggested Review Order (collated)

- [auth] Permission STOP before Pick amend — `.cursor/commands/conduct.md:134`
- [auth] `spec_amend` amend that must follow the STOP — `.cursor/commands/conduct.md:135`
- [public-api] `/dispatch` completes the brief for `spec_amend` — `.cursor/commands/conduct.md:136`
- [public-api] Complete-brief re-check — `.cursor/commands/conduct.md:137`
- [public-api] Per-reason auto_brief write and skip `eligible: false` — `.cursor/commands/conduct.md:138`
- [public-api] `ready` keeps its brief — `.cursor/commands/conduct.md:139`
- [security] Start only after re-check and Queue — `.cursor/commands/conduct.md:140-141`

## Traceability (final)

Run: 2026-10-10 · plan: res-149_step6_pick_08ba · issue: RES-149

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C18 | G-CON1 | ready-brief-policy.test.mjs::pick confirms Permissions Requested before spec-amend | .cursor/commands/conduct.md | P0 | shipped |
| C19 | G-CON1 | ready-brief-policy.test.mjs::pick starts only after brief re-check and Queue | .cursor/commands/conduct.md | P0 | shipped |
| C20 | G-CON1 | ready-brief-policy.test.mjs::pick dispatch is per reason so spec_amend can complete the brief | .cursor/commands/conduct.md | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-149_step6_pick_08ba
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 9
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 5 left on ledger (below floor/cap) — cap 3/run

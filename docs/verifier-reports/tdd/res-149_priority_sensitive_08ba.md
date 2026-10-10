# TDD log: res-149_priority_sensitive_08ba

### C21

Suggested review order: Assigned priority is not Linear 0 — `.cursor/hooks/lib/ready-brief-policy.mjs:141` [security] (`briefComplete !== true` and priority present, not `""`, not `0` → `auto_brief`); fail closed — `.cursor/hooks/lib/ready-brief-policy.mjs:152` (`excluded_priority`); pin — `.cursor/checks/ready-brief-policy.test.mjs:586` (numeric `0`, including security, payment, and auth, stays ineligible with no `sensitive` flag).
Reusable pattern: Keep Linear No-priority (`0`) out of `auto_brief` with strict `priority !== 0` beside `!= null` and `!== ""`, and leave `excluded_priority` as the fallthrough — do not collapse the gate to truthiness.

### C22

Suggested review order: sensitive STOP [security] `.cursor/commands/ready-merge-release.md:88` (fetch `labels`) → `.cursor/commands/ready-merge-release.md:234-240` (name strings into `qaMayReadyPr`, STOP before `gh pr ready`) → `.cursor/commands/conduct.md:176` (conduct names that STOP); no second amend `.cursor/commands/conduct.md:155`
Reusable pattern: Command gates that call `qaMayReadyPr` must pass GitHub label name strings (`label.name`); `gh pr view --json labels` returns objects and the helper compares strings.

## Suggested Review Order (collated)

- [security] Linear `0` is not an assigned priority — `.cursor/hooks/lib/ready-brief-policy.mjs:141`
- [security] Fetch PR `labels` before ready — `.cursor/commands/ready-merge-release.md:88`
- [security] STOP before `gh pr ready` when `qaMayReadyPr` is false — `.cursor/commands/ready-merge-release.md:234-240`
- [security] Conduct names that STOP — `.cursor/commands/conduct.md:176`
- [public-api] No second `spec_amend` amend in Step 7 — `.cursor/commands/conduct.md:155`

## Traceability (final)

Run: 2026-10-10 · plan: res-149_priority_sensitive_08ba · issue: RES-149

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C21 | G-CON1 | ready-brief-policy.test.mjs::Linear priority 0 is missing and does not auto-brief | .cursor/hooks/lib/ready-brief-policy.mjs | P0 | shipped |
| C22 | G-CON1 | ready-brief-policy.test.mjs::readiness stops gh pr ready on a sensitive PR | .cursor/commands/ready-merge-release.md, .cursor/commands/conduct.md | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-149_priority_sensitive_08ba
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 6
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 6 left on ledger (below floor/cap) — cap 3/run

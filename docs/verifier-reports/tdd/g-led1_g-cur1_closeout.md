# TDD verifier report — G-LED1 ledger writer and G-CUR1 `/curate` (`g-led1_g-cur1_closeout`)

FEATURE close-out. No Linear issue. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict.

The criteria were already green in the working tree. This run did not delegate Red, Green, or Refactor. Re-entering Green would have treated the shipped source as pre-RED and reverted it. `shipped` below is stamped from this execution turn's re-run, not from an earlier report.

## Criterion close-outs (incremental)

### G-LED1 — One writer for the findings ledger

Suggested review order: `[toolchain]` `.cursor/hooks/lib/findings-write-policy.mjs:27` (`isRunScratchPath`) → `.cursor/agents/docs-updater.md:15` (ledger-apply) → `.cursor/commands/sdd-to-tdd.md:799` (STEP 4C) → `.cursor/commands/audit.md:425` (PART 8) → `.cursor/commands/triage.md:376` (`prune-ledger`)

Reusable pattern: none

Delete-list: Lean already. Ship.

### G-CUR1 — `/curate` is the weekly keep-or-drop command

Suggested review order: `[toolchain]` `.cursor/commands/curate.md:51` (Plan Mode stop) → `.cursor/commands/curate.md:166` (at most 5 decisions) → `.cursor/agents/linear-resolver.md:551` (`curate-terminal` / `duplicateOf`) → `.cursor/README.md` (Plan Mode list and cycle)

Reusable pattern: none

Delete-list: Lean already. Ship.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Ledger writer [toolchain]

- `.cursor/hooks/lib/findings-write-policy.mjs` `isRunScratchPath` — parent Writes under `docs/findings/runs/**` stay allowed while the allow flag is off. Category files, `archive.md`, and `.probe-scratch.md` stay denied.
- `.cursor/agents/docs-updater.md` ledger-apply — append, sharpen, stamp, archive, remove, and delete a run file. The docs-sync workflow does not run in that mode. Prettier-check the touched bus files.
- Call sites that must delegate, not Write the bus: `.cursor/commands/sdd-to-tdd.md` STEP 4C (delete the run file, never truncate; lines left on the ledger belong to `/curate`), `.cursor/commands/audit.md` PART 8, `.cursor/commands/triage.md` `prune-ledger` (no second-sighting stamp or expiry).
- Pin: `tests/unit/dev-toolchain/ledger-ownership.test.ts` — `keeps category and archive writes on docs-updater ledger-apply`. Pin: `.cursor/checks/findings-write-policy.test.mjs` — `checkFindingsWrite allows docs/findings/runs even when the flag is off`.

### 2. Weekly keep-or-drop [toolchain]

- `.cursor/commands/curate.md` — Plan Mode only, before any Linear or ledger read. No managed-Cloud one-shot. No subagent fan-out. Guards: never write In Progress, In Review, or Done; never cancel an open-PR, current-cycle, `security`, High, or Urgent issue; never set project, milestone, priority, estimate, or cycle; never file a ledger line as a new issue. Duplicates use `duplicateOf`. Digest cap is 5.
- `.cursor/agents/linear-resolver.md` — `curate-terminal` and `curate-structure` on Backlog or Todo only. `duplicateOf` plus a linking comment, or one `kept by /curate` comment.
- `.cursor/README.md` — `/curate` in the Plan Mode only list, between `/triage` and `/dispatch`.
- Pin: `tests/unit/dev-toolchain/curate-command.test.ts` — `pins Plan Mode reads, guards, scopes, memory, and the digest cap`.

## Traceability (final)

Run: 2026-10-01 · plan: g-led1_g-cur1_closeout · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-LED1 | dev-toolchain.md criterion 14 | `ledger-ownership.test.ts::keeps category and archive writes on docs-updater ledger-apply`; `findings-write-policy.test.mjs::checkFindingsWrite allows docs/findings/runs even when the flag is off` | `.cursor/agents/docs-updater.md`; `.cursor/hooks/lib/findings-write-policy.mjs`; `.cursor/commands/sdd-to-tdd.md`; `.cursor/commands/audit.md`; `.cursor/commands/triage.md`; `docs/findings/README.md` | P1 | shipped |
| G-CUR1 | dev-toolchain.md criterion 15 | `curate-command.test.ts::pins Plan Mode reads, guards, scopes, memory, and the digest cap` | `.cursor/commands/curate.md`; `.cursor/agents/linear-resolver.md`; `.cursor/rules/linear-automation.mdc`; `.cursor/README.md` | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-10-01 → 2026-10-01 · plan: g-led1_g-cur1_closeout
Criteria: 2 shipped · 0 manual-uat · 2 total
Phases delegated: 0
Back-loops: none
BLOCKED events: none
Issues: n/a — this run produced no findings; STEP 4C skipped. The standing ledger is not this run's work.

Verification this turn (executed, not skipped): `pnpm test:unit` on the two unit files (2 passed); `node --test .cursor/checks/findings-write-policy.test.mjs` (8 passed); `node .cursor/checks/harness-lint.mjs` (ok).

# Morning triage 2026-10-04

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/morning-2026-10-04-4e10-triage.plan.md`
- Scope: no argument
- Candidate projects: ongoing none · available restaurant-system V-0.5 (`P-RES-12`, status Backlog)
- Linear Triage: 0 issues read from the live inbox
- Ledger intake: 643 unique open entries (633 bus + 10 orphaned run lines)
- Open Urgent+High: 12 · WIP filing gate: clear
- Current cycle: Cycle 9 (`ea824b21-683f-409a-8c75-2e564285813b`, ends 2026-10-04T22:00:00.000Z)

Team: Restaurant Link, id `0db89a46-afdd-48ae-a6a5-8080628a3a19`, key RES (`get_team` query `RES` and project identifiers `P-RES-*`). Terminal excluded: restaurant-system V-0.2 Completed, restaurant-system V-0.1 Completed. No duplicate canonical keys.

## Plan — Clarifications

No tracked Triage issue needs `CLARIFY`.

Untracked, local, unscheduled (governing spec excludes the work):

- `docs/findings/product-gaps.md:35` — guests table / guest_id · high · spec `docs/specs/guest-profiles.md` lines 12 and 31: no `guests` table and no `guest_id`; listed out of this spec. Not accepted as buildable work. No Linear comment.

## Plan — Consolidation / Terminal Cleanup

None. Empty Triage inbox. No confirmed duplicate.

## Plan — Linear Triage Routing

None. `list_issues({ team: RES, state: triage })` returned 0 issues.

## Plan — Findings Registration

Below floor, stay on the ledger (not registered). Counts: security low 6; tech-debt low 152 + med 40; test-debt med 101 + low 177; product-gaps med 37 + low 116. `/triage` does not stamp or expire these. `/curate` owns TTL. Today is Sunday, so morning conduct does not run `/curate`.

Orphaned run lines, also below floor, stay in `docs/findings/runs/pr120_routed_bugs_fix_8b3fc479.md` (10 open lines, 1 med + 9 low; no matching open bus line). `docs/findings/runs/pr155_toolchain_contradictions.md` lines 7–9 already have open bus equivalents at `docs/findings/tech-debt.md:186-188`, so they are not extra intake.

Floor met, ordinary route, no verified existing issue (searches `chpasswd ubuntu`, `ruleset`, `drag-in` returned no covering issue). STEP 0B does not authorize net-new creation, so these stay deferred:

- `docs/findings/security.md:8` — Cloud image sets a fixed ubuntu password · `.cursor/cloud.Dockerfile` · med · security. Would be Backlog, project V-0.5, cycle none. Allocation: earliest compatible available version (only nonterminal version project). Not Blocker, so not fast lane. Spec `docs/specs/dev-toolchain.md` G-ENV1 does not require this credential and does not forbid removing it.
- `docs/findings/product-gaps.md:145` — Live main ruleset may still require the paused check · `docs/runbooks/coderabbit.md:377-414` · high · spec `docs/specs/dev-toolchain.md` G-CR3. Would be Backlog, V-0.5, cycle none.
- `docs/findings/product-gaps.md:148` — Cursor-head firewall runs after the gate and git push · `.cursor/commands/push.md` · high · spec `docs/specs/dev-toolchain.md` / push step 2 then 2b. Would be Backlog, V-0.5, cycle none.

No attach-only batch. No `register-*` execution.

## Plan — Ledger prune

none

## Execution Todos

- `intake-summary`: authorized — re-read applied state and emit the intake report. No Linear write and no ledger edit.

Deferred, not executed:

- `register-floor-novel`: deferred — no verified existing issue for security.md:8, product-gaps.md:145, or product-gaps.md:148. STEP 0B does not authorize net-new issue creation.
- product-gaps.md:35 guests table: deferred — untracked spec exclusion, kept local and unscheduled. Not a `clarify-*` todo.

## Cannot Verify

None. Empty Triage inbox, empty relations on issues not read, and omitted estimates are verified negatives where a read succeeded.

## Applied vs Deferred

Applied: no Linear writes, no ledger edits. Triage inbox remains empty.

Deferred:

- `register-floor-novel` — net-new issues are not authorized on this Cloud one-shot.
- product-gaps.md:35 — spec `docs/specs/guest-profiles.md` excludes a `guests` table / `guest_id`.

## Operator Next

`/dispatch` follows in this same morning conduct turn.

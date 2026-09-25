## Execution Protocol (MANDATORY — read first when executing this plan)

You are a **capture orchestrator, not an implementer**. When this plan is executed:

- The **only** writes you may cause are (1) `docs-updater` Task calls that append/
  sharpen `docs/findings/*.md` (one per target ledger file), and (2) — only if the
  accelerator lane fired — a single `linear-resolver` Task that files one tracking
  issue, and (3) one `linear-resolver` CLARIFY comment per exact approved
  tracked blocker. Nothing else.
- You MUST NOT edit `docs/specs/**`, `app/**`, `components/**`, `hooks/**`,
  `lib/**`, `src/**`, `supabase/**`, or `tests/**` yourself, and MUST NOT delegate
  a subagent to do so. Capture never authors the spec, code, or tests — that is
  `/sdd-to-tdd` FIX's job. If you are about to touch any of those paths, STOP.
- **"Implement the plan" means only the PHASE 5 Execution Todos listed below** —
  the `<category>-phase5` `docs-updater` delegations, the one
  `linear-register` delegation when present, and any approved `clarify-*`
  `linear-resolver` delegations. It does NOT authorize executing the **Approved
  reconciliation scope**: that section is advisory hand-off text for `/sdd-to-tdd`
  FIX, not a checklist to run here.
- Execute the listed todos **one at a time**, each via its subagent Task call;
  never satisfy a todo with an inline edit. When every listed todo is done (or was
  already satisfied in a prior turn), the run is **complete** — do NOT continue into
  spec/code/test work. STOP and surface the Next-in-the-Cycle pointer (`→ /triage`,
  or `→ /sdd-to-tdd <RES-###>` FIX when a `linear-register` issue was filed).
- An approved clarification-only plan must invoke `linear-resolver` and then stop.
  An untracked or unapproved clarification remains non-executable. If the plan
  lists no ledger, `linear-register`, or `clarify-*` todos, report the
  clarification and STOP with no Linear write.
- If you cannot delegate (the Task tool is unavailable) or a required subagent is
  missing, STOP and report — never self-implement in its place.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr122_cr_loc122_p8k2_d4e8a1c2.plan.md` (repository work-order, not a silently accepted native Cursor Plan; managed Cloud)
- Input source: argument `/capture "CodeRabbit PR #122 loc-122-p8k2"`

## Input Summary

- Items parsed: 1
- By class (operator tags): Functional 0 · UX 0 · UI 0 · other 1 (CodeRabbit leftover locator)

## Validation Summary

**[loc-122-p8k2] BW-16 chrome-scan never observes P0001 in a rendered confirmation form** — verdict: capture

- Evidence: `tests/unit/reservation-widget/fully-booked-error.test.ts:4-16` · validator: chrome-scan only; product already implements BW-16; spec silent on RTL
- Refined: Functional (test-debt) · med · silent · `docs/specs/booking-rules.md` §27 BW-16 (product only)

## Capture Plan

**[loc-122-p8k2] BW-16 fully-booked-error.test.ts chrome-scans source and never observes P0001 in a rendered confirmation form** — class: Functional · `docs/findings/test-debt.md`

- Validation: capture · evidence: `tests/unit/reservation-widget/fully-booked-error.test.ts` (validator + spot-check: `readFileSync` only; no `render` / `createReservation` drive)
- Proposed: `- [ ] BW-16 fully-booked-error.test.ts chrome-scans source and never observes P0001 in a rendered confirmation form · `tests/unit/reservation-widget/fully-booked-error.test.ts` · chrome-scan cannot runtime-establish inline rejection, retained inputs, stay on step 2, or no page toast; happy-dom only, no RTL · med · (found: coderabbit/PR/7e5ff22745e4a8370d1d04ab11344f4c942d5c20/cr-comment:v1:ffc298b2ed6ddc87c5014f06)`
- Labels (for triage/resolver): `feedback`
- Reconcile: sharpen `No RTL / mounted-widget harness for ReservationWidget`
- Target file: `docs/findings/test-debt.md`

### Planned delegations (grouped by target file)

**`docs/findings/test-debt.md`** — `docs-updater` applies in order:

- `sharpen [loc-122-p8k2]` · replace the open line at `docs/findings/test-debt.md:190` (`No RTL / mounted-widget harness for ReservationWidget`) with the proposed line above

## PHASE 5 Execution Todos

| Todo id            | Delegation                                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test-debt-phase5` | Invoke `docs-updater`: apply 1 write to `docs/findings/test-debt.md` (`sharpen [loc-122-p8k2]`), line stamped `(found: coderabbit/PR/7e5ff22745e4a8370d1d04ab11344f4c942d5c20/cr-comment:v1:ffc298b2ed6ddc87c5014f06)` |

## Clarifications Needed

none

## Routed Elsewhere

none

## Next in the Cycle

- **Default (ledger captures):** → `/triage` after PHASE 5 `docs-updater` completes.

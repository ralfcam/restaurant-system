# RES-75 allergen capture

## Execution Protocol (PHASE 5 — after plan approval)

You are a **design orchestrator**, not `/sdd-to-tdd`. When this plan is
executed:

- In managed Cloud, the approved managed-Cloud work-order MUST exist before
  the first write or delegation. Execute only the exact todos it lists.
- Your **only** writes are: (1) the approved spec write — the **one** new spec
  file under `docs/specs/**` (design owns spec authorship for this
  genuinely-new case directly — no `tdd-*` subagent, no TDD loop; that begins
  only once `/sdd-to-tdd` picks up the file); (2) the optional
  `docs-updater` delegation — only if the dialogue surfaced out-of-scope
  deferrals — appending them to `docs/findings/product-gaps.md`; and (3) the
  single approved comment-only CLARIFY — only for an unresolved tracked
  blocker whose exact comment was approved, one `linear-resolver` CLARIFY
  delegation.
- You MUST NOT edit `app/**`, `components/**`, `hooks/**`, `lib/**`,
  `src/**`, `supabase/**`, or `tests/**`, and MUST NOT delegate a subagent to
  do so. `/design` produces a spec, nothing else.
- You MUST NOT edit an **existing** spec file — STEP 1's hub walk already
  routed that case to `/sdd-to-tdd @<canonical-file>` before execution began.
- You MUST NOT call Linear MCP directly. Except for the bounded approved
  CLARIFY delegation above, do not delegate `linear-resolver` or mutate an
  issue.
- You MUST NOT auto-run `/sdd-to-tdd` — surface it as the Next step, a
  separate operator-initiated turn.
- If out-of-scope deferrals exist, delegate **one** `docs-updater` Task (same
  ledger-line shape and provenance convention as `/capture` PHASE 5). The model
  is pinned in that agent's frontmatter (`model: inherit[fast=false]`).
  **Never pass `model` on the Task call** — omitting it lets the pin apply;
  copying the parent chat's model overrides it and is forbidden unless the
  operator explicitly requested that model for this run:
  `"Use the docs-updater subagent to apply design ledger writes to
docs/findings/product-gaps.md: append '<full ledger line>'; … ; cite
docs/findings/README.md entry format."` Each line stamped
  `(found: design/<plan-slug>/<item-slug>)`.
- When the spec file is written, the optional `docs-updater` delegation (if
  any) is done, and the single approved comment-only CLARIFY (if any) is
  done, the run is **complete** — point to `/sdd-to-tdd @docs/specs/<file>`
  FEATURE and stop. Do not continue into decomposition or code.

## Mode Check

- Plan Mode: CLOUD-MANAGED (interactive)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-75-allergen-capture.plan.md`

## Hub Walk (STEP 1)

- Domain considered: guest reservation details (`docs/specs/booking-rules.md`)
- Existing owner found: none. No allergen column. RES-PRIV lists the guest INSERT columns and does not include allergens.
- Outcome: proceeding as greenfield. The new spec keeps that allowlist and writes the column with the service role.

## Milestone Route (STEP 1B)

- Work type: requirements/spec
- Route: M2
- Mixed design + implementation: no

## Dialogue Summary (STEP 2)

- **Where it is stored** — recommended: nullable text on the reservation row, not a code list → operator authorized recommended assumptions.
- **Guest INSERT allowlist** — recommended: keep booking-rules AC-5 and write `allergens` with the service role after insert → operator authorized recommended assumptions.
- **Empty value** — recommended: null is allowed and completion still works → from the issue, kept.

## Draft Spec (approved)

Path: `docs/specs/allergen-capture.md`

## Out-of-Scope Deferrals

| Item | Why deferred | Severity |
| ---- | ------------ | -------- |
| Allergen code list | v1 is free text up to 500 characters | low |
| Allergen rollup on the guest ficha | v1 shows the value on its reservation | low |
| Guest INSERT allowlist change | booking-rules AC-5 stays; the service role writes the column | low |

## Clarifications Needed

none

## PHASE 5 Execution Todos

| Todo id | Delegation |
| --- | --- |
| `write-spec` | Write `docs/specs/allergen-capture.md` |
| `product-gaps-phase5` | Append the three deferrals to `docs/findings/product-gaps.md` |

## Next in the Cycle

→ `/sdd-to-tdd @docs/specs/allergen-capture.md` FEATURE

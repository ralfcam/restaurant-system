# RES-69 restaurant cover capacity

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
- Work-order: `.cursor/plans/res-69-cover-capacity.plan.md` after explicit approval

## Hub Walk (STEP 1)

- Domain considered: floor seating and cover limits (`docs/specs/scheduling.md`, `docs/specs/booking-rules.md`)
- Existing owner found: none. CL-2 and CL-3 are per-slot and per-service `max_covers`. BW-9 occupancy capacity stays `sum(tables.seats)`. Neither is a restaurant-wide seat ceiling on the floor plan.
- Outcome: proceeding as greenfield

## Milestone Route (STEP 1B)

- Work type: requirements/spec
- Route: M2
- Mixed design + implementation: no

## Dialogue Summary (STEP 2)

- **Where the ceiling lives** — recommended: a nullable integer on `restaurant_settings`, null meaning unset, enforced on the table write path → confirmed.
- **Saving below the current sum** — recommended: refuse that save; a maximum equal to the sum is allowed → confirmed. Lowering seats and deleting a table stay allowed.
- **Who can set it** — recommended: any staff session that can edit floor tables, including `super_admin`, on `/admin/floor`, and clearing back to null is allowed → confirmed.
- **Scope** — confirmed.
- **Acceptance criteria CC-1–CC-9** — confirmed.
- **Go ahead** — confirmed on this exact spec.

## Draft Spec (approved)

Path: `docs/specs/cover-capacity.md`

# Restaurant cover capacity

**Status:** Draft
**Last updated:** 2026-10-02

## Scope

Staff on `/admin/floor` can set a restaurant-wide maximum cover capacity. The value is `restaurant_settings.max_cover_capacity` on the settings row `id = 1`, a nullable integer. Null means unset. The action uses `requireStaffUser` and the service-role client, the same gate as floor-table edits. Any staff session that can edit floor tables can set or clear it, including `super_admin`. A guest cannot write it.

The total being capped is `sum(tables.seats)`. While the column is null, creating a table or raising a table's seats is refused, and the floor prompts staff to set the maximum. A set value must be an integer of at least 1. Saving a value below the current sum is refused and leaves tables unchanged. Saving a value equal to the current sum is allowed, and then no further seats can be added. When a value is set, `createTable` and a seat increase through `updateTableState` are refused when the resulting sum would exceed it, even if the floor UI is bypassed. Lowering seats and `deleteTable` stay allowed and both reduce the sum. Clearing the column back to null is allowed, and then creates and seat increases are refused again until it is set.

Per-table seats stay in 1–12. Booking occupancy stays `sum(tables.seats)` ([booking-rules.md](./booking-rules.md) BW-9). Per-slot and per-service `max_covers` stay ([scheduling.md](./scheduling.md) CL-2 and CL-3).

Out of this spec: a change to the booking-occupancy formula, a change to slot or service cover limits, automatically removing seats to fit a lower maximum, and a guest-facing control.

## Acceptance criteria

1. **CC-1 — Staff gate.** Setting and clearing `max_cover_capacity` uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot change it. A `super_admin` session can. The control lives on `/admin/floor` with `data-testid="floor-max-cover-capacity"`.

2. **CC-2 — Nullable ceiling.** The settings row `id = 1` stores `max_cover_capacity` as a nullable integer. Null is unset. A guest cannot write the column.

3. **CC-3 — Unset blocks growth.** While the column is null, `createTable` and a seat increase through `updateTableState` write nothing. The floor shows a prompt with `data-testid="floor-max-cover-prompt"`. Lowering seats and `deleteTable` still succeed.

4. **CC-4 — Integer of at least 1.** `0`, a negative, a fraction, and a non-number are refused. The stored value is unchanged.

5. **CC-5 — Not below the current sum.** Saving a maximum below `sum(tables.seats)` is refused. Tables and the stored maximum are unchanged. Saving a maximum equal to that sum succeeds.

6. **CC-6 — Write path.** When a maximum is set, `createTable` or a seat increase whose resulting sum would exceed it writes nothing, even if the floor UI is bypassed. The refusal tells staff that the restaurant's maximum cover capacity has been reached. A change whose resulting sum is on or under the maximum succeeds. When the sum already equals the maximum, no additional seat can be created.

7. **CC-7 — Shrink stays allowed.** Lowering a table's seats and `deleteTable` succeed while a maximum is set. The new sum is the previous sum minus the removed seats.

8. **CC-8 — Clear.** Setting the column back to null succeeds. After that, `createTable` and seat increases write nothing until a maximum is set again.

9. **CC-9 — Neighbor rules stay.** `updateTableState` still keeps seats in 1–12. Booking occupancy still uses `sum(tables.seats)` (BW-9). Per-slot and per-service `max_covers` (CL-2, CL-3) are unchanged.

## Out-of-Scope Deferrals

| Item | Why deferred | Severity |
| ---- | ------------ | -------- |
| Booking-occupancy formula change | BW-9 stays `sum(tables.seats)` | low |
| Slot or service cover-limit change | CL-2 and CL-3 stay as they are | low |
| Auto-remove seats to fit a lower maximum | a save below the current sum is refused | low |
| Guest-facing cover control | v1 is staff-only on `/admin/floor` | low |

## Clarifications Needed

none

## PHASE 5 Execution Todos

| Todo id               | Delegation                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `write-spec`          | Write the approved spec to `docs/specs/cover-capacity.md` directly                                  |
| `product-gaps-phase5` | Invoke the `docs-updater` subagent to append the four deferrals to `docs/findings/product-gaps.md` |

## Next in the Cycle

→ `/sdd-to-tdd @docs/specs/cover-capacity.md` FEATURE, once the spec file is written.

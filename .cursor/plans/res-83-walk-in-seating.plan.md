# RES-83 walk-in seating

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
- Work-order: `.cursor/plans/res-83-walk-in-seating.plan.md` after explicit approval

## Hub Walk (STEP 1)

- Domain considered: floor seating (`docs/specs/scheduling.md`)
- Existing owner found: none. FP-15 names walk-in seating without a reservation overlay as out of scope.
- Outcome: proceeding as greenfield

## Milestone Route (STEP 1B)

- Work type: requirements/spec
- Route: M2
- Mixed design + implementation: no

## Dialogue Summary (STEP 2)

- **Walk-in storage** — recommended: a normal reservation row, party size required, contact optional → confirmed: that row. The guest widget keeps its name-and-email requirement.
- **Initial status** — recommended: insert already `seated` on the selected table, today in the restaurant timezone, at the current time → confirmed.
- **Online party cap of 8** — recommended: it does not apply to a walk-in → confirmed. Guest bookings still reject a party larger than 8.
- **Availability trigger** — recommended: a walk-in must also pass blocked dates, closed days, opening hours, and cover caps → confirmed. The trigger gains no walk-in exception.
- **Booking confirmation email** — recommended: a walk-in does not send it → confirmed. Online booking still sends it.
- **Scope** — confirmed.
- **Acceptance criteria WI-1–WI-8** — confirmed.
- **Go ahead** — confirmed on this exact spec.

## Draft Spec (approved)

Path: `docs/specs/walk-in-seating.md`

# Walk-in seating

**Status:** Draft
**Last updated:** 2026-10-02

## Scope

Staff on `/admin/floor` can seat a walk-in on a selected table. The walk-in is a normal `reservations` row, not a separate visit record. The action uses `requireStaffUser` and the service-role client. A guest cannot create one. Floor and reservation rules live in [scheduling.md](./scheduling.md) and [booking-rules.md](./booking-rules.md).

The row is inserted already `seated`, with that table's label, for today in the restaurant timezone, at the current local time (`HH:MM`). Party size is an integer of at least 1. Name and phone may be omitted and are stored as blank strings, because those columns are `NOT NULL`. Email may be omitted and is stored as null. A non-blank phone or email must pass the existing format checks. The online party cap of 8 does not apply. The guest widget still requires a name, a valid email, and a party of at most 8.

The selected table must have enough seats, and its occupying window must not overlap another `confirmed` or `seated` reservation. The existing `validate_reservation_availability` trigger still applies, so a blocked date, a closed day, a time outside opening hours, or a full cover cap also refuses creation. There is no walk-in exception on that trigger. On success, the table group is set to `seated` the same way an existing seat transition does. Completion uses the existing `seated → completed` transition. The row gets a `conf_code` because that column is required. No booking confirmation email is sent.

Out of this spec: a separate visit table, a guest-created walk-in, a future date or a chosen time, an unassigned walk-in, a change to guest-widget validation, a change to the availability trigger, and a walk-in confirmation email.

## Acceptance criteria

1. **WI-1 — Staff gate.** The walk-in create action uses `requireStaffUser` and `createServiceClient`. An unauthenticated caller follows the existing `/admin` login redirect. An authenticated non-staff caller cannot create a walk-in. A `super_admin` session can. The control lives on the selected table at `/admin/floor` with `data-testid="walk-in-seat"`.

2. **WI-2 — Seated row.** A successful create inserts one `reservations` row with `status = 'seated'`, that table's `table_label`, `date` from `getTodayInRestaurantTZ()`, and `time` from `getNowTimeInRestaurantTZ()`. `party_size` is the submitted integer. Omitted name and phone are stored as `''`. Omitted email is stored as null. `conf_code` matches `TVL-####` and is unique. The action does not send a booking confirmation email, including when an email was stored.

3. **WI-3 — Party size.** Party size must be an integer of at least 1. `0`, a negative, a fraction, and a non-number are refused and no row is written. A party larger than 8 is accepted when the table has enough seats and the availability trigger allows it. Guest `validateReservationPayload` still rejects a party larger than 8.

4. **WI-4 — Contact format.** A non-blank phone must match `PHONE_RE`. A non-blank email must match `EMAIL_RE`. A failed check writes no row. A valid name, phone, and email are stored trimmed.

5. **WI-5 — Fit and overlap.** If the table's `seats` are below the party size, creation is refused and no row is written. If another `confirmed` or `seated` reservation on that label has an overlapping occupying window, creation is refused and no row is written. A non-overlapping reservation on that label does not block creation.

6. **WI-6 — Existing trigger.** A blocked date, a closed day, a time outside opening hours, or a full restaurant, slot, or service cover cap refuses creation and writes no row. `validate_reservation_availability` gains no walk-in exception.

7. **WI-7 — Table becomes seated.** On success, the table group is set to `seated` the same way the existing `seated` transition does. The floor overlay for that table shows the walk-in as seated, with its party size and time.

8. **WI-8 — Completion.** `transitionReservationStatus` from `seated` to `completed` on that row persists `completed`, stamps `completed_at`, clears `table_label`, and returns the table to `available`. No new status edge is added.

## Out-of-Scope Deferrals

| Item                           | Why deferred                                      | Severity |
| ------------------------------ | ------------------------------------------------- | -------- |
| Separate visit table           | v1 reuses a reservation row                       | low      |
| Guest-created walk-in          | v1 is staff-only on `/admin/floor`                | low      |
| Future date or chosen time     | v1 is today at the current restaurant-local time  | low      |
| Unassigned walk-in             | v1 requires a selected table                      | low      |
| Guest-widget validation change | name, email, and the party cap of 8 stay          | low      |
| Availability-trigger exception | walk-ins pass the current trigger                 | low      |
| Walk-in confirmation email     | online booking still sends it; a walk-in does not | low      |

## Clarifications Needed

none

## PHASE 5 Execution Todos

| Todo id               | Delegation                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `write-spec`          | Write the approved spec to `docs/specs/walk-in-seating.md` directly                                 |
| `product-gaps-phase5` | Invoke the `docs-updater` subagent to append the seven deferrals to `docs/findings/product-gaps.md` |

## Next in the Cycle

→ `/sdd-to-tdd @docs/specs/walk-in-seating.md` FEATURE, once the spec file is written.

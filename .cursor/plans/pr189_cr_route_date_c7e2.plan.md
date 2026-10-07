# pr189_cr_route_date_c7e2

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. In-loop CodeRabbit fix
`loc-189-c7e2` on PR #189. Stay on `cursor/res-122-e94a`. Skip START and
CLOSE-OUT.

- Your only direct writes are the spec edit listed in Permissions Requested,
  the findings run file, and the tdd log close-out sections. Tests come from
  `tdd-red`. Source comes from `tdd-green`. Cleanup comes from `tdd-refactor`.
- One Task call per phase. Never pass `model` on those Task calls.
- Do not edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- After close-out, format dirty paths, run the advisory CodeRabbit gate, then
  commit.md and, on PASS, push.md. Never `gh pr ready`. Never `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Workflow mode: FIX
- linear_issue: none (in-loop). Related context RES-122 / PR #189.
- local-ref: `loc-189-c7e2`
- Inert finding id: `cr-comment:v1:1ef5ba96787eae514a154dbb`
- Inert path: `components/staff/reservations-manager.tsx`
- Inert severity: unknown (adapter). Comment text labeled the issue Major.
- roundsUsed: 1
- roundCap: 3

## Issue & Root Cause

- Observed: `displayedDate` is `useState(currentDate)` where
  `currentDate` is `selectedDate`. React keeps that state for the lifetime of
  the mounted manager. The list effect fetches `displayedDate` only. A later
  `selectedDate` (browser back/forward) leaves the date input and the list on
  the previous day. Confirmed in
  `components/staff/reservations-manager.tsx` (state seed and the
  `getReservationsByDate(displayedDate)` effect). The same gap is already an
  open product-gaps line from RES-122/C1/green.
- Expected: a route `selectedDate` that staff did not just outrun updates the
  date control and the list. A route update that only confirms an earlier
  in-flight navigation does not replace a newer date staff already chose.
- Sibling: the list effect in the same component ignores a cleaned-up
  in-flight `getReservationsByDate` result so an older response cannot replace
  the latest date. The route prop has no equivalent reconciliation.
- Hypothesis: seeding `displayedDate` once, with no later `selectedDate`
  reconciliation, is sufficient to leave the control and the list stale.
  A blind `setDisplayedDate(currentDate)` on every prop change would adopt
  back/forward and would also undo a newer arrow click when an older
  `router.push` lands first.
- Missing spec rule: scheduling item 3 does not require adopting a later
  route date, and does not forbid a stale in-flight route confirmation from
  replacing a newer staff selection.

## Permissions Requested

- `docs/specs/scheduling.md` — add the route-date sentences to item 3.
- `tests/unit/reservations/date-navigation.test.ts` — add one regression
  test. Do not modify, rename, or delete the two existing tests.

## Spec edit (execute before Red)

In `docs/specs/scheduling.md` item 3, after the Today sentence, add:

When the route later supplies a different `selectedDate`, and staff have not
already selected a newer date that this update does not confirm, the date
control and the reservation list MUST show that route date (browser back and
forward). A route update that only confirms an earlier in-flight navigation
MUST NOT replace a newer date staff already chose with Previous day, Next day,
Today, or the native date input.

Do not change Today visibility (`currentDate !== todayISO`). That remains the
separate open product-gaps line.

## Contract

One new test in `tests/unit/reservations/date-navigation.test.ts`. Reuse the
file's happy-dom render, deferred `getReservationsByDate`, and `dateInput()`
helper. Do not edit the two existing tests.

Mount `selectedDate` `2026-10-07`. Rerender the same root with `selectedDate`
`2026-10-06` without clicking. The date input MUST become `2026-10-06` and
`getReservationsByDate` MUST be called with `2026-10-06`. Resolve that list
with guest `Back Guest` and assert the body contains `Back Guest`.

Then click Next day twice. The input MUST be `2026-10-08`. Rerender
`selectedDate` `2026-10-07` (the first in-flight route update). The input MUST
stay `2026-10-08`. Resolve the `2026-10-08` list with `Latest Guest` before
the `2026-10-07` list with `Stale Route Guest`. The body MUST contain
`Latest Guest` and MUST NOT contain `Stale Route Guest`.

Today's code fails the first rerender: the input stays `2026-10-07`.

Green keeps arrow, Today, and date-input navigation on `navigateToDate`.
Record each `navigateToDate` target, in order, as an in-flight route date.
When `selectedDate` changes:

- if it equals the latest in-flight date, drop the in-flight list and leave
  `displayedDate` as staff left it;
- if it equals an earlier in-flight date, drop that date and every in-flight
  date before it, and do not change `displayedDate`;
- if it equals no in-flight date, adopt it as `displayedDate` and clear the
  in-flight list.

Do not sync inside the effect that runs on `displayedDate` changes. Do not
disable the arrows. Do not change the Today visibility condition. Do not edit
`lib/timezone.ts` or `app/admin/reservations/page.tsx`.

## TDD Execution Loop

### C-route — route date vs newer staff selection

- **C-route-red:** Invoke the `tdd-red` subagent to add the failing test
  "a later route date updates the list unless a newer staff date is in flight"
  in `tests/unit/reservations/date-navigation.test.ts`.
  Command: `pnpm test:unit tests/unit/reservations/date-navigation.test.ts`.
  Exit: that new test fails because the input stays `2026-10-07` after the
  rerender to `2026-10-06`. The two existing tests still pass.
- **C-route-green:** Invoke the `tdd-green` subagent to reconcile
  `selectedDate` in `components/staff/reservations-manager.tsx` as the
  Contract states. Command: the same unit file. Exit: 3 tests passed.
- **C-route-refactor:** Invoke the `tdd-refactor` subagent. Scope is only
  the reconciliation added for this criterion. Command:
  `pnpm test:unit tests/unit/reservations/date-navigation.test.ts` plus
  `pnpm lint` and `pnpm typecheck` on the touched files. Exit: still 3
  passed, lint and typecheck clean.

## Close-out

Skip Linear START and CLOSE-OUT. Append this run to
`docs/verifier-reports/tdd/res-122_date_nav_e94a.md` (do not open a second
tdd log). The open product-gaps line "Date control and list ignore a later
`selectedDate` prop" is this defect; mark it resolved in-run when the
criterion ships. Do not re-file it. Leave the Today-visibility line open.

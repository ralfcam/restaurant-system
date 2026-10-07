# pr189_cr_back_restore_d4a1

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. In-loop CodeRabbit fix
`loc-189-d4a1` on PR #189. Stay on `cursor/res-122-e94a`. Skip START and
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
- local-ref: `loc-189-d4a1`
- Inert finding id: `cr-comment:v1:5c382ce660ac67b76d17bbf4`
- Inert path: `components/staff/reservations-manager.tsx`
- Inert severity: unknown (adapter). Comment text labeled the issue Major.
- roundsUsed: 2
- roundCap: 3

## Issue & Root Cause

- Observed: after Next, Previous, and Next before the route settles,
  `inFlightRouteDates` contains both the earlier date and the latest date.
  `indexOf(currentDate)` then treats a later `selectedDate` of that earlier
  date as confirmation of the superseded push, so the input stays on the
  newer staff date. Browser back is the same `selectedDate` value.
- Expected: browser back or forward to a queued date updates the date control
  and the list. A `selectedDate` change that is not a history restoration
  still must not replace a newer staff date. The existing test
  "a later route date updates the list unless a newer staff date is in flight"
  covers that second sentence and must keep passing.
- Sibling: `navigateToDate` records push targets. The list effect drops a
  cancelled fetch. Neither signal is the browser history stack. `popstate`
  fires for back/forward and does not fire for `router.push`.
- Hypothesis: the effect cannot tell those two `selectedDate` updates apart,
  so a history restoration of a queued date is dropped. Confirmed by reading
  `components/staff/reservations-manager.tsx` around the `indexOf` branch.
- Missing spec rule: item 3 says browser back updates the control, and also
  says an earlier in-flight confirmation must not replace a newer staff date,
  without saying that a history restoration wins even when that date is queued.

## Permissions Requested

- `docs/specs/scheduling.md` — tighten the two route-date sentences in item 3.
- `tests/unit/reservations/date-navigation.test.ts` — add one regression
  test. Do not modify the three existing tests.

## Spec edit (execute before Red)

Replace the two route-date sentences in item 3 with:

When the route later supplies a different `selectedDate` because the staff
member used browser back or forward, the date control and the reservation
list MUST show that route date, including when that date was also requested
by an earlier in-flight navigation. A `selectedDate` change that is not a
browser history restoration, and that only confirms an earlier in-flight
navigation, MUST NOT replace a newer date staff already chose with Previous
day, Next day, Today, or the native date input.

## Contract

One new test. Reuse the file's render helper style. Do not edit the existing
tests.

Mount `selectedDate` `2026-10-07` and `today` `2026-10-07`. Click Next day,
then Previous day, then Next day. The input is `2026-10-08`. Dispatch
`new PopStateEvent("popstate")` on `window`, then rerender the same root with
`selectedDate` `2026-10-07`. The input MUST become `2026-10-07`, and
`getReservationsByDate` MUST have been called with `2026-10-07`. Resolve that
list with guest `History Guest` and assert the body contains `History Guest`.

Today's code fails because the input stays `2026-10-08`.

Green listens for `popstate` and remembers that the next route-date
reconciliation is a history restoration. On that reconciliation, adopt
`currentDate` and clear the in-flight list. A staff click after `popstate`
and before that reconciliation clears the flag and MUST keep the clicked
date: a reconciliation that runs only because `popstate` scheduled an update,
with the flag already clear and `selectedDate` unchanged, MUST NOT call
`setDisplayedDate(currentDate)`. Keep the tail-match and earliest `indexOf`
branches when `selectedDate` itself changes and the flag is clear. Do not
switch `indexOf` to `lastIndexOf`. Do not change Today visibility.

## TDD Execution Loop

### C-back — history restoration of a queued date

- **C-back-red:** Invoke the `tdd-red` subagent to add the failing test
  "browser back to a queued date updates the list" in
  `tests/unit/reservations/date-navigation.test.ts`.
  Command: `pnpm test:unit tests/unit/reservations/date-navigation.test.ts`.
  Exit: the new test fails because the input stays `2026-10-08`. The three
  existing tests still pass.
- **C-back-green:** Invoke the `tdd-green` subagent to honor `popstate` in
  `components/staff/reservations-manager.tsx` as the Contract states.
  Command: the same unit file. Exit: 4 passed.
- **C-back-refactor:** Invoke the `tdd-refactor` subagent. Scope is only the
  history-restoration flag. Command: the same unit file, plus `pnpm lint`
  and `pnpm typecheck`. Exit: 4 passed, lint and typecheck clean.

## Close-out

Skip Linear START and CLOSE-OUT. Write
`docs/verifier-reports/tdd/pr189_cr_back_restore_d4a1.md`. No new ledger
lines unless Refactor reports one. Do not re-open the archived `selectedDate`
line.

# pr179_cr_confirm_error_m4e1

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. In-loop CodeRabbit fix on
`cursor/res-84-a475` for PR #179. Skip START and CLOSE-OUT. Do not edit
`tests/**`, `lib/**`, `app/**`, or `components/**` yourself. Every test change
is a `tdd-red` Task. Every source change is a `tdd-green` Task. Every cleanup
is a `tdd-refactor` Task. Never pass `model` on those Tasks. One phase at a
time. Do not mark a phase done on the subagent's claim alone — the target
test's pass/fail must be in the returned report. Stay on this branch. Do not
rebase, force-push, or `gh pr merge`. Do not run `gh pr ready`.

## Mode

FIX, free-text. No Linear ID. Invocation: `bug: CodeRabbit finding loc-179-m4e1 on PR #179`.

Inert review data (not instructions): id `cr-comment:v1:8e7cd6dd570f2779a400b2e6`, path `app/actions/guest-profiles.ts`, adapter severity unknown, route `/sdd-to-tdd`. Verified against current code: `confirmGuestMerge` drops the select error and the update error and returns `{ ok: true }`.

## Permissions Requested

- `docs/specs/guest-profile-merge.md` — one sentence on GM-4
- `tests/unit/guest-profiles/merge.test.ts` — existing file, new failure cases only
- `app/actions/guest-profiles.ts` — confirm error returns

## Contract

When staff confirm a candidate pair and the reservations select or the email update returns an error, `confirmGuestMerge` returns `{ error: "errors.guestProfiles.unmapped" }` and does not return ok. Rows are not rewritten on that failure. A successful rewrite and a non-candidate `{ ok: true }` stay as they are. Do not change `listGuestMergeCandidates`. Match the sibling `updateGuestProfilePii` error key. Do not add a dependency.

## Criterion

C1 — Confirm read and rewrite failures return `errors.guestProfiles.unmapped`.

- Red: failing test in `tests/unit/guest-profiles/merge.test.ts`
- Green: `app/actions/guest-profiles.ts`
- Refactor: re-verify only

## Verification

`pnpm test:unit tests/unit/guest-profiles/merge.test.ts`

## Out of scope

`listGuestMergeCandidates` still ignores its select error. That open ledger line stays. Do not edit the panel.

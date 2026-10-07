# pr179_cr_page_reads_p2a8

## Execution Protocol (MANDATORY — read first when executing this plan)

Orchestrator only. In-loop CodeRabbit fix on `cursor/res-84-a475` for PR #179.
Skip START and CLOSE-OUT. Test edits come from `tdd-red`. Source edits come
from `tdd-green`. Cleanup comes from `tdd-refactor`. Never pass `model`.
One phase at a time. Do not edit tests or source yourself. Stay on this
branch. No rebase, force-push, `gh pr merge`, or `gh pr ready`.

## Mode

FIX, free-text. Invocation: `bug: CodeRabbit finding loc-179-p2a8 on PR #179`.

Inert review data: `cr-comment:v1:ce7858bec24fc46cb07488a9` on
`app/actions/guest-profiles.ts`. Adapter severity unknown. Verified against
the code: `listGuestMergeCandidates` and `confirmGuestMerge` each
`select("id, email, phone")` once. `supabase/config.toml` sets
`max_rows = 1000`. A later row never reaches `mergeCandidateEmails`.
`getFloorSnapshot` already pages with `.order("id").range` in
`app/actions/reservations.ts`.

The other open thread (`cr-comment:v1:97e5896ad10bb366f22dfb61`, opposite
confirms) is already on `docs/findings/tech-debt.md` as "Candidate read and
rewrite are not atomic" and "Opposite survivor buttons can both be in flight".
Do not add a migration or a lock in this plan.

## Permissions Requested

- `tests/unit/guest-profiles/merge.test.ts`
- `app/actions/guest-profiles.ts`

## Contract

Both the candidate list and confirm read every reservation page, ordered by
`id` ascending, in ranges of 1000, and stop on a short page. A matching phone
on a later page is still a candidate, and confirm still rewrites that email.
A page error on confirm returns `{ error: "errors.guestProfiles.unmapped" }`.
Do not change the ok paths for blank, same-email, or non-candidate pairs.

## Criterion

C1 — A reservation past the first 1000 rows still counts as a merge candidate.

## Verification

`pnpm test:unit tests/unit/guest-profiles/merge.test.ts`

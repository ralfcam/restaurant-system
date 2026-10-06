# res-84_guest_profile_merge_a475

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/res-84_guest_profile_merge_a475.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-84_guest_profile_merge_a475.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-84_guest_profile_merge_a475.plan.md` (repository work-order, not a
  silently accepted native Cursor Plan). After a spec or living-findings
  (`docs/findings/<category>.md`) write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees (`docs/eval`,
  `docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. Run them
  sequentially, one **phase** at a time (not one criterion at a time), honoring
  each phase's exit condition before the next Task call.
- **Do not mark a phase done on subagent assertion alone**
  ([.cursor/rules/verification-before-completion.mdc](.cursor/rules/verification-before-completion.mdc)).
  A phase's "GREEN ✓" / "RED ✓" report is that subagent's claim; before
  advancing to the next Task call, the phase's own exit condition (the target
  test's actual pass/fail status) must be visible in the returned report — not
  assumed from a prior phase or from memory.
- **One Task call per phase.** Each todo is a single phase delegation; do not
  satisfy a bundled "drive criterion X" todo by doing Red+Green+Refactor in one
  turn, and do not treat a "same as the previous criterion" note as license to
  self-implement. If a phase lacks its own explicit entry, STOP and ask rather
  than improvising it inline.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`. Agent frontmatter owns the model; do not
  copy the parent chat's model into Task. Omitting `model` lets the pin apply;
  passing it overrides the pin and is forbidden unless the operator explicitly
  requested that model for this run.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself. If you are about to, STOP and issue the
  matching `Use the <agent> subagent to …` Task call instead.
  **Exception (mechanical only):** after close-out (docs-updater + 4C) and before
  STEP 4F, you MAY run `pnpm exec prettier --write` via Shell on
  paths already dirty from this run (`git status --porcelain`). Never
  `prettier --write .`. This is not a substitute for `tdd-*` implementation
  writes.
- Docs sync = `docs-updater` (background). **Wait for its report in-thread**
  before 4C. After 4C/4B, run the format pass, then STEP 4G, then STEP 4F. Linear
  START (one bounded `Work started:` summary comment on the invoked issue —
  no In Progress/In Review/Done write), close-out (resolution comment only), AND
  out-of-scope finding registration = `linear-resolver`. Do not do their work
  inline. START is the first execution Task when a tracked issue exists, invoked
  with `run_in_background: true`. Do **not** wait for START before spec edits or
  Criterion 1 Red. A later `## Linear — BLOCKED` is visibility-only. Non-blocking
  does not make the summary comment optional. A solo `start-linear` todo
  launches only START (nothing else to continue).
- **Clarification is a separate stop path.** Before START/spec/Red, an
  unresolved tracked route/spec decision emits and executes only the approved
  `clarify-<RES-id>` `linear-resolver` CLARIFY todo. The resolver may use only
  `list_comments` and `save_comment`; no state/scope write is allowed. Stop
  after the comment result and wait for a later human answer plus command
  re-run. A clarification comment is a Slack visibility trigger only, never an
  In Review/Done trigger.
- **START before the loop (launch, do not wait).** When STEP 2B applies (FIX
  Linear ID/URL, or FEATURE `linear_issue` set), the first Task call on
  execution is `linear-resolver` START (`run_in_background: true`) on the
  invoked issue: post the filled-in `## Linear Plan Digest` as the single
  `Work started:` summary comment. Do **not** wait, poll, or `AwaitShell` for that
  Task. Then — if further todos were assigned — the approved spec edit (FIX) or
  Criterion 1 Red immediately. Only BLOCKED or no tracked issue exempts the
  summary comment (the background agent still reports BLOCKED; the
  orchestrator does not wait to learn it). A stale `start-linear` todo
  **cannot override STEP 2B**: if it waits for START, ends the turn, or lacks
  `run_in_background: true`, ignore that wait/stop wording and follow this
  bullet.
- **Close-out sequence (mandatory):** 4D → 4E → Docs sync packet → Step 4
  (docs-updater) → 4C → 4B (FIX) → **format pass** (`pnpm exec prettier --write`
  on this run's dirty paths from `git status --porcelain`; never `.`) → **STEP 4G
  (mandatory advisory local CodeRabbit attempt; ignored audit receipt; do not write the
  receipt into the tdd log)** → then
  STEP 4F (**local:** point to `/commit`; **managed Cloud:** execute
  `.cursor/commands/commit.md`, and on PASS execute
  `.cursor/commands/push.md`). After each Refactor phase, append that
  criterion's `Suggested review order:` and `Reusable pattern:` lines to
  `docs/verifier-reports/tdd/res-84_guest_profile_merge_a475.md` (Step 3). At close-out: collate
  **`## Suggested Review Order (collated)`** into the tdd log (4D); append
  **`## Traceability (final)`** (4E); assemble the **Docs sync packet**; delegate
  `docs-updater` with the packet (Step 4). Pattern promotion and Implementation
  trace mirror happen via docs-updater from the packet. The Refactor
  `## Residual findings` block is an **adversarial** pass — treat a bare "none"
  as suspect, not as a clean bill.
- **Out-of-scope findings are tracked in the run file, merged to the bus at
  close-out, never dropped or chased.** Do not expand a criterion to fix an
  incidental discovery. Every phase report ends with a `[category]`-tagged
  `## Residual findings` block; **immediately after each phase returns, run a
  revision pass on `docs/findings/runs/res-84_guest_profile_merge_a475.md`** (matching `## <category>`
  section) before the next Task call — never carry findings only in memory. The
  pass reconciles, it doesn't blind-append: remove entries this phase resolved
  in-run, dedupe/sharpen existing ones, append only genuinely new out-of-scope
  items that no later criterion handles, and drop process notes. At close-out,
  **merge** the run file's open lines into the matching `docs/findings/<category>.md`
  (dedupe/sharpen), delegate `linear-resolver` to read the (already-curated)
  `docs/findings/*.md` (plus the plan's Out-of-Scope Findings table), file the
  findings as linked Linear issues (your confirmation gates creation — managed
  Cloud does not auto-confirm net-new finding issues; persist to the ledger and
  continue), then
  **prune** each registered entry into `docs/findings/archive.md` with its issue
  id via `docs-updater` ledger-apply and **delete the run file** (never truncate
  it). If Linear is unavailable, the merged
  category files ARE the fallback backlog.
- **A skipped test is not progress** (see
  [.cursor/rules/test-execution-integrity.mdc](.cursor/rules/test-execution-integrity.mdc)).
  No phase advances on a test that did not execute — that is a BLOCKER, never a
  Red/Green/Refactor pass. Ensure local Supabase is up and seeded
  (`npx supabase start && npx supabase db reset --local`) before the loop and
  run integration phases with `pnpm test:integration` (fail-closed). For e2e phases,
  ensure the local app + seed/storage-state are ready and run
  `pnpm exec playwright test <path> --project=chromium-desktop` (or
  `pnpm test:e2e:chromium <path>`). If a phase returns `BLOCKED (infra)`, STOP
  and report the remedy.
- If you cannot delegate (Task tool unavailable in this mode), STOP and report —
  do not self-implement. Managed Cloud one-shot does not waive this STOP.
- **Managed Cloud one-shot:** after the work-order exists at
  `.cursor/plans/res-84_guest_profile_merge_a475.plan.md`, execute immediately. Do not wait for a
  second plan accept. Do not auto-confirm new Linear finding issues. After a
  successful close-out (format pass complete; START BLOCKED remains
  visibility-only), execute `.cursor/commands/commit.md`; on PASS execute
  `.cursor/commands/push.md`. Cloud one-shot does not waive evidence,
  clarification, infra, delegation, phase-exit, write-scope, verification,
  CHANGES-REQUESTED, or `/push` safety STOPs. Never `gh pr ready`. Never
  `gh pr merge`.
- If the delegation-guard hook is installed, arm it as your FIRST execution
  action (`node .cursor/hooks/tdd-guard.mjs on`) and disarm it as your LAST
  (`node .cursor/hooks/tdd-guard.mjs off`). Before each phase's Task call, set
  the active phase (`node .cursor/hooks/tdd-guard.mjs phase red|green|refactor`)
  so the guard enforces that phase's write scope on the subagent — Red confined
  to `tests/**`, Green/Refactor blocked from touching `tests/**`; clear it
  (`phase clear`) once the criterion's Refactor exits green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-84_guest_profile_merge_a475.plan.md`
- Workflow mode: FIX
- linear_issue: RES-84

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, identifier `P-RES-12`, `versionKey` `V-0.5`). Precedence: RES-84 already sits on this project. V-0.1 and V-0.2 are Completed. Do not move it.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off because `/design` already shipped `docs/specs/guest-profile-merge.md`. Governing criteria GM-1–GM-6 are testable. Do not `save_issue` the milestone. Do not re-clarify.
- Mixed design + implementation: no
- Clarification: answered 2026-10-05, option 3 (staff pick the surviving email). Ready brief complete.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-84 — staff have no way to find phone-matched duplicate fichas or confirm a merge. Expected: list candidates and rewrite the other email's reservations onto the email the staff member selects.
- Missing constraint (root cause): none in the spec. GM-1–GM-6 already require the gate, the candidate rule, no automatic merge, the surviving-email rewrite, unrelated rows, and refused pairs. The code has no merge action and no `data-testid="guest-merge"`.
- Spec update proposed: none. Do not edit `docs/specs/guest-profile-merge.md`. First execution action after START is Criterion GM-1 Red.

## Spec

- Source: existing `docs/specs/guest-profile-merge.md`
- Summary: A candidate pair is two different non-blank normalized emails that share one normalized phone. Phone normalization is trim, then remove U+0020 spaces; an empty result is not a phone. Staff confirm which email survives. Reservations on the other email have `email` rewritten to `normalizeGuestEmail(surviving)`. Rows are not copied or deleted. The surviving ficha then lists both histories, newest `date` then `time` first, with unique reservation ids. Other emails, and null or blank emails, stay unchanged. Nothing merges until confirm.
- Clarifications needed: none. Pre-mortem (a merge that copies rows, or a blank email swept into the rewrite) is already GM-4 and GM-5. Inversion (a test that only checks an export exists) is blocked by asserting the update payload, the `email_normalized` filter, the absent insert/delete, and that `data-testid="guest-merge"` offers both emails as the survivor.

## Contract (every phase reads this)

New file only: `tests/unit/guest-profiles/merge.test.ts`. Do not edit any existing test. Do not add catalog keys. Do not edit `messages/**` or `supabase/**`.

Exports to add, and no others:

- `normalizeGuestPhone(phone: string | null | undefined): string | null` in `lib/guest-profiles.ts`. Trim, then delete U+0020 spaces. Empty → `null`.
- `mergeCandidateEmails(rows, email): string[]` in `lib/guest-profiles.ts`. Rows are `{ email: string | null; phone: string | null; guest_name?: string | null }`. Returns sorted unique other normalized emails that share one non-blank normalized phone with the subject email. A blank subject email returns `[]`. A blank row email is not a ficha. Same `guest_name` with different phones is not a candidate.
- `listGuestMergeCandidates(email: string)` in `app/actions/guest-profiles.ts`. `requireStaffUser`, then `createServiceClient().from("reservations").select("id, email, phone")`, then `mergeCandidateEmails`. Returns `{ candidates: string[] }` or `{ error: "errors.guestProfiles.unauthorized" }`. No insert, update, or delete.
- `confirmGuestMerge({ survivingEmail, otherEmail })` in the same actions file. Same gate. Normalize both with `normalizeGuestEmail`. If either is null or they are equal, write nothing and return `{ ok: true }`. Otherwise select `id, email, phone`, and update only when `mergeCandidateEmails` includes the other email: `.update({ email: survivingNormalized }).eq("email_normalized", otherNormalized).select("id")`. Otherwise write nothing and return `{ ok: true }`. A write error returns `{ error: "errors.guestProfiles.unmapped" }`.

UI, no new `t()` keys:

- `app/admin/customers/[email]/page.tsx` calls `listGuestMergeCandidates` and passes `mergeCandidates` into `GuestProfilePanel`.
- `components/staff/guest-profile-panel.tsx` renders `data-testid="guest-merge"`. For each candidate `other`, two submit controls call `confirmGuestMerge`: one with `survivingEmail` = `profile.email` and `otherEmail` = `other`; one with those swapped. Visible label is the surviving email. Then `router.refresh()`. Do not add `type="email"`. Do not put `notes` in an input. Leave the PII form untouched.

`buildGuestProfile` already sorts newest `date` then `time` and filters by normalized email. Do not change that sort.

## Acceptance Criteria → Tests

All six criteria are decidable with a mocked service client and source reads. No integration, e2e, or manual-UAT layer.

| #    | Criterion          | Risk | Layer | Test file                                 | New or existing | Test name                                                                           | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Command                                    | Depends on |
| ---- | ------------------ | ---- | ----- | ----------------------------------------- | --------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| GM-1 | Staff gate         | P0   | unit  | `tests/unit/guest-profiles/merge.test.ts` | new file        | `listing and confirming a merge require staff and the ficha control is guest-merge` | Namespace import: both action exports are functions. `requireStaffUser` null → both return `errors.guestProfiles.unauthorized` and `createServiceClient` is not called. A resolved staff user and a resolved `{ id: "super-admin-1" }` each call `createServiceClient`. Action source calls `requireStaffUser` and does not call `requireSuperAdminUser`. `lib/supabase/is-staff-user.ts` treats `super_admin` as staff. `lib/supabase/proxy.ts` still contains `user ? "/" : "/auth/login"`. Panel source contains `data-testid="guest-merge"`. Page source calls `listGuestMergeCandidates` and passes `mergeCandidates`. | `pnpm test:unit tests/unit/guest-profiles` | none       |
| GM-4 | Surviving email    | P0   | unit  | same                                      | new `it`        | `confirm rewrites the other email onto the surviving email and does not copy rows`  | Candidates `Ada@ex.com` / `+41 79 111 22 33` and `bob@ex.com` / `+41791112233`, ids `r1` date `2026-01-02` time `18:00`, `r2` date `2026-06-01` time `19:00`, `r3` date `2026-06-01` time `12:00` on bob. `confirmGuestMerge({ survivingEmail: "Ada@ex.com", otherEmail: "bob@ex.com" })` updates `{ email: "ada@ex.com" }` with `.eq("email_normalized", "bob@ex.com")` and `.select("id")`. No insert. No delete. After that update, `buildGuestProfile("ada@ex.com", rows)` history ids are `r2`, `r3`, `r1`, each once.                                                                                                 | same                                       | GM-1       |
| GM-5 | Unrelated rows     | P0   | unit  | same                                      | new `it`        | `confirm leaves a third email and a blank email unchanged`                          | Add `cara@ex.com` phone `+41 79 999 00 00` id `r4`, and `{ email: null, phone: "+41 79 111 22 33", id: "r5" }` plus `{ email: "  ", phone: "+41 79 111 22 33", id: "r6" }`. Confirm ada survives and bob is other. The only update filter is `email_normalized` = `bob@ex.com`. `r4`, `r5`, and `r6` keep their emails.                                                                                                                                                                                                                                                                                                     | same                                       | GM-4       |
| GM-2 | Candidates         | P1   | unit  | same                                      | new `it`        | `candidates share one normalized phone and the list does not write`                 | `typeof mergeCandidateEmails` and `typeof normalizeGuestPhone` are `function`. Spaced and unspaced forms of the same phone match. Different phones do not. `null`, `""`, and `"   "` do not. Same `guest_name` with different phones does not. Blank subject email returns `[]`. A blank row email is not listed. Duplicate rows return the other email once, sorted. `listGuestMergeCandidates("ada@ex.com")` returns those candidates and records no insert, update, or delete.                                                                                                                                           | same                                       | GM-1       |
| GM-6 | Refused pair       | P0   | unit  | same                                      | new `it`        | `confirm writes nothing for a non-candidate, the same email, or a blank email`      | Different phones: no insert, update, or delete. `confirmGuestMerge({ survivingEmail: "ada@ex.com", otherEmail: "ada@ex.com" })` writes nothing. `confirmGuestMerge({ survivingEmail: "ada@ex.com", otherEmail: "  " })` writes nothing. A real candidate pair still updates.                                                                                                                                                                                                                                                                                                                                                | same                                       | GM-2, GM-4 |
| GM-3 | No automatic merge | P1   | unit  | same                                      | new `it`        | `opening the ficha and listing candidates writes no email change`                   | With a real candidate pair loaded, `getGuestProfile("ada@ex.com")` and two `listGuestMergeCandidates("ada@ex.com")` calls record no insert, update, or delete. Page source does not call `confirmGuestMerge`. Inside `data-testid="guest-merge"`, the panel calls `confirmGuestMerge` with both survivors: `survivingEmail` = `profile.email` and `otherEmail` = the candidate, and the swap. Button text is the surviving email. No `type="email"`.                                                                                                                                                                        | same                                       | GM-1, GM-2 |

## Traceability Matrix

| Criterion | Spec ref                    | Test file::name                                              | Source file(s)                                                                                                | Risk | Status  |
| --------- | --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| GM-1      | guest-profile-merge.md GM-1 | merge.test.ts::listing and confirming a merge require staff… | app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, components/staff/guest-profile-panel.tsx | P0   | planned |
| GM-4      | guest-profile-merge.md GM-4 | merge.test.ts::confirm rewrites the other email…             | app/actions/guest-profiles.ts, lib/guest-profiles.ts                                                          | P0   | planned |
| GM-5      | guest-profile-merge.md GM-5 | merge.test.ts::confirm leaves a third email…                 | app/actions/guest-profiles.ts                                                                                 | P0   | planned |
| GM-2      | guest-profile-merge.md GM-2 | merge.test.ts::candidates share one normalized phone…        | lib/guest-profiles.ts, app/actions/guest-profiles.ts                                                          | P1   | planned |
| GM-6      | guest-profile-merge.md GM-6 | merge.test.ts::confirm writes nothing for a non-candidate…   | app/actions/guest-profiles.ts, lib/guest-profiles.ts                                                          | P0   | planned |
| GM-3      | guest-profile-merge.md GM-3 | merge.test.ts::opening the ficha and listing candidates…     | app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, components/staff/guest-profile-panel.tsx | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Reuse: `tests/unit/guest-profiles/staff-gate.test.ts` mock shape; `normalizeGuestEmail` and `buildGuestProfile` in `lib/guest-profiles.ts`; `requireStaffUser` in `lib/supabase/require-staff.ts`.
- Verification command from the Ready brief: `pnpm test:unit tests/unit/guest-profiles`.

## Permissions Requested (before execution)

Ready brief Allowed edits, pre-granted:

- `app/actions/guest-profiles.ts`
- `lib/guest-profiles.ts`
- `app/admin/customers/[email]/page.tsx`
- `components/staff/guest-profile-panel.tsx`
- `tests/unit/guest-profiles/` (new file `merge.test.ts` only; do not edit existing tests)

No spec edit.

## TDD Execution Loop

Execute in this order: GM-1, GM-4, GM-5, GM-2, GM-6, GM-3.

GM-1 Green must not implement phone matching or the email rewrite. Later Greens stay inside the contract and the current `it`. If a new `it` is already green because an earlier criterion implemented it, Red reports PINNED with the command output and does not weaken the assertion. The orchestrator skips Green and runs Refactor re-verify only.

### Criterion GM-1 — Staff gate (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for GM-1. Read `.cursor/plans/res-84_guest_profile_merge_a475.plan.md` Contract and Criterion GM-1 first. New file `tests/unit/guest-profiles/merge.test.ts`, test `listing and confirming a merge require staff and the ficha control is guest-merge`. Missing exports fail on `typeof === "function"`, not on an import error. Command: `pnpm test:unit tests/unit/guest-profiles`. Do not edit existing tests. Do not touch source.
- **Green** → Invoke `tdd-green` to add gated `listGuestMergeCandidates` and `confirmGuestMerge` stubs that call `createServiceClient` only after `requireStaffUser` succeeds, render `data-testid="guest-merge"`, and pass `mergeCandidates` from the page. Do not match phones. Do not update `email`. Exit = this test green and the guest-profiles unit folder green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-1 only. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GM-4 — Surviving email (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `confirm rewrites the other email onto the surviving email and does not copy rows`. Do not edit the GM-1 test. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` so confirm updates `{ email: normalized surviving }` where `email_normalized` is the other email, and selects `id`. No insert or delete. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-4. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GM-5 — Unrelated rows (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `confirm leaves a third email and a blank email unchanged`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` only if that `it` is red. The update filter stays the other normalized email. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-5. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GM-2 — Candidates (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `candidates share one normalized phone and the list does not write`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` to add `normalizeGuestPhone` and `mergeCandidateEmails`, and to return that list from `listGuestMergeCandidates` without writing. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-2. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GM-6 — Refused pair (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `confirm writes nothing for a non-candidate, the same email, or a blank email`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` so confirm returns `{ ok: true }` without a write unless `mergeCandidateEmails` includes the other email. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-6. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GM-3 — No automatic merge (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `opening the ficha and listing candidates writes no email change`. Do not edit earlier tests. Also assert the Contract UI: inside `data-testid="guest-merge"`, `confirmGuestMerge` is called with both survivors (`profile.email` and the candidate, swapped), and the button text is that surviving email. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` only if that `it` is red. Reads stay read-only. Put both confirm controls inside `data-testid="guest-merge"`. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GM-3. Exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Work started: `/sdd-to-tdd` execution · plan `res-84_guest_profile_merge_a475`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-84_guest_profile_merge_a475.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-profile-merge.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy res-84_guest_profile_merge_a475.plan.md

Problem: Staff cannot find or confirm duplicate guest fichas. Two emails that share a phone stay separate, and there is no control on the ficha. The spec already requires a staff-confirmed rewrite onto the email the staff member selects, with no copied rows.
Approach: List candidates by a normalized phone (trim, then remove spaces) across two different emails. Confirm rewrites the other email's reservations to the surviving normalized email through the service role after `requireStaffUser`. The ficha control `data-testid="guest-merge"` lets staff pick either email as the survivor. Unrelated rows, blank emails, and non-candidates are not written.
Out-of-scope findings: none

| #   | Criterion                                   | Risk | Layer | Test file                               |
| --- | ------------------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | GM-1 staff gate and guest-merge control     | P0   | unit  | tests/unit/guest-profiles/merge.test.ts |
| 2   | GM-4 rewrite onto the surviving email       | P0   | unit  | tests/unit/guest-profiles/merge.test.ts |
| 3   | GM-5 third email and blank email stay put   | P0   | unit  | tests/unit/guest-profiles/merge.test.ts |
| 4   | GM-2 phone candidates, list does not write  | P1   | unit  | tests/unit/guest-profiles/merge.test.ts |
| 5   | GM-6 non-candidate, self, and blank refused | P0   | unit  | tests/unit/guest-profiles/merge.test.ts |
| 6   | GM-3 open and list do not change email      | P1   | unit  | tests/unit/guest-profiles/merge.test.ts |

## Docs Sync

Execution-start todo: `start-linear` — first, before Criterion GM-1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before GM-1 Red.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`).

## Docs sync packet

- plan_slug: res-84_guest_profile_merge_a475
- spec: docs/specs/guest-profile-merge.md
- mode: FIX
- linear_issue: RES-84
- criteria_shipped: [GM-1, GM-2, GM-3, GM-4, GM-5, GM-6]
- criteria_manual_uat: none
- req_ids: [GM-1, GM-2, GM-3, GM-4, GM-5, GM-6]
- source_paths: [lib/guest-profiles.ts, app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, components/staff/guest-profile-panel.tsx]
- test_paths: [tests/unit/guest-profiles/merge.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-84_guest_profile_merge_a475.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

Design already deferred these. Do not re-file them.

| Finding           | Where (file:line/area)            | Why it matters                      | Severity | Relation                |
| ----------------- | --------------------------------- | ----------------------------------- | -------- | ----------------------- |
| Automatic merge   | docs/specs/guest-profile-merge.md | staff must confirm                  | low      | already on product-gaps |
| Guests table      | docs/specs/guest-profile-merge.md | identity stays the normalized email | low      | already on product-gaps |
| Name-only match   | docs/specs/guest-profile-merge.md | v1 matches a normalized phone       | low      | already on product-gaps |
| Blank-email merge | docs/specs/guest-profile-merge.md | a blank email has no ficha          | low      | already on product-gaps |

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-84 (plan: `res-84_guest_profile_merge_a475`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before GM-1 Red.
- **Close-out (FIX):** delegate `linear-resolver` to post the resolution comment only. No workflow-state write.
- **Findings registration:** if the run file has open lines, merge them, then persist without auto-confirming net-new issues. Design deferrals above are already ledgered — do not create new issues for them.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- auth → `app/actions/guest-profiles.ts`
- candidate rule and rewrite → `lib/guest-profiles.ts`, `app/actions/guest-profiles.ts`
- ficha control → `components/staff/guest-profile-panel.tsx`, `app/admin/customers/[email]/page.tsx`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-84_guest_profile_merge_a475`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-84_guest_profile_merge_a475.plan.md`. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). No spec edit. Delegate Criterion GM-1 Red.

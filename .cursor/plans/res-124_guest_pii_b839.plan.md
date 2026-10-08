# RES-124 — GP-10 trims and bounds guest name and phone

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/<plan-slug>.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/<plan-slug>.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/<plan-slug>.md`** (matching `## <category>`
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
  `.cursor/plans/<plan-slug>.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-124_guest_pii_b839.plan.md` (managed Cloud)
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link is informational)
- Project: `restaurant-system V-0.5` (`P-RES-12`), the issue's existing project.
  `list_projects` for team RES: V-0.5 status Backlog (nonterminal); V-0.2 and
  V-0.1 status Completed (terminal, excluded). One canonical `V-0.5`.
- Work type: launch-critical/security/money (unvalidated PII write)
- Milestone: M8 — General Availability (GA). The issue is already on M8, which
  matches security work. No move.
- Mixed design + implementation: no
- Clarification: none. The Ready brief `Decisions:` are the contract. No
  `Clarification required` comment is open on RES-124.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-124 — `updateGuestProfilePii` writes `guest_name` and `phone` as
  submitted (`app/actions/guest-profiles.ts` update payload). Expected: trimmed
  values, a catalog error and no update for a blank or >100-character name, and
  a catalog error and no update for a non-blank phone that fails `PHONE_RE`.
  A blank phone stays allowed.
- Missing constraint (root cause): GP-10 requires the staff gate, the
  `email_normalized` group write, and `{ ok: true }` / `notFound`, and it does
  not require trim, a 100-character name bound, or `PHONE_RE`.
- Spec update proposed: `docs/specs/guest-profiles.md` GP-10 gains those rules
  (first execution action after START is launched; path listed below).

Evidence: the action assigns `input.guest_name` and `input.phone` with no
`trim`. `validateReservationPayload` returns `errors.reservation.nameRequired`
for a blank trimmed name, `errors.reservation.nameTooLong` above 100 characters,
and `errors.reservation.phoneInvalid` when a non-blank trimmed phone fails
`PHONE_RE`. `validateInquiryPayload` returns `errors.inquiries.nameRequired` and
`errors.inquiries.phoneInvalid` the same way. Pre-mortem: a staff save of `""`,
a 101-character name, or `abc` persists onto every reservation in the email
group because no criterion forbids it.

## Spec

- Source: existing `docs/specs/guest-profiles.md` (hub walk: `docs/specs/README.md`
  lists this file; no `docs/specs/domains/` owner and no folded stub).
- Summary: GP-10 keeps the staff gate and the email-group write. It adds trim
  before the write, `errors.guestProfiles.nameRequired` / `nameTooLong` /
  `phoneInvalid` with no update, and a blank phone stored as `""`.
- Clarifications needed: none (Ready brief).

Exact GP-10 replacement (normative):

Staff can submit a new `guest_name` and `phone` on the ficha. After the staff
gate and before `createServiceClient`, trim both fields. The mutation updates
those trimmed values on every reservation in the `email_normalized` group and
MUST NOT change `email`. A blank trimmed `guest_name` returns
`{ error: "errors.guestProfiles.nameRequired" }` and runs no update. A trimmed
`guest_name` longer than 100 characters returns
`{ error: "errors.guestProfiles.nameTooLong" }` and runs no update. A non-blank
trimmed `phone` that fails `PHONE_RE` (`lib/reservations/validation.ts`) returns
`{ error: "errors.guestProfiles.phoneInvalid" }` and runs no update. A blank
trimmed phone is stored as `""`. Those three keys are non-empty strings in
`messages/en.json` and `messages/fr.json`. The email field is not an editable
control. Unauthenticated and authenticated non-staff MUST NOT mutate. The
mutator returns `{ ok: true }` when at least one row was updated and
`{ error: "errors.guestProfiles.notFound" }` when zero rows matched. A rejected
name or phone MUST NOT call `createServiceClient`.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                  | Risk | Layer | Test file                                      | New or existing           | Test name                                                                           | Assertion                                                                                                                                                                                                                                          | Command                                                       | Depends on                                            |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- | ----- | ---------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| C1  | Blank or >100 trimmed `guest_name` returns the catalog error and does not update                           | P0   | unit  | `tests/unit/guest-profiles/update-pii.test.ts` | add `it` to existing file | `updateGuestProfilePii rejects a blank or oversized guest_name and does not update` | `"   "` → `errors.guestProfiles.nameRequired`; 101-character name → `errors.guestProfiles.nameTooLong`; `update` and `createServiceClient` not called; `expectCatalogKey` for both keys. A 100-character name with phone `555-0100` still updates. | `pnpm test:unit tests/unit/guest-profiles/update-pii.test.ts` | none                                                  |
| C2  | Non-blank phone that fails `PHONE_RE` returns `phoneInvalid` and does not update; a blank phone is allowed | P0   | unit  | same                                           | add `it`                  | `updateGuestProfilePii rejects an invalid phone and allows a blank phone`           | phone `abc` → `errors.guestProfiles.phoneInvalid`, no `createServiceClient`; phone `""` with name `Ada Lovelace` returns `{ ok: true }` and calls `update`. `expectCatalogKey("errors.guestProfiles.phoneInvalid")`.                               | same                                                          | none                                                  |
| C3  | Trimmed `guest_name` and `phone` are what the update stores                                                | P0   | unit  | same                                           | add `it`                  | `updateGuestProfilePii stores trimmed guest_name and phone`                         | `"  Ada Lovelace  "` / `"  555-0100  "` stored trimmed; phone `"   "` stored as `""`; payload has no `email`; `.eq("email_normalized", normalizeGuestEmail(email))`.                                                                               | same                                                          | C1, C2 (valid names and phones must pass those gates) |

Do not modify the two existing tests. They already pin unauthorized, the
email-group write, `{ ok: true }`, and `notFound`.

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                                       | Source file(s)                                                    | Risk | Status  |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---- | ------- |
| C1        | guest-profiles.md GP-10 | update-pii.test.ts::updateGuestProfilePii rejects a blank or oversized guest_name and does not update | app/actions/guest-profiles.ts, messages/en.json, messages/fr.json | P0   | planned |
| C2        | guest-profiles.md GP-10 | update-pii.test.ts::updateGuestProfilePii rejects an invalid phone and allows a blank phone           | app/actions/guest-profiles.ts, messages/en.json, messages/fr.json | P0   | planned |
| C3        | guest-profiles.md GP-10 | update-pii.test.ts::updateGuestProfilePii stores trimmed guest_name and phone                         | app/actions/guest-profiles.ts                                     | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration, e2e, or deployed phase.
- Verification command from the Ready brief: `pnpm test:unit tests/unit/guest-profiles/update-pii.test.ts`.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/guest-profiles.md` — extend GP-10 with trim,
  the 100-character name bound, `PHONE_RE`, and the three `errors.guestProfiles`
  keys. Also update the GP-10 evidence row and the non-normative mutator
  sentence in the same file so they do not describe the unvalidated write.
- Existing-test edit: `tests/unit/guest-profiles/update-pii.test.ts` — add the
  three regression tests. Do not change the two existing tests.

The Ready brief `Allowed edits` also names `app/actions/guest-profiles.ts`,
`lib/reservations/validation.ts`, `messages/en.json`, and `messages/fr.json`.
Those are Green/Refactor source writes, not extra spec permissions. Prefer
importing the existing `PHONE_RE`. Do not export a new validator unless a
criterion's test cannot pass without it.

## TDD Execution Loop

### Criterion C1 — blank or oversized guest name (layer: unit)

- **Red** → Invoke `tdd-red` to add `updateGuestProfilePii rejects a blank or oversized guest_name and does not update` in `tests/unit/guest-profiles/update-pii.test.ts`. It must execute and fail because today's action writes the blank or 101-character name and returns `{ ok: true }`. Do not edit the two existing tests. Command: `pnpm test:unit tests/unit/guest-profiles/update-pii.test.ts`.
- **Green** → Invoke `tdd-green` to trim `guest_name` after the staff gate and return `errors.guestProfiles.nameRequired` or `errors.guestProfiles.nameTooLong` with no `createServiceClient` call. Add both keys to `messages/en.json` and `messages/fr.json`. Exit: the new test executed and passed, and the existing tests in that file still pass.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 without behavior change. Exit: that file's tests executed and passed, `pnpm lint` (0 warnings), `pnpm typecheck`, and `pnpm exec prettier --check` on the source files this criterion touched.

### Criterion C2 — invalid phone, blank phone allowed (layer: unit)

- **Red** → Invoke `tdd-red` to add `updateGuestProfilePii rejects an invalid phone and allows a blank phone` in the same file. It must execute and fail because `abc` is written today. Do not edit existing tests, including the C1 test.
- **Green** → Invoke `tdd-green` to return `errors.guestProfiles.phoneInvalid` and skip the update when the trimmed phone fails `PHONE_RE`. A blank trimmed phone still updates. Add the key to `messages/en.json` and `messages/fr.json` if C1 did not. Exit: the new test executed and passed; C1 and the original tests still pass.
- **Refactor** → Invoke `tdd-refactor` to clean up C2 without behavior change. Exit: the file's tests executed and passed, lint, typecheck, and prettier --check on touched source.

### Criterion C3 — store trimmed values (layer: unit)

- **Red** → Invoke `tdd-red` to add `updateGuestProfilePii stores trimmed guest_name and phone` in the same file. It must execute and fail because the update payload is still the untrimmed input (and a whitespace phone is not `""`). Do not edit earlier tests.
- **Green** → Invoke `tdd-green` to store the trimmed name and phone, including `""` for a whitespace-only phone. Exit: the new test executed and passed; C1, C2, and the original tests still pass.
- **Refactor** → Invoke `tdd-refactor` to clean up C3 without behavior change. Exit: the file's tests executed and passed, lint, typecheck, and prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-124_guest_pii_b839`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-124_guest_pii_b839.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-profiles.md`
Criteria: 3 automatable · 0 manual-UAT
Approval gates: spec edit `docs/specs/guest-profiles.md` | existing-test edit `tests/unit/guest-profiles/update-pii.test.ts` (add tests only)
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-124_guest_pii_b839.plan.md`

Problem: `updateGuestProfilePii` writes `guest_name` and `phone` as submitted, including blank, oversized, and untrimmed values. GP-10 requires the staff gate and the email-group write, and it does not require trim, a 100-character name bound, or `PHONE_RE`. Sibling reservation and inquiry validators already reject that input before a write.

Approach: Extend GP-10 so the mutator trims both fields, stores the trimmed values, returns `errors.guestProfiles.nameRequired` or `nameTooLong` with no update when the trimmed name is blank or longer than 100 characters, and returns `errors.guestProfiles.phoneInvalid` with no update when a non-blank trimmed phone fails `PHONE_RE`. A blank phone stays allowed. The staff gate, `email_normalized` group write, and `{ ok: true }` / `notFound` results stay as they are. Each rule gets one regression test in the existing PII unit file.

Out-of-scope findings: none

| #   | Criterion                                             | Risk | Layer | Test file                                    |
| --- | ----------------------------------------------------- | ---- | ----- | -------------------------------------------- |
| 1   | Reject a blank or oversized guest name with no update | P0   | unit  | tests/unit/guest-profiles/update-pii.test.ts |
| 2   | Reject an invalid phone and allow a blank phone       | P0   | unit  | tests/unit/guest-profiles/update-pii.test.ts |
| 3   | Store trimmed guest_name and phone                    | P0   | unit  | tests/unit/guest-profiles/update-pii.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — Invoke the `linear-resolver` subagent to
start work on RES-124 (plan: `res-124_guest_pii_b839`), handing the executing
session's plan-file path (do not inline the plan file). Task
`run_in_background: true`. Do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-124_guest_pii_b839
- spec: docs/specs/guest-profiles.md
- mode: FIX
- linear_issue: RES-124
- criteria_shipped: [C1, C2, C3]
- criteria_manual_uat: none
- req_ids: [GP-10]
- source_paths: [app/actions/guest-profiles.ts, messages/en.json, messages/fr.json]
- test_paths: [tests/unit/guest-profiles/update-pii.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-124_guest_pii_b839.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none. Email and notes stay read-only under GP-4/GP-10. History `select("*")`
is already RES-125. Splitting `guest_name` stays deferred under GP-4. Client
checks in `GuestProfilePanel` stay out of this issue; the action is the trust
boundary.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-124 (plan:
  `res-124_guest_pii_b839`), posting the digest above. Task
  `run_in_background: true`.
- **Close-out:** delegate `linear-resolver` to post the resolution comment on
  RES-124 only. No workflow-state write.
- **Findings registration:** category files already hold open lines, so Step 4C
  runs even when this run's ledger adds nothing. Managed Cloud is attach-only:
  leave new-issue findings on the ledger and continue.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- Collate after Refactor. Expected first stop: the staff-gate-then-validate
  branch in `app/actions/guest-profiles.ts` (`[security]`).

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none until a Refactor report names one
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-124_guest_pii_b839`: pending

## First Execution Action

- **Managed Cloud one-shot:** this work-order is the file. Arm
  `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`)
  and do not wait. Apply the GP-10 spec edit. Then delegate C1 Red.

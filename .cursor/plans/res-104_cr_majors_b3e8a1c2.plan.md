# res-104_cr_majors_b3e8a1c2

# res-104_guest_profiles_f8c2e1a0

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
  STOP), then
  **prune** each registered entry into `docs/findings/archive.md` with its issue
  id and **truncate/delete the run file**. If Linear is unavailable, the merged
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
- Cloud runtime: managed
- Work-order: `.cursor/plans/res-104_cr_majors_b3e8a1c2.plan.md`
- Workflow mode: FIX
- linear_issue: none (free-text CodeRabbit Majors on PR #117; Refs RES-104)

## Project & Milestone Route

- Team: key `RES`
- Project: untracked hint — same V-0.2 portfolio as RES-104 (no Linear ID on this invocation)
- Work type: implementation (existing GP-2 / GP-4 / GP-5 / GP-9 / GP-10 / GP-12)
- Milestone: M4
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX)

- Issue: PR #117 unresolved Major threads. Observed: live `.eq("email", normalizeGuestEmail(...))` drops mixed-case/padded stored emails; `/admin/customers/[email]` prints `profile.error ?? email`; reservation-row pin is a source regex. Expected: GP-2 membership `trim(lower(reservations.email))`; ficha displays GP-4/GP-5/GP-12 and submits GP-10; GP-9 control is the per-row `Link`.
- Missing constraint: none new — FEATURE under-tested existing ACs. No spec edit.
- Already-pinned (not a criterion): GP-11 / `cr-comment:v1:e096e6ba30106bc238e392f8` — `tests/integration/reservations/public-privileges.integ.test.ts` already denies anon SELECT of reservation PII, allows service-role read, and forbids `GRANT SELECT ON TABLE reservations` in the three privilege files.
- Rejected (not a criterion): ledger “keep `docs/findings/**` unchanged” (`a1d089a041e25e045585999d`, `f594daa923206120107bffcb`) — STEP 4C must merge/prune; archive lines already carry `→ RES-84 (attached)`. Do not revert.
- Plan-file coverage comment (`1d539cca5adb16990c228103`) is the same page-facing gap as C2–C5; do not edit the completed FEATURE plan.

## Spec

- Source: existing `docs/specs/guest-profiles.md` (GP-2, GP-4, GP-5, GP-9, GP-10, GP-12)
- Summary: Identity is trim+lowercase membership. The ficha page shows newest-row PII, history columns, empty/not-found copy, and a name/phone Save that never edits email. Reservation rows with a non-blank email link to the ficha.
- Clarifications needed: none

## Acceptance Criteria → Tests

| #   | Criterion                                                  | Risk | Layer | Test file                                           | New or existing                            | Test name                                                                 | Assertion                                                                                                                      | Command                                                                                                   | Depends on |
| --- | ---------------------------------------------------------- | ---- | ----- | --------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------- |
| C1  | GP-2 live membership is trim+lower, not exact stored email | P0   | unit  | tests/unit/guest-profiles/live-read.test.ts         | add `it`; may rewrite update-pii `.eq` pin | getGuestProfile includes reservations that differ only by case or padding | Mixed-case/padded stored `Ada@Ex.com` appears for key `ada@ex.com`; mutator updates that group without writing `email`         | `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts tests/unit/guest-profiles/update-pii.test.ts` | none       |
| C2  | GP-10 ficha Save writes name/phone                         | P0   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        | add `it`                                   | staff ficha save control writes name and phone and not email              | Page/chrome source (or extracted component) calls `updateGuestProfilePii` with `guest_name`+`phone`; no editable email control | `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`                                             | C1         |
| C3  | GP-4 ficha displays newest-row PII                         | P1   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        | add `it`                                   | staff ficha displays guest_name email phone notes                         | Rendered/source chrome includes `guest_name`, identity `email`, `phone`, `notes` from the profile payload                      | `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`                                             | C2         |
| C4  | GP-5 ficha lists history columns                           | P1   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        | add `it`                                   | staff ficha lists date time party_size status                             | History rows expose date, time, party_size, status                                                                             | `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`                                             | C3         |
| C5  | GP-12 empty key shows empty/not-found                      | P1   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        | add `it`                                   | staff ficha empty key is empty not other guests                           | Empty `history` shows empty/not-found copy; no other guest’s rows                                                              | `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`                                             | C4         |
| C6  | GP-9 reservation row Link                                  | P1   | unit  | tests/unit/guest-profiles/reservation-entry.test.ts | add `it` (keep existing regex)             | reservations list renders a ficha link for non-blank email only           | `guestProfileHref(r.email)` result is the `Link` href; blank/null email omits the control                                      | `pnpm test:unit tests/unit/guest-profiles/reservation-entry.test.ts`                                      | none       |

Repo has no Testing Library. Page/link pins follow sibling source+action style, tightened past a single `guestProfileHref(` regex. Do not add a new dependency.

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                                                              | Source file(s)                            | Risk | Status  |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- | ---- | ------- |
| C1        | guest-profiles.md GP-2  | live-read.test.ts::getGuestProfile includes reservations that differ only by case or padding | app/actions/guest-profiles.ts             | P0   | planned |
| C2        | guest-profiles.md GP-10 | staff-gate.test.ts::staff ficha save control writes name and phone and not email             | app/admin/customers/[email]/page.tsx      | P0   | planned |
| C3        | guest-profiles.md GP-4  | staff-gate.test.ts::staff ficha displays guest_name email phone notes                        | app/admin/customers/[email]/page.tsx      | P1   | planned |
| C4        | guest-profiles.md GP-5  | staff-gate.test.ts::staff ficha lists date time party_size status                            | app/admin/customers/[email]/page.tsx      | P1   | planned |
| C5        | guest-profiles.md GP-12 | staff-gate.test.ts::staff ficha empty key is empty not other guests                          | app/admin/customers/[email]/page.tsx      | P1   | planned |
| C6        | guest-profiles.md GP-9  | reservation-entry.test.ts::reservations list renders a ficha link for non-blank email only   | components/staff/reservations-manager.tsx | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked)
- Do not start an integration criterion

## Permissions Requested (before execution)

- Spec create/edit: none
- Existing-test edit: `tests/unit/guest-profiles/update-pii.test.ts` — the current `it` pins `.eq("email", normalizeGuestEmail(...))`, which encodes the GP-2 defect. A new `it` alone cannot stay green if Green removes that exact call. Operator `/sdd-to-tdd unresolved Major CodeRabbit threads (all)` names this thread.

## TDD Execution Loop

### Criterion C1 — GP-2 live membership (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1 in `tests/unit/guest-profiles/live-read.test.ts` named `getGuestProfile includes reservations that differ only by case or padding`. Mock must honor exact `.eq("email", value)` (today’s thenable hides the bug). Stored `Ada@Ex.com` / `  Ada@Ex.com  ` must appear for key `ada@ex.com`. Permission to rewrite the update-pii `.eq` assertion if that pin blocks the new `it`. Command: `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts`. Must fail on today’s exact `.eq`.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass with one membership predicate equivalent to `trim(lower(reservations.email))`. Do not load the whole table unfiltered. Do not write `email`. Do not edit tests.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C1; re-run the guest-profiles unit folder, lint, typecheck, prettier --check on touched source.

### Criterion C2 — GP-10 ficha Save (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2 in `tests/unit/guest-profiles/staff-gate.test.ts` named `staff ficha save control writes name and phone and not email`. Must fail because the page has no Save / `updateGuestProfilePii` caller.
- **Green** → Invoke the `tdd-green` subagent to add the minimal staff Save chrome that calls `updateGuestProfilePii` with `guest_name` and `phone` only.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C2; re-run staff-gate plus guest-profiles units, lint, typecheck, prettier --check on touched source.

### Criterion C3 — GP-4 displayed PII (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C3 in `tests/unit/guest-profiles/staff-gate.test.ts` named `staff ficha displays guest_name email phone notes`. Must fail while chrome is `profile.error ?? email`.
- **Green** → Invoke the `tdd-green` subagent to render those four fields from the profile payload; email read-only.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C3; re-run staff-gate, lint, typecheck, prettier --check on touched source.

### Criterion C4 — GP-5 history columns (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C4 in `tests/unit/guest-profiles/staff-gate.test.ts` named `staff ficha lists date time party_size status`. Must fail if history columns are absent.
- **Green** → Invoke the `tdd-green` subagent to list those four history fields from `profile.history`.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C4; re-run staff-gate, lint, typecheck, prettier --check on touched source.

### Criterion C5 — GP-12 empty state (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C5 in `tests/unit/guest-profiles/staff-gate.test.ts` named `staff ficha empty key is empty not other guests`. Must fail if empty/not-found copy is missing.
- **Green** → Invoke the `tdd-green` subagent to show empty/not-found copy when `history` is empty; do not list other guests.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C5; re-run staff-gate, lint, typecheck, prettier --check on touched source.

### Criterion C6 — GP-9 rendered Link (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C6 in `tests/unit/guest-profiles/reservation-entry.test.ts` named `reservations list renders a ficha link for non-blank email only`. Keep the existing regex `it`. New `it` must pin `guestProfileHref(r.email)` assigned to the `Link` href and omitted when href is null. Command: `pnpm test:unit tests/unit/guest-profiles/reservation-entry.test.ts`.
- **Green** → Invoke the `tdd-green` subagent only if the new pin is red; current manager already has the `Link` — expect already-green and report that.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean C6; re-run reservation-entry, lint, typecheck, prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest

Omit START — no tracked Linear ID on this invocation.

## Docs Sync

Close-out: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format` (no `4b-linear` — no Linear ID). Then STEP 4G then STEP 4F.

```markdown
## Docs sync packet

- plan_slug: res-104_cr_majors_b3e8a1c2
- spec: docs/specs/guest-profiles.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1, C2, C3, C4, C5, C6]
- criteria_manual_uat: none
- req_ids: [GP-2, GP-4, GP-5, GP-9, GP-10, GP-12]
- source_paths: [app/actions/guest-profiles.ts, app/admin/customers/[email]/page.tsx, components/staff/reservations-manager.tsx]
- test_paths: [tests/unit/guest-profiles/live-read.test.ts, tests/unit/guest-profiles/update-pii.test.ts, tests/unit/guest-profiles/staff-gate.test.ts, tests/unit/guest-profiles/reservation-entry.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-104_cr_majors_b3e8a1c2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings

| Finding                                                | Where                                                          | Why it matters                                                       | Severity | Relation          |
| ------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | ----------------- |
| Revert findings ledger                                 | docs/findings/**                                               | 4C merge/prune is required; archive already has RES-84               | med      | rejected CR       |
| GP-11 integ already pins anon SELECT + no GRANT SELECT | tests/integration/reservations/public-privileges.integ.test.ts | Authenticated runtime SELECT is the same REVOKE ALL; not a new grant | low      | already-pinned    |
| FEATURE plan page-coverage comment                     | .cursor/plans/res-104_guest_profiles_f8c2e1a0.plan.md          | Historical work-order; C2–C5 are the fix                             | low      | folded into C2–C5 |

## Linear Close-out & Findings Registration

- START: omit (no tracked issue)
- Close-out 4B: omit
- Findings registration: 4C merge + linear-resolver read; Cloud does not auto-create issues

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [booking] live membership predicate — `app/actions/guest-profiles.ts`
- [auth] ficha Save + staff gate — `app/admin/customers/[email]/page.tsx`
- [public-api] displayed PII / history / empty copy — same page
- [public-api] reservation-row Link — `components/staff/reservations-manager.tsx`

## Retrospective (close-out, Step 4E)

- Patterns: none at plan time
- Traceability / Run metrics: stamp at close-out

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
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-104_guest_profiles_f8c2e1a0.plan.md`
- Workflow mode: FEATURE
- linear_issue: RES-104

## Project & Milestone Route

- Team: key `RES` (Restaurant Link)
- Project: restaurant-system V-0.2 (`9924183e-fae0-480f-aabf-1ab1d249c603`) — issue's existing nonterminal RES version project (signal 2)
- Work type: implementation
- Milestone: M4 (issue card still sits on M2 after `/design`; governing spec is now testable — do not re-clarify)
- Mixed design + implementation: no (spec signed off)
- Clarification: none

## Spec

- Source: existing `docs/specs/guest-profiles.md`
- Summary: Staff-only ficha at `/admin/customers/[email]`. Identity is trimmed+lowercased `reservations.email`. No `guests` table. History newest-first; `completed` = visit. Name/phone write-through; email read-only. Entry from a reservation with non-blank email.
- Clarifications needed: none

## Acceptance Criteria → Tests

| #   | Criterion              | Risk | Layer | Test file                                           | New or existing       | Test name                                                                        | Assertion                                                                                                                | Command                                                              | Depends on |
| --- | ---------------------- | ---- | ----- | --------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------- |
| 1   | GP-2 identity key      | P0   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | new                   | normalizeGuestEmail matches trim+lowercase and drops blank emails                | `normalizeGuestEmail("  Ada@Ex.com ")==="ada@ex.com"`; blank/null/whitespace → null and never belong                     | `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`     | none       |
| 2   | GP-3 isolation         | P0   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | buildGuestProfile excludes other emails                                          | fixture A+B → profile A has only A rows                                                                                  | same                                                                 | GP-2       |
| 3   | GP-11 RES-PRIV         | P0   | unit  | tests/unit/guest-profiles/res-priv.test.ts          | new                   | guest profile reader and mutator use service client and do not grant anon SELECT | actions call `createServiceClient` after staff; new guest-profile files have no `GRANT SELECT` to anon/authenticated     | `pnpm test:unit tests/unit/guest-profiles/res-priv.test.ts`          | none       |
| 4   | GP-1 staff route       | P0   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        | new                   | staff guest profile is gated at /admin/customers                                 | page exists; unauth/non-staff get Unauthorized and no service client; staff and super_admin proceed                      | `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`        | none       |
| 5   | GP-10 PII edit         | P0   | unit  | tests/unit/guest-profiles/update-pii.test.ts        | new                   | updateGuestProfilePii writes name and phone on the email group and never email   | staff update hits every matching row's guest_name/phone; email column absent from update payload; non-staff Unauthorized | `pnpm test:unit tests/unit/guest-profiles/update-pii.test.ts`        | GP-2       |
| 6   | GP-6 visits            | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | completed reservations are visits and others are not                             | completed.isVisit true; confirmed/seated/cancelled/no_show false                                                         | `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`     | GP-2       |
| 7   | GP-7 order             | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | history is newest date then time first                                           | [old, new] sorts to new first; same date later time first                                                                | same                                                                 | GP-2       |
| 8   | GP-4 guest fields      | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | displayed PII comes from the newest reservation                                  | disagreeing name/phone/notes take newest date/time; email is the identity key                                            | same                                                                 | GP-7       |
| 9   | GP-5 history fields    | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | each history row has date time party_size status                                 | every row exposes those four fields                                                                                      | same                                                                 | GP-2       |
| 10  | GP-8 new reservation   | P1   | unit  | tests/unit/guest-profiles/live-read.test.ts         | new                   | getGuestProfile is a live service-role select                                    | mocked from() is invoked on each call; second insert appears on second read                                              | `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts`         | GP-2, GP-1 |
| 11  | GP-12 empty key        | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     | existing file, new it | empty matching set is empty not other guests                                     | unknown email → empty history and no foreign rows                                                                        | `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`     | GP-3       |
| 12  | GP-9 reservation entry | P1   | unit  | tests/unit/guest-profiles/reservation-entry.test.ts | new                   | reservations list links a non-blank email to the ficha                           | `guestProfileHref` percent-encodes normalized email; manager source has the control; blank email has no href             | `pnpm test:unit tests/unit/guest-profiles/reservation-entry.test.ts` | GP-2       |

## Traceability Matrix

| Criterion | Spec ref                | Test file::name                                    | Source file(s)                                  | Risk | Status  |
| --------- | ----------------------- | -------------------------------------------------- | ----------------------------------------------- | ---- | ------- |
| GP-2      | guest-profiles.md GP-2  | build-profile.test.ts::normalizeGuestEmail…        | lib/guest-profiles (TBD Green)                  | P0   | planned |
| GP-3      | guest-profiles.md GP-3  | build-profile.test.ts::buildGuestProfile excludes… | same                                            | P0   | planned |
| GP-11     | guest-profiles.md GP-11 | res-priv.test.ts::…                                | app/actions/guest-profiles.ts (TBD)             | P0   | planned |
| GP-1      | guest-profiles.md GP-1  | staff-gate.test.ts::…                              | app/admin/customers/[email]/page.tsx (TBD)      | P0   | planned |
| GP-10     | guest-profiles.md GP-10 | update-pii.test.ts::…                              | app/actions/guest-profiles.ts (TBD)             | P0   | planned |
| GP-6      | guest-profiles.md GP-6  | build-profile.test.ts::completed…                  | lib/guest-profiles (TBD)                        | P1   | planned |
| GP-7      | guest-profiles.md GP-7  | build-profile.test.ts::history is newest…          | same                                            | P1   | planned |
| GP-4      | guest-profiles.md GP-4  | build-profile.test.ts::displayed PII…              | same                                            | P1   | planned |
| GP-5      | guest-profiles.md GP-5  | build-profile.test.ts::each history row…           | same                                            | P1   | planned |
| GP-8      | guest-profiles.md GP-8  | live-read.test.ts::getGuestProfile is a live…      | app/actions/guest-profiles.ts (TBD)             | P1   | planned |
| GP-12     | guest-profiles.md GP-12 | build-profile.test.ts::empty matching set…         | lib/guest-profiles (TBD)                        | P1   | planned |
| GP-9      | guest-profiles.md GP-9  | reservation-entry.test.ts::…                       | components/staff/reservations-manager.tsx (TBD) | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Reuse: inquiries `staff-gate.test.ts` mock/`thenable` pattern; `requireStaffUser` + `createServiceClient`; `ReservationRow` must grow an `email` field when GP-9/GP-4 read staff lists (Green).

## Permissions Requested (before execution)

none

## TDD Execution Loop

### Criterion 1 — GP-2 identity key (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/build-profile.test.ts` :: `normalizeGuestEmail matches trim+lowercase and drops blank emails`. Import `normalizeGuestEmail` from the guest-profiles lib (missing symbol is an acceptable first RED). Assert trim+lowercase; null/"" / " " → null. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`. Must execute and fail.
- **Green** → Invoke `tdd-green` to add the smallest `normalizeGuestEmail` (and only what the test imports). Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` to clean GP-2; exit = green + lint + typecheck + prettier --check on touched source.

### Criterion 2 — GP-3 isolation (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("buildGuestProfile excludes other emails")` in `tests/unit/guest-profiles/build-profile.test.ts`. Two emails in the input list; profile for A contains only A. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to implement `buildGuestProfile` filter via `normalizeGuestEmail`. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-3; re-verify the file.

### Criterion 3 — GP-11 RES-PRIV (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/res-priv.test.ts` :: `guest profile reader and mutator use service client and do not grant anon SELECT`. Pin `createServiceClient` after staff on the guest-profile actions; `readFileSync` the new action/lib files forbids `GRANT SELECT` to anon/authenticated. Command: `pnpm test:unit tests/unit/guest-profiles/res-priv.test.ts`.
- **Green** → Invoke `tdd-green` to add staff-gated actions that use `createServiceClient` only. Do not change reservation GRANT SQL. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` for GP-11.

### Criterion 4 — GP-1 staff route (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/staff-gate.test.ts` :: `staff guest profile is gated at /admin/customers`. Mirror inquiries staff-gate: page file exists under `app/admin/customers/`; unauth → Unauthorized and no service client; staff and super_admin call service client. Do not require a customer-list nav item (GP-9). Command: `pnpm test:unit tests/unit/guest-profiles/staff-gate.test.ts`.
- **Green** → Invoke `tdd-green` to add `app/admin/customers/[email]/page.tsx` + `getGuestProfile` gated like inquiries. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` for GP-1.

### Criterion 5 — GP-10 PII edit (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/update-pii.test.ts` :: `updateGuestProfilePii writes name and phone on the email group and never email`. Mock service client; staff updates `guest_name` and `phone` for the normalized email group; update payload has no `email`; null staff → Unauthorized. Command: `pnpm test:unit tests/unit/guest-profiles/update-pii.test.ts`.
- **Green** → Invoke `tdd-green` to add `updateGuestProfilePii`. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` for GP-10.

### Criterion 6 — GP-6 visits (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("completed reservations are visits and others are not")` in `build-profile.test.ts`. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to set `isVisit` from `status === "completed"` only. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-6.

### Criterion 7 — GP-7 order (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("history is newest date then time first")` in `build-profile.test.ts`. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to sort `date` desc, `time` desc. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-7.

### Criterion 8 — GP-4 guest fields (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("displayed PII comes from the newest reservation")` in `build-profile.test.ts`. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to pick name/phone/notes from the first history row after sort; email = identity key. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-4.

### Criterion 9 — GP-5 history fields (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("each history row has date time party_size status")` in `build-profile.test.ts`. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to map those four fields on each row. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-5.

### Criterion 10 — GP-8 new reservation (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/live-read.test.ts` :: `getGuestProfile is a live service-role select`. Two sequential `from` payloads; second read includes the new row. Command: `pnpm test:unit tests/unit/guest-profiles/live-read.test.ts`.
- **Green** → Invoke `tdd-green` to keep `getGuestProfile` as a live select (no snapshot cache). Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` for GP-8.

### Criterion 11 — GP-12 empty key (layer: unit)

- **Red** → Invoke `tdd-red` to add `it("empty matching set is empty not other guests")` in `build-profile.test.ts`. Command: `pnpm test:unit tests/unit/guest-profiles/build-profile.test.ts`.
- **Green** → Invoke `tdd-green` to return empty history / not-found fields without leaking other emails. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` for GP-12.

### Criterion 12 — GP-9 reservation entry (layer: unit)

- **Red** → Invoke `tdd-red` to write `tests/unit/guest-profiles/reservation-entry.test.ts` :: `reservations list links a non-blank email to the ficha`. Assert `guestProfileHref` / manager source: non-blank email → `/admin/customers/{encodeURIComponent(normalized)}`; blank → no ficha href. Command: `pnpm test:unit tests/unit/guest-profiles/reservation-entry.test.ts`.
- **Green** → Invoke `tdd-green` to add the href helper and the reservations-manager control; extend staff reservation rows with `email` if needed. Exit = target test green.
- **Refactor** → Invoke `tdd-refactor` for GP-9.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-104_guest_profiles_f8c2e1a0`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-104_guest_profiles_f8c2e1a0.md` at close-out.

Mode: FEATURE
Owning spec: `docs/specs/guest-profiles.md`
Criteria: 12 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-104_guest_profiles_f8c2e1a0.plan.md`

Problem: Staff have no per-guest ficha. Reservations are date-scoped and guest identity is denormalized email/name/phone, so history cannot be reviewed without mixing guests.
Approach: Staff-only `/admin/customers/[email]` grouped by trimmed+lowercased email. No guests table. Live read of reservations; completed = visit; name/phone write-through; email read-only. Entry from a reservation with a non-blank email.
Out-of-scope findings: none

| #   | Criterion              | Risk | Layer | Test file                                           |
| --- | ---------------------- | ---- | ----- | --------------------------------------------------- |
| 1   | GP-2 identity key      | P0   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 2   | GP-3 isolation         | P0   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 3   | GP-11 RES-PRIV         | P0   | unit  | tests/unit/guest-profiles/res-priv.test.ts          |
| 4   | GP-1 staff route       | P0   | unit  | tests/unit/guest-profiles/staff-gate.test.ts        |
| 5   | GP-10 PII edit         | P0   | unit  | tests/unit/guest-profiles/update-pii.test.ts        |
| 6   | GP-6 visits            | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 7   | GP-7 order             | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 8   | GP-4 guest fields      | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 9   | GP-5 history fields    | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 10  | GP-8 live read         | P1   | unit  | tests/unit/guest-profiles/live-read.test.ts         |
| 11  | GP-12 empty key        | P1   | unit  | tests/unit/guest-profiles/build-profile.test.ts     |
| 12  | GP-9 reservation entry | P1   | unit  | tests/unit/guest-profiles/reservation-entry.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first. INPUT: `## Linear Plan Digest`. Task `run_in_background: true`; do not wait before C1 Red.

Close-out: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format` (no `4b-linear` — FEATURE). Then STEP 4G then STEP 4F (`/commit` then `/push`).

```markdown
## Docs sync packet

- plan_slug: res-104_guest_profiles_f8c2e1a0
- spec: docs/specs/guest-profiles.md
- mode: FEATURE
- linear_issue: RES-104
- criteria_shipped: [GP-2, GP-3, GP-11, GP-1, GP-10, GP-6, GP-7, GP-4, GP-5, GP-8, GP-12, GP-9]
- criteria_manual_uat: none
- req_ids: [GP-1, GP-2, GP-3, GP-4, GP-5, GP-6, GP-7, GP-8, GP-9, GP-10, GP-11, GP-12]
- source_paths: []
- test_paths: [tests/unit/guest-profiles/build-profile.test.ts, tests/unit/guest-profiles/res-priv.test.ts, tests/unit/guest-profiles/staff-gate.test.ts, tests/unit/guest-profiles/update-pii.test.ts, tests/unit/guest-profiles/live-read.test.ts, tests/unit/guest-profiles/reservation-entry.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-104_guest_profiles_f8c2e1a0.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none at plan time (design deferrals already on `docs/findings/product-gaps.md`).

## Linear Close-out & Findings Registration

- **START:** invoke `linear-resolver` to start work on RES-104 (plan: `res-104_guest_profiles_f8c2e1a0`), posting the digest; Task `run_in_background: true`; do not wait before C1 Red.
- **Close-out:** omit (FEATURE, not FIX).
- **Findings registration:** merge run file at 4C if any open lines; managed Cloud does not auto-confirm net-new issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- auth → guest-profile actions + `/admin/customers/[email]`
- data-integrity → `normalizeGuestEmail` / `buildGuestProfile`
- public-api → reservations-manager ficha control

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: n/a yet
- Traceability finalized: n/a yet
- Run metrics: n/a yet
- harness-lint: n/a yet

## First Execution Action

- **Managed Cloud one-shot:** work-order written. Launch START (`run_in_background: true`; do not wait). No spec edit. Delegate Criterion 1 Red (GP-2). After close-out, `/commit` then `/push`.

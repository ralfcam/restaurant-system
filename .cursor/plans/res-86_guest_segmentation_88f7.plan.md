# res-86_guest_segmentation_88f7

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (local: after operator yes; managed Cloud: the exact path
  listed in `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/res-86_guest_segmentation_88f7.md` after every phase (and, at close-out, the
  merge of its open lines into `docs/findings/<category>.md` + prune to
  `archive.md`), (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-86_guest_segmentation_88f7.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`** (Step 4D),
  **`## Traceability (final)`**, and **`## Run metrics`** (Step 4E) in the same
  tdd log. **Managed Cloud only, before execution:** also write the work-order
  to `.cursor/plans/res-86_guest_segmentation_88f7.plan.md` (repository work-order, not a
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
  `docs/verifier-reports/tdd/res-86_guest_segmentation_88f7.md` (Step 3). At close-out: collate
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
  revision pass on `docs/findings/runs/res-86_guest_segmentation_88f7.md`** (matching `## <category>`
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
  `.cursor/plans/res-86_guest_segmentation_88f7.plan.md`, execute immediately. Do not wait for a
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
- Work-order: `.cursor/plans/res-86_guest_segmentation_88f7.plan.md`
- Workflow mode: FIX
- linear_issue: RES-86

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link; UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`)
- Project: existing `restaurant-system V-0.5` (`d355ac92-faa0-4866-b501-32880e087b91`, identifier `P-RES-12`, `versionKey` `V-0.5`, status Backlog, nonterminal). Precedence: RES-86 already sits on this project. V-0.1 and V-0.2 are Completed. Do not move it.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off because `/design` already shipped `docs/specs/guest-segmentation.md`. Governing criteria GS-1–GS-6 are testable. Do not `save_issue` the milestone. Do not re-clarify.
- Mixed design + implementation: no
- Clarification: none. Ready brief complete (`node .cursor/checks/ready-brief.mjs` → `complete: true`). Decisions already choose `/sdd-to-tdd` because the spec holds the design.

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: RES-86 — staff cannot filter the customer list. Expected: AND filters on `/admin/customers` over one row per non-blank normalized email, without writing reservations.
- Missing constraint (root cause): none in the spec. GS-1–GS-6 already require the staff list, one row per email, combined filters, live results, a read-only load, and clear. There is no `app/admin/customers/page.tsx` and no segment function.
- Spec update proposed: none. Do not edit `docs/specs/guest-segmentation.md`. First execution action after START is Criterion GS-1 Red.

## Spec

- Source: existing `docs/specs/guest-segmentation.md`
- Summary: Staff filter `/admin/customers` with `requireStaffUser` and `createServiceClient`. One row per non-blank normalized email. Name and phone come from the newest reservation by `date` then `time`. Filters AND together: trimmed case-insensitive name substring, stored-phone substring, minimum `completed` count, at least one `no_show`, and newest `completed` date on or before a date. Clearing filters shows every such guest. The list links to the ficha. Applying filters does not update reservations.
- Clarifications needed: none. Pre-mortem (a filter write that rewrites `email` or `phone`) is already GS-5. Inversion (a test that only checks the form exists) is blocked by asserting the unauthorized return, the absent service client, the proxy redirect, and that a guest failing one set filter is absent.

## Contract (every phase reads this)

New file only: `tests/unit/guest-profiles/segmentation.test.ts`. Do not edit any existing test. Do not add catalog keys. Do not edit `messages/**`, `components/**`, or `supabase/**`.

Displayed name and phone are the newest reservation in the email group (`date` descending, then `time` descending; missing date or time sorts as `""`). Phone match uses that stored phone string, not `normalizeGuestPhone`. Name match trims the filter and compares case-insensitively against that displayed name.

Exports to add, and no others:

- `segmentGuests(rows, filters?)` in `lib/guest-profiles.ts`. Skip null, blank, and whitespace emails. Return `{ email, guest_name, phone, href }[]` sorted by `email` ascending. `href` is `guestProfileHref(email)`. `guest_name` and `phone` are the newest row's values or `null`.
- `parseGuestSegmentFilters(params)` in `lib/guest-profiles.ts`. First string wins when a param is an array. Omit `name` and `phone` when trim is empty. `minCompleted` only when the string matches `/^\d+$/`. `hasNoShow` only for `true`, `on`, or `1`. `lastVisitOnOrBefore` only when it matches `/^\d{4}-\d{2}-\d{2}$/`.
- `listGuestSegments(filters)` in `app/actions/guest-profiles.ts`. `requireStaffUser`, then `createServiceClient().from("reservations").select("email, guest_name, phone, status, date, time")`, then `segmentGuests`. Returns `{ guests }` or `{ error: "errors.guestProfiles.unauthorized" }`. A select error returns `{ error: "errors.guestProfiles.unmapped" }`. No insert, update, or delete.

Filter rules inside `segmentGuests` (unset fields do not filter):

- `name`: displayed name lowercased includes the trimmed lowercased filter. A null name fails a set name filter.
- `phone`: displayed phone includes the trimmed filter. A null phone fails a set phone filter.
- `minCompleted`: count of `status === "completed"` is greater than or equal to the number.
- `hasNoShow`: at least one `status === "no_show"`.
- `lastVisitOnOrBefore`: the newest `completed` row's `date` is less than or equal to the filter. No completed row fails.

UI, no new `t()` keys. `app/admin/customers/page.tsx`:

- `export const dynamic = "force-dynamic"`.
- `await searchParams`, `parseGuestSegmentFilters`, then `listGuestSegments`.
- `if (result.error) return null` before any filter form.
- `<form method="get" data-testid="guest-segment-filters">` with input names `name`, `phone`, `minCompleted`, `hasNoShow` (checkbox), and `lastVisitOnOrBefore` (date).
- Labels reuse `staff.customers.name`, `staff.customers.phone`, `staff.customers.completedVisits`, `status.reservation.noShow`, and `staff.customers.lastVisit`.
- Each guest is a link to `href`, showing `guest_name` and `phone`.
- Wrap with `StaffShell` the same way `app/admin/customers/[email]/page.tsx` does. Do not call `updateGuestProfilePii` or `confirmGuestMerge`.

`lib/supabase/proxy.ts` already redirects a non-staff `/admin` caller with `user ? "/" : "/auth/login"`. Do not edit it. `isStaffUser` already treats `super_admin` as staff. Do not edit it.

## Acceptance Criteria → Tests

All six criteria are decidable with a mocked service client and source reads. No integration, e2e, or manual-UAT layer.

| #    | Criterion         | Risk | Layer | Test file                                        | New or existing | Test name                                                                    | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Command                                    | Depends on |
| ---- | ----------------- | ---- | ----- | ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------- |
| GS-1 | Staff list        | P0   | unit  | `tests/unit/guest-profiles/segmentation.test.ts` | new file        | `listing guests requires staff and the filter form is guest-segment-filters` | Namespace import: `typeof listGuestSegments` is `function`. `requireStaffUser` null returns `errors.guestProfiles.unauthorized` and `createServiceClient` is not called. A resolved staff user and `{ id: "super-admin-1" }` each call `createServiceClient`. Page `app/admin/customers/page.tsx` exists, contains `data-testid="guest-segment-filters"`, `listGuestSegments`, and `result.error` before that test id. `lib/supabase/proxy.ts` contains `user ? "/" : "/auth/login"`. `isStaffUser({ app_metadata: { role: "super_admin" } })` is true. | `pnpm test:unit tests/unit/guest-profiles` | none       |
| GS-5 | Read only         | P0   | unit  | same                                             | new `it`        | `loading filtering and clearing the guest list writes no reservation column` | With staff resolved and a thenable that records `insert`, `update`, and `delete`, call `listGuestSegments({})`, `listGuestSegments({ name: "ada" })`, and `listGuestSegments({})` again. No insert, update, or delete. The select argument is `email, guest_name, phone, status, date, time`. Page source does not contain `updateGuestProfilePii` or `confirmGuestMerge`.                                                                                                                                                                              | same                                       | GS-1       |
| GS-2 | One row per email | P1   | unit  | same                                             | new `it`        | `one normalized email uses the newest name and phone and links to the ficha` | `typeof segmentGuests` is `function`. Rows: `ada@ex.com` / Ada Old / 111 / 2026-01-01 / 12:00; `Ada@ex.com` / Ada New / 222 / 2026-06-01 / 19:00; `Ada@ex.com` / Ada Mid / 333 / 2026-06-01 / 12:00; `email: null`; `email: "  "`; `email: ""`; `bob@ex.com` / Bob / 444 / 2026-03-01 / 18:00. Result emails are `ada@ex.com` then `bob@ex.com`. Ada's name is Ada New and phone is 222. Bob's href is `/admin/customers/bob%40ex.com`.                                                                                                                 | same                                       | GS-1       |
| GS-3 | Combined filters  | P1   | unit  | same                                             | new `it`        | `combined filters keep only guests that match every set filter`              | Four guests in the Contract fixture below. The full filter returns only `ada@ex.com`. Dropping any one constraint lets a different guest in, and that guest is absent from the full filter. Name filter ` LOVELACE` matches. Phone filter is the stored substring `0100`, not a normalized phone.                                                                                                                                                                                                                                                       | same                                       | GS-2       |
| GS-6 | Clear             | P1   | unit  | same                                             | new `it`        | `clearing every filter returns every guest row`                              | Using the GS-3 rows, `{ name: "lovelace" }` hides `bob@ex.com`. `segmentGuests(rows)` and `segmentGuests(rows, {})` both return `ada@ex.com`, `bea@ex.com`, `cara@ex.com`, and `dot@ex.com`. `parseGuestSegmentFilters({})` is `{}`. With those rows loaded, `listGuestSegments({})` returns the same four emails.                                                                                                                                                                                                                                      | same                                       | GS-2, GS-3 |
| GS-4 | Results follow    | P2   | unit  | same                                             | new `it`        | `changing a filter changes the rows and an empty match does not error`       | Same rows. `segmentGuests(rows, { name: "ada" })` emails are `ada@ex.com` and `bea@ex.com`. `segmentGuests(rows, { name: "zzz" })` is `[]`. `listGuestSegments({ name: "zzz" })` equals `{ guests: [] }` and does not reject.                                                                                                                                                                                                                                                                                                                           | same                                       | GS-3, GS-6 |

### GS-3 fixture

| email       | name         | phone    | rows (status, date, time)                                                        |
| ----------- | ------------ | -------- | -------------------------------------------------------------------------------- |
| ada@ex.com  | Ada Lovelace | 555-0100 | completed 2026-05-01 12:00; completed 2026-06-01 19:00; no_show 2026-04-01 12:00 |
| bea@ex.com  | ada          | 555-0199 | completed 2026-05-01 12:00; completed 2026-06-01 19:00                           |
| cara@ex.com | Ada Lovelace | 555-0100 | completed 2026-07-01 19:00; no_show 2026-04-01 12:00                             |
| dot@ex.com  | Cara         | 555-0100 | completed 2026-05-01 12:00; completed 2026-05-02 12:00; no_show 2026-04-01 12:00 |

Newest row supplies the displayed name and phone (the last row listed above is not always newest). Full filter: `{ name: "  LOVELACE ", phone: "0100", minCompleted: 2, hasNoShow: true, lastVisitOnOrBefore: "2026-06-15" }` → only ada. bea fails name and no-show. cara fails minCompleted and last visit (newest completed date is 2026-07-01). dot fails name.

## Traceability Matrix

| Criterion | Spec ref                   | Test file::name                                       | Source file(s)                                              | Risk | Status  |
| --------- | -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- | ---- | ------- |
| GS-1      | guest-segmentation.md GS-1 | segmentation.test.ts::listing guests requires staff…  | app/actions/guest-profiles.ts, app/admin/customers/page.tsx | P0   | planned |
| GS-5      | guest-segmentation.md GS-5 | segmentation.test.ts::loading filtering and clearing… | app/actions/guest-profiles.ts, app/admin/customers/page.tsx | P0   | planned |
| GS-2      | guest-segmentation.md GS-2 | segmentation.test.ts::one normalized email uses…      | lib/guest-profiles.ts                                       | P1   | planned |
| GS-3      | guest-segmentation.md GS-3 | segmentation.test.ts::combined filters keep only…     | lib/guest-profiles.ts                                       | P1   | planned |
| GS-6      | guest-segmentation.md GS-6 | segmentation.test.ts::clearing every filter returns…  | lib/guest-profiles.ts, app/actions/guest-profiles.ts        | P1   | planned |
| GS-4      | guest-segmentation.md GS-4 | segmentation.test.ts::changing a filter changes…      | lib/guest-profiles.ts, app/actions/guest-profiles.ts        | P2   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Reuse: `tests/unit/guest-profiles/staff-gate.test.ts` thenable mock shape; `normalizeGuestEmail` and `guestProfileHref` in `lib/guest-profiles.ts`; `requireStaffUser` in `lib/supabase/require-staff.ts`.
- Verification command from the Ready brief: `pnpm test:unit tests/unit/guest-profiles`.

## Permissions Requested (before execution)

Ready brief Allowed edits, pre-granted:

- `app/admin/customers/page.tsx` (new file)
- `app/actions/guest-profiles.ts`
- `lib/guest-profiles.ts`
- `tests/unit/guest-profiles/` (new file `segmentation.test.ts` only; do not edit existing tests)

No spec edit. No existing-test edit.

## TDD Execution Loop

Execute in this order: GS-1, GS-5, GS-2, GS-3, GS-6, GS-4.

GS-1 Green must not implement filter matching. Later Greens stay inside the contract and the current `it`. If a new `it` is already green because an earlier criterion implemented it, Red reports PINNED with the command output and does not weaken the assertion. The orchestrator skips Green and runs Refactor re-verify only.

### Criterion GS-1 — Staff list (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for GS-1. Read `.cursor/plans/res-86_guest_segmentation_88f7.plan.md` Contract and Criterion GS-1 first. New file `tests/unit/guest-profiles/segmentation.test.ts`, test `listing guests requires staff and the filter form is guest-segment-filters`. Missing exports fail on `typeof === "function"`, not on an import error. Command: `pnpm test:unit tests/unit/guest-profiles`. Do not edit existing tests. Do not touch source.
- **Green** → Invoke `tdd-green` to add a gated `listGuestSegments` that calls `createServiceClient` only after `requireStaffUser` succeeds and returns `{ guests: [] }`, and to add `app/admin/customers/page.tsx` with `data-testid="guest-segment-filters"` only after `result.error` is handled. Do not match filters. Exit = this test green and the guest-profiles unit folder green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-1 only. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GS-5 — Read only (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `loading filtering and clearing the guest list writes no reservation column`. Do not edit the GS-1 test. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` only if that `it` is red. The select list stays `email, guest_name, phone, status, date, time`. No insert, update, or delete. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-5. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GS-2 — One row per email (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `one normalized email uses the newest name and phone and links to the ficha`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` to add `segmentGuests` with grouping, newest name and phone, blank-email skip, and `guestProfileHref`. Do not apply filters yet beyond returning every group when filters are omitted. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-2. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GS-3 — Combined filters (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `combined filters keep only guests that match every set filter` using the GS-3 fixture. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` so `segmentGuests` applies the five filters with AND. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-3. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GS-6 — Clear (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `clearing every filter returns every guest row`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` so empty filters return every GS-2 row and `listGuestSegments` passes rows through `segmentGuests`. Add `parseGuestSegmentFilters`. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-6. Exit = green + lint + typecheck + prettier --check on touched source.

### Criterion GS-4 — Results follow (layer: unit)

- **Red** → Invoke `tdd-red` to add one `it` `changing a filter changes the rows and an empty match does not error`. Do not edit earlier tests. Command: `pnpm test:unit tests/unit/guest-profiles`.
- **Green** → Invoke `tdd-green` only if that `it` is red. An empty match returns `{ guests: [] }` and does not throw. Exit = this `it` green.
- **Refactor** → Invoke `tdd-refactor` to clean GS-4. Exit = green + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

Work started: `/sdd-to-tdd` execution · plan `res-86_guest_segmentation_88f7`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-86_guest_segmentation_88f7.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/guest-segmentation.md`
Criteria: 6 automatable · 0 manual-UAT
Approval gates: none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy res-86_guest_segmentation_88f7.plan.md

Problem: Staff cannot filter the guest list. `/admin/customers` has no index page, so there is no AND filter over name, phone, completed visits, no-show, or last completed date. The spec already requires one read-only row per non-blank normalized email.
Approach: `segmentGuests` groups reservations by normalized email and applies optional AND filters. `listGuestSegments` reads `email, guest_name, phone, status, date, time` through the service role after `requireStaffUser` and never writes. The page form `data-testid="guest-segment-filters"` submits those filters with GET. Clearing them returns every guest row. The proxy redirect for non-staff stays as it is.
Out-of-scope findings: Saved segments (low); Marketing campaign or VIP rule (low); Guests with no email (low)

| #   | Criterion                                       | Risk | Layer | Test file                                      |
| --- | ----------------------------------------------- | ---- | ----- | ---------------------------------------------- |
| 1   | GS-1 staff gate and guest-segment-filters       | P0   | unit  | tests/unit/guest-profiles/segmentation.test.ts |
| 2   | GS-5 load, filter, and clear write nothing      | P0   | unit  | tests/unit/guest-profiles/segmentation.test.ts |
| 3   | GS-2 one row, newest name and phone, ficha link | P1   | unit  | tests/unit/guest-profiles/segmentation.test.ts |
| 4   | GS-3 combined AND filters                       | P1   | unit  | tests/unit/guest-profiles/segmentation.test.ts |
| 5   | GS-6 clear returns every guest row              | P1   | unit  | tests/unit/guest-profiles/segmentation.test.ts |
| 6   | GS-4 filter changes rows; empty match is quiet  | P2   | unit  | tests/unit/guest-profiles/segmentation.test.ts |

## Docs Sync

Execution-start todo: `start-linear` — first, before Criterion GS-1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before GS-1 Red.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` is last delegated todo: after 4C/4B, `pnpm exec prettier --write` this run's dirty paths (`git status --porcelain`; never `.`), then STEP 4G, then STEP 4F (execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`).

## Docs sync packet

- plan_slug: res-86_guest_segmentation_88f7
- spec: docs/specs/guest-segmentation.md
- mode: FIX
- linear_issue: RES-86
- criteria_shipped: GS-1, GS-5, GS-2, GS-3, GS-6, GS-4
- acceptance_criteria_ids: [GS-1, GS-2, GS-3, GS-4, GS-5, GS-6]
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

Design already deferred these. Do not re-file them.

| Finding                        | Where (file:line/area)           | Why it matters                           | Severity | Relation                |
| ------------------------------ | -------------------------------- | ---------------------------------------- | -------- | ----------------------- |
| Saved segments                 | docs/specs/guest-segmentation.md | v1 filters are ephemeral                 | low      | already on product-gaps |
| Marketing campaign or VIP rule | docs/specs/guest-segmentation.md | the issue excludes fixed marketing rules | low      | already on product-gaps |
| Guests with no email           | docs/specs/guest-segmentation.md | a blank email has no ficha               | low      | already on product-gaps |

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-86 (plan: `res-86_guest_segmentation_88f7`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`. Do not wait before GS-1 Red.
- **Close-out (FIX):** delegate `linear-resolver` to post the resolution comment only. No workflow-state write.
- **Findings registration:** if the run file has open lines, merge them, then persist without auto-confirming net-new issues. Design deferrals above are already ledgered — do not create new issues for them.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- auth → `app/actions/guest-profiles.ts` `listGuestSegments`
- grouping and filters → `lib/guest-profiles.ts` `segmentGuests`
- list page → `app/admin/customers/page.tsx`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-86_guest_segmentation_88f7`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-86_guest_segmentation_88f7.plan.md`. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START (`run_in_background: true`; do not wait). No spec edit. Delegate Criterion GS-1 Red.

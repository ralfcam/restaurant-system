# /sdd-to-tdd RES-98 — staff paths match a segment boundary

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-08).
Branch `cursor/res-98-0d6a` from `origin/staging`. Ready brief Queue 4
(dispatch 2026-10-07) pre-authorizes the paths in Permissions Requested.
Verification: `pnpm test:unit tests/unit/auth/staff-proxy.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/staff-authorization.md`, (2) the findings revision pass on
  `docs/findings/runs/res-98_staff_path_segment_0d6a.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-98_staff_path_segment_0d6a.md` after
  `tdd-refactor`, and (4) at close-out, **`## Suggested Review Order
(collated)`**, **`## Traceability (final)`**, and **`## Run metrics`** in
  that tdd log. After a spec or living-findings write, `pnpm exec prettier
--write` **that file** (never `prettier --write .`). Snapshot trees
  (`docs/verifier-reports`, `docs/findings/runs`) are prettierignored.
  Everything else is delegated.
- **Every test change** comes from a `tdd-red` Task call. **Every source
  change** from `tdd-green`. **Every cleanup / re-verify** from
  `tdd-refactor`. Run them sequentially, one **phase** at a time.
- **Do not mark a phase done on subagent assertion alone.** Before advancing,
  the phase's exit condition must be visible from a fresh command in this
  turn, and the diff must match the report.
- **One Task call per phase.** Never pass `model` on Task for `tdd-red` /
  `tdd-green` / `tdd-refactor` / `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`,
  `hooks/**`, `src/**`, or `supabase/**` yourself.
- Docs sync = `docs-updater`. **Wait for its report** before 4C. Linear START,
  close-out, and finding registration = `linear-resolver`. START is the first
  execution Task, `run_in_background: true`. Do **not** wait for START before
  the spec edit or C1 Red.
- Arm `node .cursor/hooks/tdd-guard.mjs on` as the first execution shell
  action. Set `phase red|green|refactor` before each phase Task and
  `phase clear` after Refactor. Disarm with `off` as the last action after
  commit/push (or on a stop).
- **Close-out sequence:** 4D → 4E → Docs sync packet → Step 4 (docs-updater)
  → 4C → 4B → format pass (`pnpm exec prettier --write` on this run's dirty
  paths; never `.`) → STEP 4G (`node .cursor/checks/coderabbit-gate.mjs`) →
  STEP 4F (`.cursor/commands/commit.md`, then `.cursor/commands/push.md` on
  PASS). Never `gh pr ready`. Never `gh pr merge`.
- Verification command for every phase:
  `pnpm test:unit tests/unit/auth/staff-proxy.test.ts`.
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-98_staff_path_segment_0d6a.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. Paginated `list_projects` for
  team RES: V-0.5 Backlog, V-0.2 Completed, V-0.1 Completed. Only one
  nonterminal version project. Team key confirmed `RES`.
- Work type: launch-critical/security (staff-route authorization boundary).
- Milestone: M8 — General Availability (GA). The issue is already on that
  milestone. No move.
- Mixed design + implementation: no. The Ready brief Decisions place the
  segment rule in existing SA-2.
- Clarification: resolved by the Ready brief Decisions (dispatch 2026-10-07).
  No `Clarification required` comment on RES-98. No blocker. Not claimed.

## Issue & Root Cause (FIX mode only)

- Issue: RES-98 — `updateSession` treats a pathname as staff when it
  `startsWith` `/admin`, `/pos`, or `/kds`. Expected: a staff path equals
  one of those prefixes or continues with a slash, so `/administrator`,
  `/position`, and `/kds-extra` are guest paths.
- Missing constraint (root cause): SA-2 says "Paths prefixed `/admin`,
  `/pos`, or `/kds`". That raw prefix is what
  `lib/supabase/proxy.ts:35-36` implements. `/administrator`.startsWith
  (`/admin`) is true, so an unauthenticated request is redirected to
  `/auth/login`. Confirmed by reading the file this run.
- Sibling: `i18n/middleware-scope.ts` matches
  `pathname === prefix || pathname.startsWith(prefix + "/")` (AC-19).
  `docs/testing/Design-And-Patterns.md` names that shape. Green on RES-50
  was told not to change `STAFF_PATHS` (filed as RES-98).
- Codegraph: no `codegraph_explore` tool in this runtime. Grep/Read of
  `updateSession` and `tests/unit/auth/staff-proxy.test.ts`.
- Recent history: `git log` on `lib/supabase/proxy.ts` has no later
  segment guard. Latest auth commits on this branch are callback `next`
  (`f643ab1`) and non-staff sign-out (`c9ef8cc`), neither touches the
  staff-path match.
- Spec update proposed: `docs/specs/staff-authorization.md` → replace the
  raw prefix sentence in SA-2 with the segment boundary.

## Spec

- Source: extend existing `docs/specs/staff-authorization.md`
- Summary: a pathname is staff-only only when it equals `/admin`, `/pos`,
  or `/kds`, or continues with a slash. Lookalikes are guest paths.
  Unauthenticated staff paths still redirect to `/auth/login`; authenticated
  non-staff still redirect to `/`; a staff claim still continues.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                           | Risk | Layer | Test file                             | New or existing                              | Test name                                  | Assertion             | Command                                              | Depends on |
| --- | ----------------------------------------------------------------------------------- | ---- | ----- | ------------------------------------- | -------------------------------------------- | ------------------------------------------ | --------------------- | ---------------------------------------------------- | ---------- |
| 1   | SA-2 segment boundary: lookalikes are not staff paths; a nested staff path still is | P0   | unit  | `tests/unit/auth/staff-proxy.test.ts` | add one `it` (do not edit the existing `it`) | `lookalike pathnames are not staff routes` | See C1. Must execute. | `pnpm test:unit tests/unit/auth/staff-proxy.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref | Test file::name                                                                   | Source file(s)          | Risk | Status  |
| --------- | -------- | --------------------------------------------------------------------------------- | ----------------------- | ---- | ------- |
| C1        | SA-2     | `tests/unit/auth/staff-proxy.test.ts`::`lookalike pathnames are not staff routes` | `lib/supabase/proxy.ts` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/staff-authorization.md` — replace the SA-2
  raw prefix sentence with the segment boundary. Ready brief Allowed edits
  lists this path.
- Existing-test edit: `tests/unit/auth/staff-proxy.test.ts` — add one new
  `it` only. Do not modify, rename, or delete the existing test. Ready brief
  Allowed edits lists this path.

## TDD Execution Loop

### Criterion 1 — SA-2 staff-path segment boundary (layer: unit)

Spec excerpt the phases must implement and not widen:

A pathname is a staff path only when it equals `/admin`, `/pos`, or `/kds`,
or continues with a slash. `/administrator`, `/position`, and `/kds-extra`
are not staff paths. Unauthenticated requests to a staff path redirect to
`/auth/login`. Authenticated non-staff requests redirect to `/`. A staff
claim continues. Guest paths, including those lookalikes, are unchanged.
`super_admin` still satisfies the gate through SA-1. Do not change login
sign-out (SA-3) or callback `next` (SA-3-NEXT / RES-129).

- **Red** → Invoke `tdd-red` to add one `it` in
  `tests/unit/auth/staff-proxy.test.ts` named
  `lookalike pathnames are not staff routes`. Reuse `requestFor`,
  `redirectPath`, and the existing Supabase mock. For `/administrator`,
  `/position`, and `/kds-extra`, an unauthenticated session must not
  redirect to `/auth/login`, and an authenticated non-staff session must
  not redirect to `/`. For `/admin/floor`, unauthenticated redirects to
  `/auth/login`, non-staff redirects to `/`, and a staff claim redirects
  to neither. Do not edit the existing `it` or any source file. The
  lookalike cases must fail on today's `startsWith`. Exit: that new test
  failed, and the failure is an assertion (not a missing import or a skip).
- **Green** → Invoke `tdd-green` to make that test pass by changing only
  `lib/supabase/proxy.ts`. Match a prefix only when the pathname equals it
  or continues with a slash. Exit: the target file executed and passed.
- **Refactor** → Invoke `tdd-refactor` to clean the matcher without
  changing behavior. Exit: the target test executed and passed, plus lint
  and typecheck on the touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-98_staff_path_segment_0d6a`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-98_staff_path_segment_0d6a.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/staff-authorization.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/staff-authorization.md` | existing-test edit `tests/unit/auth/staff-proxy.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-98_staff_path_segment_0d6a.plan.md`

Problem: `updateSession` treats a pathname as staff when it starts with `/admin`, `/pos`, or `/kds`. An unauthenticated request to `/administrator` is sent to `/auth/login`. SA-2 currently states that raw prefix. The missing constraint is a segment boundary: the pathname equals the prefix or continues with a slash.
Approach: Rewrite SA-2 so `/administrator`, `/position`, and `/kds-extra` are guest paths, while `/admin/floor` stays staff-only. One unit test in the existing staff-proxy file drives both sides. The matcher lives only in `lib/supabase/proxy.ts`.
Out-of-scope findings: none

| #   | Criterion                                                              | Risk | Layer | Test file                           |
| --- | ---------------------------------------------------------------------- | ---- | ----- | ----------------------------------- |
| 1   | Lookalike pathnames are not staff routes; a nested staff path still is | P0   | unit  | tests/unit/auth/staff-proxy.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / C1 Red.
INPUT: this plan's `## Linear Plan Digest` section. Task
`run_in_background: true`. Do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

## Docs sync packet

- plan_slug: res-98_staff_path_segment_0d6a
- spec: docs/specs/staff-authorization.md
- mode: FIX
- linear_issue: RES-98
- criteria_shipped: [SA-2]
- criteria_manual_uat: none
- req_ids: []
- source_paths: [lib/supabase/proxy.ts]
- test_paths: [tests/unit/auth/staff-proxy.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-98_staff_path_segment_0d6a.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

The Ready brief already excludes callback `next` (RES-129, shipped as
SA-3-NEXT) and login sign-out (SA-3, shipped). Those stay tracked on their
own criteria. Do not reopen them.

## Linear Close-out & Findings Registration

FIX close-out posts the resolution comment only. Do not set In Progress,
In Review, or Done. If the run file stays empty and no phase adds a
finding, skip new-issue registration and say so in the metrics. Standing
ledger lines that this run did not open are not this run's findings.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- filled at close-out

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- filled at close-out

## First Execution Action

1. `node .cursor/hooks/tdd-guard.mjs on`
2. `start-linear` in the background (do not wait)
3. Replace the SA-2 prefix sentence in `docs/specs/staff-authorization.md`
   and prettier that file
4. C1 Red → Green → Refactor

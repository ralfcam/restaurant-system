# /sdd-to-tdd RES-129 — callback next stays on this origin

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-07).
Branch `cursor/res-129-ad67` from `origin/staging`. Ready brief Queue 1
(dispatch 2026-10-07) pre-authorizes the paths in Permissions Requested.
Verification: `pnpm test:unit tests/unit/auth/callback-next.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/staff-authorization.md`, (2) the findings revision pass on
  `docs/findings/runs/res-129_callback_next_ad67.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-129_callback_next_ad67.md` after
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
  `pnpm test:unit tests/unit/auth/callback-next.test.ts`.
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-129_callback_next_ad67.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. Only nonterminal RES version
  project. Team key confirmed `RES`.
- Work type: launch-critical/security (auth callback open-redirect class).
- Milestone: M8 — General Availability (GA). The issue is already on that
  milestone. No move.
- Mixed design + implementation: no. The 2026-10-05 answer places the rule
  in the existing `docs/specs/staff-authorization.md`, beside SA-3.
  `/design` does not edit an existing spec.
- Clarification: resolved by the human comment on
  `clarify:RES-129:staff-authorization:SA-3` (2026-10-05T08:07Z) and by the
  Ready brief Decisions.

## Issue & Root Cause (FIX mode only)

- Issue: RES-129 — `GET /auth/callback` builds the success redirect as
  `` `${origin}${next}` ``. Expected: `next` is used only when it is a
  same-origin relative path; anything else falls back to `/admin`.
- Missing constraint (root cause): SA-3 covers password-login sign-out only.
  No criterion constrains callback `next`. The handler at
  `app/auth/callback/route.ts` (success branch) concatenates the raw query
  value. Confirmed by reading that file this run. Sibling
  `app/auth/login/page.tsx` sends staff to the fixed path `/admin` and never
  reads `next`. `git log` on the callback file shows no later guard
  (`5cef755` is the introducing commit on this history).
- Codegraph: no `codegraph_explore` tool in this runtime. Grep/Read of the
  route and of `tests/unit/auth/` found no callback handler test.
- Spec update proposed: `docs/specs/staff-authorization.md` → SA-3-NEXT,
  inserted after SA-3.

## Spec

- Source: extend existing `docs/specs/staff-authorization.md`
- Summary: after a successful code exchange, redirect with `next` only when
  it is a same-origin relative path (single leading `/`, second character
  not `/` or `\`, no `://`). Otherwise use `/admin`. No `code`, or a failed
  exchange, still goes to `/auth/error`.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                              | Risk | Layer | Test file                               | New or existing | Test name                                                              | Assertion             | Command                                                | Depends on |
| --- | -------------------------------------------------------------------------------------- | ---- | ----- | --------------------------------------- | --------------- | ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ | ---------- |
| 1   | SA-3-NEXT: off-site `next` falls back to `/admin`; a same-origin relative path is kept | P0   | unit  | `tests/unit/auth/callback-next.test.ts` | new file        | `callback next falls back to /admin when it is not a same-origin path` | See C1. Must execute. | `pnpm test:unit tests/unit/auth/callback-next.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref  | Test file::name                                                                                                 | Source file(s)               | Risk | Status  |
| --------- | --------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---- | ------- |
| C1        | SA-3-NEXT | `tests/unit/auth/callback-next.test.ts`::`callback next falls back to /admin when it is not a same-origin path` | `app/auth/callback/route.ts` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/staff-authorization.md` — add SA-3-NEXT
  beside SA-3. Ready brief Allowed edits lists this path.
- Existing-test edit: none. No callback handler test exists. The new file
  is `tests/unit/auth/callback-next.test.ts`.

## TDD Execution Loop

### Criterion 1 — SA-3-NEXT callback next (layer: unit)

Spec excerpt the phases must implement and not widen:

`GET /auth/callback` reads `next` (default `/admin` when absent). After
`exchangeCodeForSession` succeeds, redirect to `` `${origin}${next}` `` only
when `next` is a same-origin relative path: first character `/`, second
character neither `/` nor `\`, and the value does not contain `://`. Every
other value falls back to `/admin` before concatenation. No `code`, or a
failed exchange, still redirects to `` `${origin}/auth/error` `` and does
not use `next`.

- **Red** → Invoke `tdd-red` to add one `it` in the new file
  `tests/unit/auth/callback-next.test.ts` named
  `callback next falls back to /admin when it is not a same-origin path`.
  Import `GET` from `@/app/auth/callback/route`. Mock
  `@/lib/supabase/server` `createClient` so `exchangeCodeForSession`
  resolves `{ error: null }` for the success cases. Use `NextRequest` with
  origin `http://localhost`. On success, assert the redirect location for
  `next` values `//evil.example`, `https://evil.example`, and `/\evil.example`
  is `http://localhost/admin`, and for `next=/admin/reservations` is
  `http://localhost/admin/reservations`. The off-site cases must fail on
  today's concatenation. Do not edit source. Exit: that test failed, and
  the failure is an assertion (not a missing import or a skip).
- **Green** → Invoke `tdd-green` to make that test pass by changing only
  `app/auth/callback/route.ts`. Exit: the target test executed and passed.
- **Refactor** → Invoke `tdd-refactor` to clean the callback guard without
  changing behavior. Exit: the target test executed and passed, plus lint
  and typecheck on the touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-129_callback_next_ad67`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-129_callback_next_ad67.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/staff-authorization.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/staff-authorization.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-129_callback_next_ad67.plan.md`

Problem: `GET /auth/callback` redirects to origin plus the raw `next` query value. SA-3 only covers password-login sign-out, so an off-site `next` (absolute URL, protocol-relative `//`, or a backslash) is concatenated. The missing constraint is a same-origin relative-path rule beside SA-3.
Approach: Add SA-3-NEXT. Accept `next` only when it starts with a single `/`, the next character is not `/` or `\`, and the value has no `://`. Anything else falls back to `/admin`. A missing or failed code still goes to `/auth/error`. One unit test drives the handler with a mocked code exchange.
Out-of-scope findings: none

| #   | Criterion                                                            | Risk | Layer | Test file                             |
| --- | -------------------------------------------------------------------- | ---- | ----- | ------------------------------------- |
| 1   | Off-site callback next falls back to /admin; a relative path is kept | P0   | unit  | tests/unit/auth/callback-next.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / C1 Red.
INPUT: this plan's `## Linear Plan Digest` section. Task
`run_in_background: true`. Do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

## Docs sync packet

- plan_slug: res-129_callback_next_ad67
- spec: docs/specs/staff-authorization.md
- mode: FIX
- linear_issue: RES-129
- criteria_shipped: [SA-3-NEXT]
- criteria_manual_uat: none
- req_ids: []
- source_paths: [app/auth/callback/route.ts]
- test_paths: [tests/unit/auth/callback-next.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-129_callback_next_ad67.md
- drift_flagged: none
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none

## Linear Close-out & Findings Registration

FIX close-out posts the resolution comment only. Do not set In Progress,
In Review, or Done.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- filled at close-out

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- filled at close-out

## First Execution Action

1. `node .cursor/hooks/tdd-guard.mjs on`
2. `start-linear` in the background (do not wait)
3. Insert SA-3-NEXT into `docs/specs/staff-authorization.md` and prettier
   that file
4. C1 Red → Green → Refactor

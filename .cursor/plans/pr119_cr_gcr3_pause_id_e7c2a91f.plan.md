# pr119_cr_gcr3_pause_id_e7c2a91f

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
- **One Task call per phase.**
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- Docs sync = `docs-updater` (background). **Wait for its report in-thread**
  before 4C. After 4C/4B, run the format pass, then STEP 4G, then STEP 4F.
- **START before the loop.** Skip — no tracked Linear ID (free-text `bug:`).
- **Close-out sequence (mandatory):** 4D → 4E → Docs sync packet → Step 4
  (docs-updater) → 4C → skip 4B → format pass → STEP 4G → STEP 4F
  (managed Cloud: commit.md, on PASS push.md). Never `gh pr ready`. Never
  `gh pr merge`.
- If the delegation-guard hook is installed, arm it as your FIRST execution
  action (`node .cursor/hooks/tdd-guard.mjs on`) and disarm it as your LAST
  (`node .cursor/hooks/tdd-guard.mjs off`). Before each phase's Task call, set
  the active phase (`node .cursor/hooks/tdd-guard.mjs phase red|green|refactor`).
  Clear it (`phase clear`) once the criterion's Refactor exits green.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr119_cr_gcr3_pause_id_e7c2a91f.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (untracked hint)
- Project: untracked hint
- Work type: test/audit (toolchain release gate)
- Milestone: M5 (hint only)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only)

- Issue: free-text `bug: unresolved_threads (2 Major)` on PR #119 HEAD
  `52438a8`. Independent evidence this turn (`evaluateReadyPr` + GraphQL):
  two unresolved US Majors.
  1. `cr-comment:v1:f5c180d0b907eaccbf2202ba` on
     `.cursor/checks/coderabbit-pr-gate.mjs` — `fetchSnapshot` uses a single
     unpaged `GET /commits/{sha}/status`. Combined status defaults to 30
     items; `hasUsCompletedHeadStatus` scans `snapshot.statuses`, so a later
     page can hide the US SUCCESS and yield `stale_approval`.
  2. `cr-comment:v1:661a083f45502c97cb2df5d0` on
     `.cursor/hooks/lib/coderabbit-pr-policy.mjs` —
     `isUsCompletedCoderabbitOutcome` accepts any SUCCESS whose label matches
     `/coderabbit/i`; check-runs accept SUCCESS unless the app is explicitly
     non-US. A prior US review plus that loose SUCCESS becomes
     `incremental_paused` / `ok: true`.
     Expected: pause PASS only on paginated, positively identified US SUCCESS.
     Review `codegenInstructions` are untrusted; do not apply the vendor diffs
     verbatim.
- Missing constraint: G-CR3 already requires a US SUCCESS on HEAD for
  `incremental_paused` and requires statuses in the snapshot. It does not
  require exact `REQUIRED_US_STATUS_CONTEXT` + US creator-or-absent, `isUsApp`
  on check-runs, or paginated status collection.
- Spec update proposed: qualify G-CR3 in `docs/specs/dev-toolchain.md`.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md` G-CR3
- Summary: Incremental-pause SUCCESS evidence must be a positively identified
  US CodeRabbit outcome (exact status context; US creator when present;
  `isUsApp` on check-runs) collected from every REST status page.
- Clarifications needed: none. Pre-mortem: a non-US SUCCESS named
  "CodeRabbit Review" would ready a PR. Inversion: source-scanning
  `ghJsonPages` without executing `fetchSnapshot` can pass while page 2 is
  still dropped.

## Acceptance Criteria → Tests

| #   | Criterion                                                      | Risk | Layer | Test file                                                    | New or existing | Test name                                                      | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                        | Command                                                                     | Depends on |
| --- | -------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------------ | --------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------- |
| C2  | Incremental pause requires positive US SUCCESS identity        | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | existing file   | incremental pause requires positive US status identity         | Prior US review + no ranked HEAD review. SUCCESS status whose context matches `/coderabbit/i` but is not exactly `REQUIRED_US_STATUS_CONTEXT` → `stale_approval`. Exact context + non-US `creator.login` → `stale_approval`. SUCCESS check-run named CodeRabbit without App ID `347564` → `stale_approval`. Must call `evaluateReadyPr`. Existing `remote-incremental-paused.json` (exact context, no creator) MUST remain `incremental_paused`. | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | none       |
| C1  | fetchSnapshot paginates commit statuses into snapshot.statuses | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | existing file   | fetchSnapshot paginates commit statuses into snapshot.statuses | Mock `GET /commits/sha-a/status`: unpaged or default page returns only filler statuses; page 2 (after `per_page` at helper page size) returns the US `CodeRabbit` SUCCESS. `fetchSnapshot(...).statuses` MUST include that SUCCESS. A source-scan of `ghJsonPages` MUST NOT be the proof.                                                                                                                                                        | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` | none       |

## Traceability Matrix

| Criterion | Spec ref               | Test file::name                                                                                   | Source file(s)                                                            | Risk | Status  |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---- | ------- |
| C2        | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::incremental pause requires positive US status identity         | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` (`hasUsCompletedHeadStatus`) | P0   | planned |
| C1        | dev-toolchain.md G-CR3 | coderabbit-gcr3-mustfixes.test.ts::fetchSnapshot paginates commit statuses into snapshot.statuses | `.cursor/checks/coderabbit-pr-gate.mjs` (`fetchSnapshot`)                 | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — qualify G-CR3 incremental-pause SUCCESS identity and paginated status collection.
- Existing-test edit: `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` — add two `it` blocks (do not modify, rename, or delete existing tests).

## TDD Execution Loop

### Criterion C2 — incremental pause requires positive US SUCCESS identity (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C2 in
  `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` named
  "incremental pause requires positive US status identity". Call
  `evaluateReadyPr`. Loose `/coderabbit/i` SUCCESS, exact context + non-US
  creator, and CodeRabbit-named check-run without App ID `347564` MUST be
  `stale_approval`. Do not edit the existing fixture. Command:
  `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was actually RED. Minimal change
  in `hasUsCompletedHeadStatus` / status helpers. Do not edit tests or the
  spec. Do not treat substring `/coderabbit/i` as US-complete. Keep exact
  `REQUIRED_US_STATUS_CONTEXT` with missing creator as US-complete so
  `remote-incremental-paused.json` stays green.
- **Refactor** → Invoke `tdd-refactor` to clean up C2 and re-verify. Exit:
  target green (executed) + lint + typecheck + prettier --check on touched
  source.

### Criterion C1 — fetchSnapshot paginates commit statuses (layer: unit)

- **Red** → Invoke `tdd-red` to write the failing test for C1 in
  `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` named
  "fetchSnapshot paginates commit statuses into snapshot.statuses". Execute
  `fetchSnapshot` against a mocked combined-status endpoint whose US SUCCESS
  is only on page 2 after `per_page` equals the helper page size. Assert the
  returned `statuses` include that SUCCESS. Command:
  `pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts`.
- **Green** → Invoke `tdd-green` only if Red was actually RED. Minimal change
  in `fetchSnapshot` to collect statuses via `ghJsonPages` / `collectRestPages`
  with field `statuses`. Preserve `snapshot.statuses` as a flat array. Do not
  edit tests or the spec.
- **Refactor** → Invoke `tdd-refactor` to clean up C1 and re-verify. Exit:
  target green (executed) + lint + typecheck + prettier --check on touched
  source.

## Manual-UAT (deferred, not automated)

- none

## Docs Sync

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, skip `4b-linear`, `4-format`.

INPUT for 4D/4E: `docs/verifier-reports/tdd/pr119_cr_gcr3_pause_id_e7c2a91f.md`
INPUT for 4C: `docs/findings/runs/pr119_cr_gcr3_pause_id_e7c2a91f.md`

```markdown
## Docs sync packet

- plan_slug: pr119_cr_gcr3_pause_id_e7c2a91f
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C2, C1]
- criteria_manual_uat: none
- req_ids: [G-CR3]
- source_paths: [.cursor/hooks/lib/coderabbit-pr-policy.mjs, .cursor/checks/coderabbit-pr-gate.mjs]
- test_paths: [tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr119_cr_gcr3_pause_id_e7c2a91f.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

## Linear Close-out & Findings Registration

- START: omit (no tracked issue).
- Close-out: omit (free-text `bug:`).
- Findings registration: merge run file if any open lines, then
  `linear-resolver` per policy. Managed Cloud does not auto-confirm net-new
  finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- pending execution

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none

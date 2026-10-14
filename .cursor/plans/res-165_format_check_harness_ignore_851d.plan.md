## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. This work-order is the
managed-Cloud repository work-order for RES-165 (not a native Cursor Plan).

- Direct writes are limited to: this work-order, `.prettierignore` (not a
  protected path), and mechanical `pnpm exec prettier --write` on paths the
  Ready brief explicitly allows. No `tests/**`, `lib/**`, `app/**`,
  `components/**`, `hooks/**`, `src/**`, `supabase/**`, `.cursor/hooks/**`, or
  `docs/specs/**` content edit.
- Linear writes (START, CLARIFY) go only through `linear-resolver`.
- No `gh pr ready`, no `gh pr merge`, no Linear state write, no force-push.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-165_format_check_harness_ignore_851d.plan.md`
- Workflow mode: FIX (mechanical `format:check` class)

## Project & Milestone Route

- Team: RES
- Project: none required (toolchain-only; no product surface)
- Work type: maintenance (harness/toolchain)
- Milestone: M9 (maintenance)
- Mixed design + implementation: no
- Clarification: none (Ready brief complete; Decisions of 14 Oct resolve the
  reformat-vs-ignore choice)

## Issue & Root Cause

- Issue: RES-165 — `pnpm format:check` (`prettier --check .`) is red on
  `staging` at `1d27dba` after sync PR #227 (harness v0.3.2).
- Root cause: the v0.3.2 tarball ships harness files that are not formatted
  to this repo's `.prettierrc.json` (`semi: false`). The sync copied them
  byte-for-byte into `.cursor/`, and Prettier checks the whole tree. 40 files
  under `.cursor/{agents,bootstrap,checks,commands,hooks}` plus
  `.cursor/harness.json` and `.cursor/harness.schema.json` fail. Two
  non-harness files, `tests/unit/dev-toolchain/coderabbit-res146-guards.test.ts`
  and `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts`, also fail.
- Missing constraint: none in `docs/specs/**`. G-F1 only requires the snapshot
  trees to be ignored. No new behavior is introduced, so no spec edit
  (`docs/specs/**` is not in the brief's Allowed edits).

## Route decision (why no tdd-red/green/refactor phases)

The brief limits the diff to formatting or config and lists no spec or test
path under Allowed edits. A Red test would be a new test file (outside the
allowlist) and the golden rule would need a spec edit first (also outside it).
The fix is a mechanical `format:check`-class remediation, which
`.cursor/commands/push.md` Step 1 and `.cursor/commands/commit.md` §0 route to
the gate-remediation lane (no TDD criterion). This plan therefore has
**0 automatable criteria**. The red evidence is the `format:check` run itself,
captured before the fix. The green evidence is `format:check` exit 0 after it.

## Spec

- Source: none changed. Owning spec for reference: `docs/specs/dev-toolchain.md`
  G-F1 (unchanged).
- Summary: exclude harness-owned directories from Prettier, then fix the two
  non-harness files with formatting-only changes.
- Clarifications needed: none.

## Acceptance Criteria → Tests

None automatable (see Route decision). Gate checks used instead:

| #   | Gate                                    | Command                                                                                                    | Expected         |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| G1  | Reproduce red on staging                | `pnpm format:check`                                                                                        | exit 1, 42 files |
| G2  | Green after fix                         | `pnpm format:check`                                                                                        | exit 0           |
| G3  | Harness files byte-identical to staging | `git diff --stat origin/staging -- .cursor/{agents,bootstrap,checks,commands,hooks} .cursor/harness*.json` | empty            |
| G4  | Existing toolchain guard still passes   | `pnpm test:unit tests/unit/dev-toolchain/format-toolchain.test.ts`                                         | pass             |
| G5  | Whole-suite gate                        | `pnpm lint; pnpm typecheck; pnpm test:unit`                                                                | exit 0           |

## Traceability Matrix

| Criterion | Spec ref   | Test file::name | Source file(s)                                    | Risk | Status |
| --------- | ---------- | --------------- | ------------------------------------------------- | ---- | ------ |
| none      | G-F1 (n/c) | —               | `.prettierignore`, two formatting-only test files | P3   | n/a    |

## Execution Preconditions

- Infra needed: none (no integration, e2e, or deployed criterion).

## Permissions Requested (before execution)

- Config edit: `.prettierignore` — add harness-owned `.cursor` paths.
- Formatting-only edit: `tests/unit/dev-toolchain/coderabbit-res146-guards.test.ts`
  and `tests/unit/dev-toolchain/pnpm-overrides-toolchain.test.ts` via
  `pnpm exec prettier --write` (the brief allows formatting-only changes to
  non-harness files). No other spec, test, or source edit.

## TDD Execution Loop

No automatable criteria, so no Red/Green/Refactor phases. See Route decision.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-165_format_check_harness_ignore_851d`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
PR body and `.cursor/plans/res-165_format_check_harness_ignore_851d.plan.md`.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md` (G-F1, unchanged)
Criteria: 0 automatable · 0 manual-UAT
Approval gates: none (`.prettierignore` + formatting-only edits per the Ready brief)
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-165_format_check_harness_ignore_851d.plan.md`

Problem: `pnpm format:check` is red on `staging` since the harness v0.3.2 sync (#227). The tarball ships files that do not match this repo's Prettier config, and 42 files fail. Expected: `format:check` passes without editing the synced harness files.
Approach: Exclude the harness-owned `.cursor` directories in `.prettierignore` so the files stay byte-identical to v0.3.2. Apply a formatting-only fix to the two non-harness test files that also fail. One draft PR into `staging`, never merged.
Out-of-scope findings: none

| #   | Criterion                                             | Risk | Layer | Test file |
| --- | ----------------------------------------------------- | ---- | ----- | --------- |
| —   | none (config/format-only; gate = `pnpm format:check`) | P3   | n/a   | n/a       |
```

## Docs Sync

`skip_reason: no-implementation-impact` (formatting and config only).

## Out-of-Scope Findings

none

## Linear Close-out & Findings Registration

- START: `linear-resolver` posts the digest above as the `Work started:` comment
  (no state write).
- Close-out comment: none. This is a `/conduct` run on a tracked issue, but
  CLOSE-OUT is owned by the sdd-to-tdd FIX path with a regression test; no
  state write is made.
- Findings registration: ledger empty, skipped.

## First Execution Action

Launch START (background), then apply the `.prettierignore` edit and the
formatting-only writes, then `/commit` (gate-remediation lane) and `/push`.

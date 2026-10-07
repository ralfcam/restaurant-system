# RES-121 — BD-READ-FAIL catalog key

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-121_bd_read_fail_key_9550.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES`
- Project: restaurant-system V-0.5 (`d355ac92-faa0-4866-b501-32880e087b91`). Existing nonterminal version project. Precedence: the issue is already on that project.
- Work type: contract clarification
- Milestone: M2 — Requirements Sign-Off (already set). No milestone write.
- Mixed design + implementation: no
- Clarification: none. The issue states the approved replacement.

## Ready brief

`node .cursor/checks/ready-brief.mjs` on the RES-121 description: complete.
Route `/sdd-to-tdd`. Queue 1. Decisions name the catalog key and keep
fail-closed behavior. Allowed edits and verification are below.

## Problem

`docs/specs/booking-rules.md` BD-READ-FAIL item 24 and its trace row still
require the public message `Could not load blocked dates.`
`app/actions/availability.ts` already throws
`errors.availability.blockedDatesLoadFailed`.
`tests/unit/availability/actions.test.ts` and
`tests/unit/availability/message-keys.test.ts` already expect that key.
`docs/specs/site-localization.md` AC-21 requires a bare `errors.*` key.

## Approach

Replace the English sentence in item 24 with the bare catalog key, and state
that the BD-READ-FAIL trace row uses the same key. The regression test reads
the spec and fails while the trace row still names the English sentence.
Then replace that sentence in the trace row. Application code already matches,
so Green does not change it.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — replace the BD-READ-FAIL public message in item 24 and the trace row with `errors.availability.blockedDatesLoadFailed`. Keep fail-closed, server-side log, and never-resolve-false-or-empty-list wording.
- Existing-test edit: `tests/unit/availability/actions.test.ts` — add one spec-pin test. Do not change the existing blocked-date behavior test.

## TDD Execution Loop

### Criterion 1 — BD-READ-FAIL names the catalog key (layer: unit)

- **Red** → Invoke `tdd-red` to add one test `BD-READ-FAIL names the blockedDatesLoadFailed catalog key` in `tests/unit/availability/actions.test.ts`. It reads `docs/specs/booking-rules.md`, and both the BD-READ-FAIL item 24 paragraph and the `BD-READ-FAIL` trace row must contain `errors.availability.blockedDatesLoadFailed` and must not contain `Could not load blocked dates.`. It must execute and fail because the trace row still has the English sentence. Command: `pnpm test:unit tests/unit/availability/actions.test.ts`.
- **Green** → Invoke `tdd-green` to make that test pass. The orchestrator updates the trace row before Green. Do not change `app/actions/availability.ts` if the test is already green. Exit: the target test executed and passed.
- **Refactor** → Invoke `tdd-refactor` to re-verify. No behavior change. Exit: `pnpm test:unit tests/unit/availability/actions.test.ts` green, plus lint and typecheck.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-121_bd_read_fail_key_9550`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-121_bd_read_fail_key_9550.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/booking-rules.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/booking-rules.md` | existing-test edit `tests/unit/availability/actions.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-121_bd_read_fail_key_9550.plan.md`

Problem: BD-READ-FAIL still requires the public sentence "Could not load blocked dates." The blocked-date readers already throw the bare catalog key `errors.availability.blockedDatesLoadFailed`, and the unit tests already expect that key. AC-21 requires a catalog key, so the spec sentence is the drift.
Approach: Amend item 24 and the BD-READ-FAIL trace row to name that catalog key. Keep the fail-closed log and the ban on resolving false or an empty list. Pin both spec sites with one unit test. Do not change the reader implementation.
Out-of-scope findings: none

| #   | Criterion                          | Risk | Layer | Test file                               |
| --- | ---------------------------------- | ---- | ----- | --------------------------------------- |
| 1   | BD-READ-FAIL names the catalog key | P2   | unit  | tests/unit/availability/actions.test.ts |
```

## Docs Sync

- `start-linear` — first, background. INPUT: this plan's `## Linear Plan Digest`.
- Close-out: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`, then STEP 4G and STEP 4F.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the orchestrator, not an implementer. Direct writes are the approved
spec edit, findings revision, the verifier report, and this work-order.
Tests come from `tdd-red`. Source comes from `tdd-green`. Re-verify comes
from `tdd-refactor`. Arm `node .cursor/hooks/tdd-guard.mjs on` first and
disarm it last. START is `run_in_background: true` and does not block the
spec edit or Red.

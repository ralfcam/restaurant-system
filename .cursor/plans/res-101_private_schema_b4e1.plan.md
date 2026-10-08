# /sdd-to-tdd RES-101 — booking trigger function leaves public

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-08).
Branch `cursor/res-101-b4e1` from `origin/staging`. Ready brief Queue 2
(dispatch 2026-10-07) pre-authorizes the paths in Permissions Requested.
Verification: `pnpm test:unit tests/unit/security/reservation-trigger-schema.test.ts`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/booking-rules.md`, (2) the findings revision pass on
  `docs/findings/runs/res-101_private_schema_b4e1.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-101_private_schema_b4e1.md` after
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
  `pnpm test:unit tests/unit/security/reservation-trigger-schema.test.ts`.
- A skipped test is not Red or Green. If a phase returns BLOCKED, stop.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-101_private_schema_b4e1.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`P-RES-12`, status Backlog, nonterminal).
  Precedence: the issue's existing project. V-0.1 and V-0.2 are Completed
  and excluded. No second nonterminal version key.
- Work type: launch-critical/security (SECURITY DEFINER in an API-exposed
  schema).
- Milestone: M8 — General Availability (GA). The issue is already on that
  milestone. No move.
- Mixed design + implementation: no. The 2026-09-15 answer and the Ready
  brief already choose schema `private`.
- Clarification: resolved by Jose Campos on 2026-09-15
  (`clarify:RES-101:booking-rules:RES-TRIGGER-EXEC`, option A) and by the
  Ready brief Decisions.

## Issue & Root Cause (FIX mode only)

- Issue: RES-101 — `validate_reservation_availability()` is still
  `SECURITY DEFINER` in `public`. Expected: the function lives in schema
  `private`, and `enforce_booking_rules` executes that function.
- Missing constraint (root cause): RES-TRIGGER-EXEC requires
  `public.validate_reservation_availability()` to remain in `public`. That
  rule is what kept the function in an API-exposed schema after the EXECUTE
  revoke.
- Evidence: `supabase/migrations/00000000000000_baseline.sql` creates
  `validate_reservation_availability()` as `SECURITY DEFINER` with
  `SET search_path TO public`. The last unqualified
  `CREATE OR REPLACE FUNCTION validate_reservation_availability()` is
  `supabase/migrations/20260918140655_slot_service_cover_limits.sql`.
  `CREATE TRIGGER enforce_booking_rules` in the baseline executes
  `validate_reservation_availability()` with no schema. No migration creates
  schema `private`. Sibling last-writer tests
  (`tests/unit/reservations/walk-in.test.ts`,
  `tests/unit/floor/cover-capacity.test.ts`,
  `tests/unit/reservations/external-booking-import.test.ts`) pin the
  unqualified `CREATE OR REPLACE` text and are not in Allowed edits, so
  those historical bodies stay. The move is a later migration that does not
  contain that unqualified create.
- Codegraph: SQL and specs are Grep/Read, not a named TS symbol.
- Spec update proposed: `docs/specs/booking-rules.md` RES-TRIGGER-EXEC names
  `private.validate_reservation_availability()` instead of requiring the
  function to remain in `public`.

## Spec

- Source: extend existing `docs/specs/booking-rules.md`
- Summary: the booking trigger function stays `SECURITY DEFINER` with
  `SET search_path TO public`, stays the enabled `enforce_booking_rules`
  trigger, and keeps guest EXECUTE revoked. Its schema is `private`, not
  `public`. One forward migration after every unqualified create moves it
  and rebinds the trigger. Historical public revokes stay.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                                                                                                    | Risk | Layer | Test file                                                | New or existing | Test name                                                          | Assertion                                                                                                                                                                                                                                        | Command                                                                 | Depends on |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---- | ----- | -------------------------------------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------- |
| 1   | RES-TRIGGER-EXEC: function schema is `private`; trigger executes it; guest EXECUTE stays revoked; search_path stays `public` | P0   | unit  | `tests/unit/security/reservation-trigger-schema.test.ts` | new file        | `booking trigger function lives in private and is not a guest RPC` | The move migration sorts after every unqualified create, alters the function into `private`, rebinds the trigger, and revokes schema usage and EXECUTE from PUBLIC, anon, and authenticated. Must execute and fail before that migration exists. | `pnpm test:unit tests/unit/security/reservation-trigger-schema.test.ts` | none       |

The Ready brief also lists
`tests/integration/security/sibling-privileges.integ.test.ts`. That existing
catalog query still names `public`. Red updates it in the same criterion so
a later local reset looks up `private.validate_reservation_availability()`.
Do not rename the `it` or move its `describe`. Do not run the integration
suite in this loop. The brief verification command is the unit test.

## Traceability Matrix

| Criterion | Spec ref         | Test file::name                                                                                                              | Source file(s)                                                                     | Risk | Status  |
| --------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---- | ------- |
| C1        | RES-TRIGGER-EXEC | `tests/unit/security/reservation-trigger-schema.test.ts`::`booking trigger function lives in private and is not a guest RPC` | `supabase/migrations/20261008120000_private_validate_reservation_availability.sql` | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). The unit test reads migration files.
  Integration is not a phase command.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/booking-rules.md` — RES-TRIGGER-EXEC names
  `private.validate_reservation_availability()`. Ready brief Allowed edits.
- Existing-test edit: `tests/integration/security/sibling-privileges.integ.test.ts`
  — catalog SQL namespace `public` → `private` for this function, and the
  trigger function's schema is `private`. Keep the test title, the plain
  `describe`, and the zero-arg `assertIsolatedHoursMutationTarget()`
  `beforeAll`. Ready brief Allowed edits.

## TDD Execution Loop

### Criterion 1 — RES-TRIGGER-EXEC private schema (layer: unit)

Spec excerpt the phases must implement and not widen:

`private.validate_reservation_availability()` stays `SECURITY DEFINER` with
`SET search_path TO public` and stays the enabled `enforce_booking_rules`
`BEFORE INSERT OR UPDATE` trigger on `reservations`. It does not remain in
`public`. One migration that sorts after every file containing
`CREATE OR REPLACE FUNCTION validate_reservation_availability()` creates
schema `private`, revokes schema usage from `PUBLIC` and from
`anon, authenticated`, runs
`ALTER FUNCTION public.validate_reservation_availability() SET SCHEMA private`,
rebinds the trigger with
`EXECUTE FUNCTION private.validate_reservation_availability()`, and revokes
`ALL` on `private.validate_reservation_availability()` from `PUBLIC` and from
`anon, authenticated`. That migration does not contain
`CREATE OR REPLACE FUNCTION validate_reservation_availability()` and does not
grant schema `USAGE` or function `EXECUTE` to `PUBLIC`, `anon`, or
`authenticated`. Historical unqualified creates still revoke
`public.validate_reservation_availability()` immediately after the body.
Search path, guest-grant history, and the function body stay unchanged.

- **Red** → Invoke `tdd-red` to add one `it` in the new file
  `tests/unit/security/reservation-trigger-schema.test.ts` named
  `booking trigger function lives in private and is not a guest RPC`.
  Read `supabase/migrations/*.sql`. Fail unless one `.sql` file sorts after
  every file whose comment-stripped text contains
  `CREATE OR REPLACE FUNCTION validate_reservation_availability()`, and that
  later file contains `CREATE SCHEMA IF NOT EXISTS private`,
  `REVOKE ALL ON SCHEMA private FROM PUBLIC`,
  `REVOKE ALL ON SCHEMA private FROM anon, authenticated`,
  `ALTER FUNCTION public.validate_reservation_availability() SET SCHEMA private`,
  `EXECUTE FUNCTION private.validate_reservation_availability()`,
  `REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM PUBLIC`,
  and
  `REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM anon, authenticated`,
  and does not contain the unqualified create marker or a grant of schema
  usage or function execute to `PUBLIC`, `anon`, or `authenticated`.
  Also apply the pre-authorized edit to
  `tests/integration/security/sibling-privileges.integ.test.ts`: the live
  catalog query uses schema `private` for this function
  (`has_function_privilege` and `nspname`), and the trigger object includes
  the function schema, asserted equal to `private`. Do not rename the test,
  do not move it under `describe.skipIf`, and do not change the migration
  scan for unqualified creates and public revokes. Do not edit
  `supabase/**` or the spec. Exit: the new unit test executed and failed
  on a missing migration assertion, not a skip or an import error.
- **Green** → Invoke `tdd-green` to make that unit test pass by adding only
  `supabase/migrations/20261008120000_private_validate_reservation_availability.sql`.
  Do not edit historical function bodies. Do not put an unqualified
  `CREATE OR REPLACE FUNCTION validate_reservation_availability()` in the
  new file. `ALTER FUNCTION ... SET SCHEMA` preserves `SECURITY DEFINER`
  and `search_path`. Recreate `enforce_booking_rules` on
  `public.reservations` so it executes the private function. Guard the
  schema move so a second apply does not require the function to still be
  in `public`. Exit: the target unit test executed and passed.
- **Refactor** → Invoke `tdd-refactor` to clean that migration comment
  without changing behavior. Exit: the target unit test executed and
  passed, `pnpm lint`, `pnpm typecheck`, and
  `pnpm exec prettier --check` on the migration file.

## Manual-UAT (deferred, not automated)

- none. Linked-project re-apply of an older function writer stays the
  existing RES-TRIGGER-EXEC manual note. This run does not `db push`.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-101_private_schema_b4e1`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-101_private_schema_b4e1.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/booking-rules.md`
Criteria: 1 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/booking-rules.md` | existing-test edit `tests/integration/security/sibling-privileges.integ.test.ts`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-101_private_schema_b4e1.plan.md`

Problem: `validate_reservation_availability()` is still SECURITY DEFINER in the API-exposed `public` schema. RES-TRIGGER-EXEC currently requires that public placement. A later GRANT would republish the function as an RPC. The function should live in schema `private`, with the booking trigger pointed at it.
Approach: Amend RES-TRIGGER-EXEC so the function name is `private.validate_reservation_availability()`. Keep SECURITY DEFINER, `SET search_path TO public`, the enabled trigger, and the guest EXECUTE revoke. Add one forward migration after every unqualified create that moves the function and rebinds `enforce_booking_rules`. Historical function bodies stay, because other tests pin that text and are outside Allowed edits. One unit test reads the migration files. The sibling catalog query is updated to schema `private`.
Out-of-scope findings: none

| #   | Criterion                                                        | Risk | Layer | Test file                                              |
| --- | ---------------------------------------------------------------- | ---- | ----- | ------------------------------------------------------ |
| 1   | Booking trigger function lives in private and is not a guest RPC | P0   | unit  | tests/unit/security/reservation-trigger-schema.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / C1 Red.
INPUT: this plan's `## Linear Plan Digest` section. Task
`run_in_background: true`. Do not wait for its report before the spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`,
`4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

## Docs sync packet

- plan_slug: res-101_private_schema_b4e1
- spec: docs/specs/booking-rules.md
- mode: FIX
- linear_issue: RES-101
- criteria_shipped: [RES-TRIGGER-EXEC]
- criteria_manual_uat: none
- req_ids: []
- source_paths: [supabase/migrations/20261008120000_private_validate_reservation_availability.sql]
- test_paths: [tests/unit/security/reservation-trigger-schema.test.ts, tests/integration/security/sibling-privileges.integ.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-101_private_schema_b4e1.md
- drift_flagged: docs/testing/Design-And-Patterns.md trigger-EXECUTE recipe still describes the public function until docs sync
- skip_reason: none

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

none. Search-path changes, guest EXECUTE grants already revoked, and
booking-rule semantics inside the function body are Ready brief exclusions,
not new findings.

## Linear Close-out & Findings Registration

FIX close-out posts the resolution comment only. Do not set In Progress,
In Review, or Done. No findings registration when the ledger is empty.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- filled at close-out

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- filled at close-out

## First Execution Action

1. `node .cursor/hooks/tdd-guard.mjs on`
2. `start-linear` in the background (do not wait)
3. Amend RES-TRIGGER-EXEC in `docs/specs/booking-rules.md` and prettier
   that file
4. C1 Red → Green → Refactor

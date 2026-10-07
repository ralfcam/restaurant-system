# RES-80 external booking import

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (none this run), (2) the findings revision pass on
  `docs/findings/runs/res-80_external_booking_import_c4e1.md` after every phase,
  (3) appending Refactor close-out sections to
  `docs/verifier-reports/tdd/res-80_external_booking_import_c4e1.md` after each
  `tdd-refactor` phase, and (4) at close-out, **`## Suggested Review Order (collated)`**,
  **`## Traceability (final)`**, and **`## Run metrics`** in the same tdd log.
  After a spec or living-findings write, `pnpm exec prettier --write` **that
  file** (never `prettier --write .`). Snapshot trees are prettierignored.
- **Every test change** comes from a `tdd-red` Task. **Every source change**
  from `tdd-green`. **Every cleanup / re-verify** from `tdd-refactor`. One
  phase at a time. Do not mark a phase done on subagent assertion alone. The
  target test's pass/fail must be visible in the returned report.
- **Never pass `model` on Task** for `tdd-red` / `tdd-green` / `tdd-refactor` /
  `docs-updater` / `linear-resolver`.
- You MUST NOT edit `tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`,
  `src/**`, or `supabase/**` yourself.
- START is the first execution Task, `run_in_background: true`. Do not wait
  before Criterion 1 Red. FEATURE close-out omits `4b-linear`.
- Arm `node .cursor/hooks/tdd-guard.mjs on` before the first phase Task. Set
  `phase red|green|refactor` before each phase Task and `phase clear` after
  each Refactor. Disarm `off` as the last action.
- Managed Cloud: after close-out, execute `.cursor/commands/commit.md`; on
  PASS execute `.cursor/commands/push.md`. Never `gh pr ready`. Never
  `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/res-80_external_booking_import_c4e1.plan.md`
- Workflow mode: FEATURE
- linear_issue: RES-80

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: restaurant-system V-0.5 (`d355ac92-faa0-4866-b501-32880e087b91`) — issue already on this nonterminal version project. V-0.1 and V-0.2 are completed and excluded.
- Work type: implementation
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone is M2 — Requirements Sign-Off. This run does not `save_issue` the milestone.
- Mixed design + implementation: no. Governing spec `docs/specs/external-booking-import.md` is already testable (EI-1–EI-8).
- Clarification: none. Ready brief `Decisions:` is `where to land: staging`.

## Spec

- Source: existing `docs/specs/external-booking-import.md`
- Summary: Staff on `/admin/reservations` import a UTF-8 CSV. Each new `external_booking_id` becomes one `confirmed` reservation with `table_label` null, a unique `TVL-####` code, and no confirmation email. The file is one transaction. An existing id is skipped. A repeated id in the file, a bad header or field, or an availability-trigger refusal writes nothing. The column is unique when non-null, hidden in the UI, and absent from the guest INSERT allowlist. Party size above 8 is allowed on import; guest `validateReservationPayload` still rejects it.
- Clarifications needed: none. Pre-mortem: a guest who sets `external_booking_id` on the anon insert, a partial commit of a mixed file, or an import exception on `validate_reservation_availability` is already EI-5, EI-6, and EI-8. No spec edit.

## Acceptance Criteria → Tests

All eight criteria are unit tests in one new file. The Ready brief verification command is `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`. UI criteria follow the source-reading style in `tests/unit/reservations/allergen-capture.test.ts`. The action is `importExternalReservations(csvText: string)` in `app/actions/reservations.ts`. Validated rows go through one service-role RPC `import_external_reservations`. Invalid files never call that RPC.

| #   | Criterion              | Risk | Layer | Test file                                               | New or existing | Test name                                           | Assertion                                                                                                                                                                                                                                                                               | Command                                                                | Depends on |
| --- | ---------------------- | ---- | ----- | ------------------------------------------------------- | --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| 1   | EI-1 Staff gate        | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-1 staff gate and import control                  | Action calls `requireStaffUser` then `createServiceClient`. No user redirects to `/auth/login`. Authenticated non-staff returns an error and does not call the RPC. `super_admin` may call it. Manager source has `data-testid="reservation-import"` on `/admin/reservations`.          | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | none       |
| 2   | EI-8 Hidden id         | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-8 hidden id and guest insert cannot set it       | Baseline declares nullable `external_booking_id` with a unique index on non-null values. Guest `GRANT INSERT` column list does not include it. `reservations-manager.tsx` and `guest-profile-panel.tsx` do not render the column.                                                       | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | none       |
| 3   | EI-3 Inserted row      | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-3 inserted row shape and no confirmation mail    | One valid new id calls the RPC once with status `confirmed`, `table_label` null, trimmed fields, omitted name/phone as `''`, omitted email/notes as null, and a `TVL-####` code. No `sendBookingConfirmation`. Party 9 is accepted. `validateReservationPayload` still rejects party 9. | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-1       |
| 4   | EI-4 Idempotent id     | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-4 existing id skipped, duplicate in file invalid | An id the RPC reports as existing inserts no second row and leaves the existing row unchanged. A second copy of the same id in one file is an error and does not call the RPC.                                                                                                          | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-3       |
| 5   | EI-5 All or nothing    | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-5 one transaction writes nothing on failure      | One bad data row does not call the RPC. An RPC error (trigger refusal) returns an error and reports no inserted rows. A file whose every id already exists calls the RPC once, inserts nothing, and is not an error.                                                                    | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-3       |
| 6   | EI-6 Trigger unchanged | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-6 availability trigger has no import exception   | Latest `validate_reservation_availability` body has no import or `external_booking_id` exception. The RPC function inserts into `reservations` so that trigger still fires. A blocked-date style RPC error writes nothing.                                                              | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-3       |
| 7   | EI-2 File shape        | P1   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-2 bad file shape writes nothing                  | Wrong header, non-CSV body, missing id, bad date, bad time, party below 1 or non-integer, bad phone, or bad email returns an error and does not call the RPC.                                                                                                                           | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-1       |
| 8   | EI-7 Result            | P1   | unit  | tests/unit/reservations/external-booking-import.test.ts | new             | EI-7 result counts and list shows imported rows     | Success returns inserted and skipped counts. Manager source renders `data-testid="reservation-import-result"` with those counts. Imported rows use the same reservation list as direct bookings. The guest INSERT allowlist string is unchanged.                                        | pnpm test:unit tests/unit/reservations/external-booking-import.test.ts | EI-3       |

## Traceability Matrix

| Criterion | Spec ref                        | Test file::name                                                                                              | Source file(s)                                                                                                                       | Risk | Status  |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------- |
| EI-1      | external-booking-import.md EI-1 | tests/unit/reservations/external-booking-import.test.ts::EI-1 staff gate and import control                  | app/actions/reservations.ts, components/staff/reservations-manager.tsx                                                               | P0   | planned |
| EI-8      | external-booking-import.md EI-8 | tests/unit/reservations/external-booking-import.test.ts::EI-8 hidden id and guest insert cannot set it       | supabase/migrations/00000000000000_baseline.sql, components/staff/reservations-manager.tsx, components/staff/guest-profile-panel.tsx | P0   | planned |
| EI-3      | external-booking-import.md EI-3 | tests/unit/reservations/external-booking-import.test.ts::EI-3 inserted row shape and no confirmation mail    | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql, lib/reservations/validation.ts                         | P0   | planned |
| EI-4      | external-booking-import.md EI-4 | tests/unit/reservations/external-booking-import.test.ts::EI-4 existing id skipped, duplicate in file invalid | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql                                                         | P0   | planned |
| EI-5      | external-booking-import.md EI-5 | tests/unit/reservations/external-booking-import.test.ts::EI-5 one transaction writes nothing on failure      | app/actions/reservations.ts, supabase/migrations/00000000000000_baseline.sql                                                         | P0   | planned |
| EI-6      | external-booking-import.md EI-6 | tests/unit/reservations/external-booking-import.test.ts::EI-6 availability trigger has no import exception   | supabase/migrations/20260918140655_slot_service_cover_limits.sql, supabase/migrations/00000000000000_baseline.sql                    | P0   | planned |
| EI-2      | external-booking-import.md EI-2 | tests/unit/reservations/external-booking-import.test.ts::EI-2 bad file shape writes nothing                  | app/actions/reservations.ts                                                                                                          | P1   | planned |
| EI-7      | external-booking-import.md EI-7 | tests/unit/reservations/external-booking-import.test.ts::EI-7 result counts and list shows imported rows     | components/staff/reservations-manager.tsx, app/actions/reservations.ts                                                               | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked). No integration or e2e phase.
- Command for every phase: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/external-booking-import.md` — pre-authorized by the Ready brief. No edit is required; the spec is already testable.
- Existing-test edit: `tests/integration/reservations/public-privileges.integ.test.ts` — pre-authorized. Do not edit it. The guest INSERT allowlist must stay without `external_booking_id`. The pinned `GRANT INSERT` assertion stays true.

## TDD Execution Loop

### Criterion 1 — EI-1 Staff gate (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-1 staff gate and import control` in `tests/unit/reservations/external-booking-import.test.ts`. It must fail because `importExternalReservations` and `data-testid="reservation-import"` do not exist. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`. The test must execute and fail on an assertion or missing export, not skip.
- **Green** → Invoke `tdd-green` to add the staff-gated action and the import control. Unauthenticated callers `redirect("/auth/login")`. Non-staff returns an error and does not call the RPC. Exit: that test file green, executed.
- **Refactor** → Invoke `tdd-refactor` to clean the gate without changing behavior. Exit: the same unit command green, plus lint and typecheck on touched source.

### Criterion 2 — EI-8 Hidden id (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-8 hidden id and guest insert cannot set it` in the same file. Assert the baseline column, the unique index, the unchanged guest grant, and that the two staff views do not render the id. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to add nullable `external_booking_id` and its unique index in `supabase/migrations/00000000000000_baseline.sql`, following the allergens `ADD COLUMN IF NOT EXISTS` pattern. Do not add the column to the guest `GRANT INSERT`.
- **Refactor** → Invoke `tdd-refactor` to tidy the migration comment. Exit: unit command green, lint, typecheck.

### Criterion 3 — EI-3 Inserted row (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-3 inserted row shape and no confirmation mail` in the same file. Assert one RPC call, row shape, omitted blanks, `TVL-####`, no confirmation email, party 9 accepted, and `validateReservationPayload` still rejects party 9. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to parse a valid CSV and call `import_external_reservations` once with that row shape. Do not send a booking confirmation email. Do not change guest party-size validation.
- **Refactor** → Invoke `tdd-refactor` to tidy the insert mapping. Exit: unit command green, lint, typecheck.

### Criterion 4 — EI-4 Idempotent id (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-4 existing id skipped, duplicate in file invalid` in the same file. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to reject an in-file duplicate before the RPC, and to treat an RPC skip of an existing id as success with the existing row unchanged.
- **Refactor** → Invoke `tdd-refactor` to tidy the skip path. Exit: unit command green, lint, typecheck.

### Criterion 5 — EI-5 All or nothing (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-5 one transaction writes nothing on failure` in the same file. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` so a pre-RPC validation failure and an RPC error both report no inserted rows, and an all-existing file is a successful no-op. The SQL function body is one transaction.
- **Refactor** → Invoke `tdd-refactor` to tidy the failure path. Exit: unit command green, lint, typecheck.

### Criterion 6 — EI-6 Trigger unchanged (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-6 availability trigger has no import exception` in the same file. Source-read the latest `validate_reservation_availability` definition. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to add `import_external_reservations` in the baseline as a single function that `INSERT`s into `reservations` and does not alter `validate_reservation_availability`.
- **Refactor** → Invoke `tdd-refactor` to tidy the function. Exit: unit command green, lint, typecheck.

### Criterion 7 — EI-2 File shape (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-2 bad file shape writes nothing` in the same file. Use `PHONE_RE` and `EMAIL_RE` from `lib/reservations/validation.ts`. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to reject each bad shape before the RPC. Header names are exactly `external_booking_id`, `guest_name`, `party_size`, `date`, `time`, `phone`, `email`, and `notes`.
- **Refactor** → Invoke `tdd-refactor` to tidy validation. Exit: unit command green, lint, typecheck.

### Criterion 8 — EI-7 Result (layer: unit)

- **Red** → Invoke `tdd-red` to add exactly one failing test named `EI-7 result counts and list shows imported rows` in the same file. Command: `pnpm test:unit tests/unit/reservations/external-booking-import.test.ts`.
- **Green** → Invoke `tdd-green` to return inserted and skipped counts and render `data-testid="reservation-import-result"` on the reservations manager. Imported rows stay on the existing date list.
- **Refactor** → Invoke `tdd-refactor` to tidy the result UI. Exit: unit command green, lint, typecheck.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-80_external_booking_import_c4e1`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-80_external_booking_import_c4e1.md` at close-out.

Mode: FEATURE
Owning spec: `docs/specs/external-booking-import.md`
Criteria: 8 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/external-booking-import.md` | existing-test edit `tests/integration/reservations/public-privileges.integ.test.ts` | none required this run
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-80_external_booking_import_c4e1.plan.md`

Problem: Staff cannot import reservations from an external booking CSV into `/admin/reservations`. External bookings stay outside Restaurant Link or have to be retyped.
Approach: A staff-only action parses the eight-column CSV and calls one service-role function, `import_external_reservations`, so the file is one transaction. New ids become confirmed unassigned reservations. Existing ids are skipped. The availability trigger is unchanged. `external_booking_id` stays off the guest INSERT allowlist and off the UI.
Out-of-scope findings: none

| #   | Criterion                                         | Risk | Layer | Test file                                               |
| --- | ------------------------------------------------- | ---- | ----- | ------------------------------------------------------- |
| 1   | EI-1 staff gate and import control                | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 2   | EI-8 hidden id and guest insert cannot set it     | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 3   | EI-3 inserted row, no confirmation mail           | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 4   | EI-4 skip existing id, reject in-file duplicate   | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 5   | EI-5 one transaction writes nothing on failure    | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 6   | EI-6 availability trigger has no import exception | P0   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 7   | EI-2 bad file shape writes nothing                | P1   | unit  | tests/unit/reservations/external-booking-import.test.ts |
| 8   | EI-7 result counts on the reservations page       | P1   | unit  | tests/unit/reservations/external-booking-import.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, background, do not wait. Then Criterion 1 Red. No spec edit.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4-format`. No `4b-linear` (FEATURE).

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

- none at planning time. The spec already excludes API or webhook ingest, a channel column, Google Reserve, a partial commit, an import email, and the online party cap of 8.

## Linear Close-out & Findings Registration

- **START:** delegate `linear-resolver` to start work on RES-80 (plan: `res-80_external_booking_import_c4e1`), posting the digest above. Task `run_in_background: true`.
- **Close-out:** omit (FEATURE).
- **Findings registration:** only if the run file gains open lines. Managed Cloud does not auto-confirm net-new finding issues.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- import transaction and trigger → `supabase/migrations/00000000000000_baseline.sql`
- staff gate and CSV parse → `app/actions/reservations.ts`
- import control and result → `components/staff/reservations-manager.tsx`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-80_external_booking_import_c4e1`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Arm `node .cursor/hooks/tdd-guard.mjs on`. Launch START in the background. Do not edit the spec. Delegate Criterion 1 Red.

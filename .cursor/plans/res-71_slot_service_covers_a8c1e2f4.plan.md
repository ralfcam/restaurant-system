# res-71_slot_service_covers_a8c1e2f4

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
- Work-order: `.cursor/plans/res-71_slot_service_covers_a8c1e2f4.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link) — UUID `0db89a46-afdd-48ae-a6a5-8080628a3a19`
- Project: existing `restaurant-system V-0.2` (`9924183e-fae0-480f-aabf-1ab1d249c603`, `versionKey` `V-0.2`, status Planned / nonterminal). Precedence: issue already on this nonterminal RES version project. Discovery set: V-0.2 (planned), V-0.5 (backlog); V-0.1 completed/excluded. Unique keys. No allocation tie.
- Work type: implementation (product-gap / spec-gap: staff cover limits per slot and per service)
- Milestone: M4 — Code Complete (Feature Freeze). Live issue milestone already M4. Matches implementation work type.
- Mixed design + implementation: no. Slack/issue ACs plus existing BW-1/BW-5/BW-9–BW-12 / OH-SAVE make the contract testable. Recommended defaults (empty slot list = all generated times; NULL max = no extra cap; reuse `Booking denied: This time is fully booked.`) are encoded in the spec edit, not left as open design.
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: `RES-71` — `/admin/scheduling` can set opening-hour segments and the guest widget generates interval slots, but staff cannot define the bookable times inside a service or cap covers per slot / per service. Observed: availability and `validate_reservation_availability` only enforce table-seat cover (BW-9) plus table-fit (BW-12). Expected: staff configure explicit slots and independent cover maxima; guest availability and INSERT/UPDATE reject a party that would exceed either cap; table-fit still applies.
- Missing constraint (root cause): `docs/specs/scheduling.md` has no staff cover-limit contract on `/admin/scheduling`. `docs/specs/booking-rules.md` has no per-slot or per-service cover cap beside table inventory.
- Spec update proposed: `docs/specs/scheduling.md` → CL-1–CL-4 (define slots, per-slot max, service max, persist/edit). `docs/specs/booking-rules.md` → BW-18–BW-22 (slot cap, service cap, trigger reject, one formula, existing rules still apply). FIRST execution write after START.

## Spec

- Source: extend existing `docs/specs/scheduling.md` (staff `/admin/scheduling` owner; catalog lists it as scheduling/floor/hours) and existing `docs/specs/booking-rules.md` (guest availability + reservation validation). No `docs/specs/domains/` hub; README catalog is the hub.
- Summary: Each opening-hour segment may carry optional `max_covers` and an ordered `bookable_slots` list (`time` + optional per-slot `max_covers`). Empty slot list keeps BW-5 generated times. Non-empty list is the exclusive offer set (times must be on the restaurant interval grid and inside `[opens_at, closes_at)`). NULL maxima add no extra cap. `getAvailableSlots` and `validate_reservation_availability` both enforce slot exact-time cover and service day-assignment cover, then still apply BW-9–BW-12. Rejection string stays `Booking denied: This time is fully booked.`
- Clarifications needed: none. Pre-mortem folded into BW-20 (same date lock before slot/service SELECTs) and CL-1 (off-grid times rejected at save, never silently dropped).

### Spec edit to apply (orchestrator, after START)

Bump both files' `Last updated` to `2026-09-18`.

**`docs/specs/scheduling.md`** — after §13 guest note, before FP-10, insert:

```markdown
### Cover limits per service and slot (CL) — RES-71

Staff configure reservation capacity on `/admin/scheduling` per opening-hour
segment (a **service**). Guest availability and INSERT/UPDATE validation are
owned by [booking-rules.md](./booking-rules.md) BW-18–BW-22; this section is
the staff persist/edit contract. WA-4 continues to reuse `getAvailableSlots`
(now including BW-18–BW-19) and MUST NOT grow a second cover formula.

27. **CL-1 — Bookable slots per service** — Staff can define an ordered list
    of bookable slot times on each opening-hour segment. Each time is `HH:MM`
    (24h). A time MUST lie on the restaurant slot-interval grid
    (`clampSlotIntervalMinutes` / BW-3) and in the half-open segment window
    `[opens_at, closes_at)` (BW-1 exclusive membership). `validateOperatingDays`
    and therefore `upsertOperatingWindows` reject an off-grid or
    outside-window time before `replace_operating_windows` (explicit error,
    never silent drop or truncation). An **empty** list means every BW-5
    generated time in that segment remains bookable (no allowlist). A
    **non-empty** list is the exclusive offer set for that segment:
    `getAvailableSlots` MUST NOT mark a time `available: true` unless it is
    in the list (and still passes BW-9–BW-12 and BW-18–BW-19). Persist via
    `replace_operating_windows` as `operating_windows.bookable_slots` JSONB
    (`[{"time":"19:00","max_covers":12},…]`; `time` required). Duplicate
    times in one segment are rejected.

28. **CL-2 — Independent slot cover maxima** — Each bookable slot MAY set
    `max_covers` (integer ≥ 1) or omit it (`null` / missing). Two slots in
    the same segment MAY have different maxima (example: 19:00 → 12,
    20:00 → 8). `validateOperatingDays` rejects `0`, negative, non-integer,
    and non-numeric values. `null` / omitted means no extra per-slot cap
    (BW-9 / BW-12 still apply).

29. **CL-3 — Service cover maximum** — Each opening-hour segment MAY set
    `max_covers` (integer ≥ 1) or omit it (`null`). `null` / omitted means
    no extra service cap. Same numeric validation as CL-2. Persist as
    `operating_windows.max_covers`.

30. **CL-4 — Persist and edit** — `replace_operating_windows` persists
    `max_covers` and `bookable_slots` exactly, including `null` service max
    and `[]` slot lists. Staff can edit and Save again; leftover slot
    entries not in the payload MUST NOT remain (atomic replace, same
    OH-SAVE exact-payload rule). `WINDOW_COLUMNS` / `getAllOperatingWindowsMap`
    / `groupRowsByDay` round-trip the values. Privilege surface stays
    OH-PRIV / §16 (anon/authenticated SELECT only; staff write remains
    `requireStaffUser` + `service_role` RPC). No new guest write grant.
    Staff chrome on each segment exposes a service-max control
    (`data-testid="scheduling-service-max-covers"`) and per-slot rows
    (`data-testid="scheduling-slot-row"`) with time and optional max
    (`scheduling-slot-time` / `scheduling-slot-max-covers`).
```

Also amend WA-4 to name BW-18–BW-19 alongside BW-9–BW-12.

**`docs/specs/booking-rules.md`** — after BW-17, add:

```markdown
29. **BW-18 — Slot cover cap and allowlist.** For candidate time `T` assigned
    to segment `S` (BW-1): if `S.bookable_slots` is non-empty and `T` is not
    in that list, `T` is unavailable. If the matching slot has `max_covers`
    `M`, occupying `confirmed` / `seated` reservations (BW-10) whose
    reservation `time` equals `T` on the same `date` contribute `party_size`;
    `T` is unavailable when that sum + requested party > `M`. This slot-cover
    sum is **exact-time**, not the BW-9 occupancy window. `null` / omitted
    `M` adds no extra slot cap. `getAvailableSlots` sets `available: false`
    when this fails.

30. **BW-19 — Service cover cap.** Occupying reservations assigned to `S`
    (BW-1) on that `date` contribute `party_size` regardless of occupancy-
    window overlap. Candidate `T` in `S` is unavailable when that sum +
    requested party > `S.max_covers`. `null` / omitted adds no extra service
    cap. `getAvailableSlots` sets `available: false` when this fails.

31. **BW-20 — Cover-cap INSERT/UPDATE.** `validate_reservation_availability`
    MUST refuse occupying INSERT/UPDATE with P0001
    `Booking denied: This time is fully booked.` when BW-18 or BW-19 would
    mark the time unavailable (same user-facing string as BW-9 / BW-12 /
    BW-16). The BW-15 date-scoped advisory lock MUST already be held before
    the slot-cover and service-cover SELECTs. Last-writer SQL (lock, then
    inventory cover, then table-fit, then slot/service caps) MUST be
    byte-identical in `00000000000000_baseline.sql`,
    `20260818162000_operating_hour_segments.sql`,
    `20260827180000_occupancy_duration_buffer.sql`,
    `20260828121224_table_fit_availability.sql`, the BW-15 dated forward,
    and a new dated forward for remotes that already recorded table-fit /
    occupancy lock. Columns: `operating_windows.max_covers INT NULL` with
    `CHECK (max_covers IS NULL OR max_covers >= 1)`;
    `operating_windows.bookable_slots JSONB NOT NULL DEFAULT '[]'`.

32. **BW-21 — One formula.** Guest `getAvailableSlots` and the trigger MUST
    use the same BW-18 / BW-19 predicates. A shared helper
    `coversFitSlotAndService` (name stable for tests) is the guest source of
    truth. Trigger SQL implements the same sums (exact-time slot; all-day
    service assignment via BW-1). A time the helper would reject MUST NOT
    INSERT; a time the helper would accept MUST still face BW-9 / BW-12.

33. **BW-22 — Existing rules still apply.** A slot that passes BW-18 / BW-19
    MAY still be unavailable under BW-9 / BW-12. A slot that passes
    BW-9 / BW-12 MAY still be unavailable under BW-18 / BW-19. Both classes
    must pass for the time to be bookable. Compatible-table assignment
    (BW-12 / FP-3) is unchanged.
```

Then `pnpm exec prettier --write docs/specs/scheduling.md docs/specs/booking-rules.md`.

## Acceptance Criteria → Tests

| #   | Criterion                                                      | Risk | Layer       | Test file                                                       | New or existing         | Test name                                                                                  | Assertion                                                                                                                                                                                                                              | Command                                                                                                                            | Depends on |
| --- | -------------------------------------------------------------- | ---- | ----------- | --------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| C1  | BW-18 slot allowlist + exact-time slot cover marks unavailable | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 | existing file, new test | `does not offer a slot when the party would exceed that slot's cover limit`                | Dinner 19:00 `max_covers: 12` with 8 occupying at 19:00 and party 6 → that slot `available: false`; 20:00 with no slot cap (or higher cap) can stay true if table-fit allows; 19:30 omitted from a non-empty allowlist is absent/false | `pnpm test:unit tests/unit/reservations/available-slots.test.ts`                                                                   | none       |
| C2  | BW-19 service cover marks unavailable                          | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 | existing file, new test | `does not offer a slot when the party would exceed the service cover limit`                | Dinner `max_covers: 20` with 16 occupying at 19:00 and party 6 → 19:00 and 20:00 both `available: false` even if per-slot caps would allow                                                                                             | same                                                                                                                               | C1         |
| C3  | BW-21 shared helper is the one formula                         | P0   | unit        | tests/unit/reservations/cover-limits.test.ts                    | new                     | `coversFitSlotAndService rejects over slot or service and accepts when both have room`     | Helper false when slot remaining < party or service remaining < party; true when both NULL or both remaining ≥ party; allowlist miss is false                                                                                          | `pnpm test:unit tests/unit/reservations/cover-limits.test.ts`                                                                      | C1, C2     |
| C4  | BW-22 table-fit still applies when cover caps have room        | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 | existing file, new test | `does not offer a slot when cover limits have room but no compatible table remains`        | Slot+service caps would accept party 4; no remaining compatible unit (existing BW-12 fixture shape) → `available: false`                                                                                                               | `pnpm test:unit tests/unit/reservations/available-slots.test.ts`                                                                   | C1         |
| C5  | BW-20 trigger rejects over slot or service                     | P0   | integration | tests/integration/reservations/cover-limits.integ.test.ts       | new                     | `rejects an occupying insert that would exceed the slot or service cover limit`            | After setting Dinner slots/max via local RPC: insert that exceeds 19:00 slot max OR service max raises P0001 `Booking denied: This time is fully booked.`; an in-limit insert succeeds; `assertIsolatedHoursMutationTarget()` first    | `$env:RESTAURANT_INTEGRATION_STRICT='true'; pnpm test:integration tests/integration/reservations/cover-limits.integ.test.ts`       | C1–C3      |
| C6  | CL-1 staff define bookable slots; validate rejects off-grid    | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      | new                     | `accepts on-grid service slots and rejects off-grid or outside-window times`               | Dinner 18:00–22:00, interval 30: `19:00`+`20:00` valid; `19:15` or `17:30` → `validateOperatingDays` error; empty list valid                                                                                                           | `pnpm test:unit tests/unit/scheduling/cover-limits.test.ts`                                                                        | none       |
| C7  | CL-2 independent per-slot maxima                               | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      | existing file, new test | `allows different max_covers on slots in the same service and rejects non-positive values` | 19:00 max 12 and 20:00 max 8 accepted; 19:00 max 0 / −1 / 1.5 rejected                                                                                                                                                                 | same                                                                                                                               | C6         |
| C8  | CL-3 service maximum                                           | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      | existing file, new test | `accepts a service max_covers of at least 1 and rejects invalid values`                    | Segment `max_covers: 24` accepted; `0` / negative rejected; omit/`null` accepted                                                                                                                                                       | same                                                                                                                               | C6         |
| C9  | CL-4 persist and edit via replace_operating_windows            | P1   | integration | tests/integration/scheduling/cover-limits-persist.integ.test.ts | new                     | `replace_operating_windows persists and updates slot and service cover limits`             | RPC write Dinner slots+max; SELECT round-trips; second replace edits 19:00 max and drops 21:00; leftover slot gone. Isolation pin + STRICT.                                                                                            | `$env:RESTAURANT_INTEGRATION_STRICT='true'; pnpm test:integration tests/integration/scheduling/cover-limits-persist.integ.test.ts` | C6–C8      |

Layer above unit is required only for C5/C9: trigger + RPC persistence are decided by Postgres. No e2e duplicate — staff chrome for CL-4 is asserted in C9 via RPC/select plus a unit source-read in C6–C8 (`scheduling-manager` testids) if Green adds them; C6–C8 stay validate/schema-first.

## Traceability Matrix

| Criterion | Spec ref               | Test file::name                                                                                                  | Source file(s)   | Risk | Status  |
| --------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ---- | ------- |
| C1        | booking-rules.md BW-18 | available-slots.test.ts::does not offer a slot when the party would exceed that slot's cover limit               | (fills at Green) | P0   | planned |
| C2        | booking-rules.md BW-19 | available-slots.test.ts::does not offer a slot when the party would exceed the service cover limit               | (fills at Green) | P0   | planned |
| C3        | booking-rules.md BW-21 | cover-limits.test.ts::coversFitSlotAndService rejects over slot or service and accepts when both have room       | (fills at Green) | P0   | planned |
| C4        | booking-rules.md BW-22 | available-slots.test.ts::does not offer a slot when cover limits have room but no compatible table remains       | (fills at Green) | P0   | planned |
| C5        | booking-rules.md BW-20 | cover-limits.integ.test.ts::rejects an occupying insert that would exceed the slot or service cover limit        | (fills at Green) | P0   | planned |
| C6        | scheduling.md CL-1     | cover-limits.test.ts::accepts on-grid service slots and rejects off-grid or outside-window times                 | (fills at Green) | P1   | planned |
| C7        | scheduling.md CL-2     | cover-limits.test.ts::allows different max_covers on slots in the same service and rejects non-positive values   | (fills at Green) | P1   | planned |
| C8        | scheduling.md CL-3     | cover-limits.test.ts::accepts a service max_covers of at least 1 and rejects invalid values                      | (fills at Green) | P1   | planned |
| C9        | scheduling.md CL-4     | cover-limits-persist.integ.test.ts::replace_operating_windows persists and updates slot and service cover limits | (fills at Green) | P1   | planned |

## Execution Preconditions

- Infra needed for C5 and C9: local Supabase up + seeded (`npx supabase start && npx supabase db reset --local`); integration phases run with `pnpm test:integration` (fail-closed per integration-harness-invariants). Bring Supabase up before C5 Red.
- C1–C4 and C6–C8 are unit/mocked. A skipped suite is still a BLOCKER.
- Reuse `getAvailableSlots` mocks in `available-slots.test.ts`, `validateOperatingDays`, `assertIsolatedHoursMutationTarget()`, and occupying-status fixtures. Do not invent a second slot generator (BW-5 stays `bookableTimesForDay`).
- RES-ISO: new `tests/integration/reservations/*.integ.test.ts` MUST call zero-arg `assertIsolatedHoursMutationTarget()` at the start of `beforeAll` and write-cleanup hooks.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/scheduling.md` — add CL-1–CL-4, amend WA-4, bump Last updated.
- Spec create/edit: `docs/specs/booking-rules.md` — add BW-18–BW-22, bump Last updated.
- Existing-test edit: `tests/unit/scheduling/schema.test.ts` — complementary INSERT / `replace_operating_windows` column assertions if the guest_note-only regex would hide the new columns (only if Red/Green cannot add a new `it()` instead).
- Existing-test edit: `tests/unit/availability/actions.test.ts` — complementary `WINDOW_COLUMNS` assertion if the guest_note regex must name `max_covers` / `bookable_slots`.
- Existing-test edit: `tests/integration/scheduling/replace-operating-windows.integ.test.ts` — only if the existing exact-payload snapshot breaks when the RPC gains columns (prefer a new C9 file).

Managed Cloud one-shot: the initiating RES-71 task pre-authorizes **only** these listed paths.

## TDD Execution Loop

### Criterion C1 — BW-18 slot allowlist + exact-time slot cover (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1. Work-order: `.cursor/plans/res-71_slot_service_covers_a8c1e2f4.plan.md` (read C1 + BW-18). File: `tests/unit/reservations/available-slots.test.ts`. Name: `does not offer a slot when the party would exceed that slot's cover limit`. Reuse the existing `getAvailableSlots` mock harness. Dinner segment with `bookable_slots: [{time:"19:00", max_covers:12},{time:"20:00", max_covers:12}]`, occupying 8 covers at 19:00 confirmed, party 6 → 19:00 `available: false`; 20:00 may remain true if tables allow. Command: `pnpm test:unit tests/unit/reservations/available-slots.test.ts`. Exit: RED because today's code ignores slot maxima (19:00 stays available). Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass. Minimal: thread `bookable_slots` on the operating-window fixture into `getAvailableSlots` and apply exact-time slot cover + allowlist. Consult Next.js/Supabase skills only if a server/RPC type is required. Exit: target test GREEN (executed), typecheck clean. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C1 and re-verify. Exit: GREEN (executed) + `pnpm lint` (0 warnings) + `pnpm typecheck` + `pnpm exec prettier --check` on touched source. Return adversarial `## Residual findings`, `Suggested review order:`, `Reusable pattern:`.

### Criterion C2 — BW-19 service cover cap (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2. Work-order path + C2/BW-19 only. Same available-slots file. Name: `does not offer a slot when the party would exceed the service cover limit`. Dinner `max_covers: 20`, 16 occupying at 19:00, party 6 → both 19:00 and 20:00 `available: false`. Command: `pnpm test:unit tests/unit/reservations/available-slots.test.ts`. Exit: RED because service max is ignored. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C2 pass. Minimal: sum occupying party_size assigned to the segment (BW-1) on that date. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C2 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C3 — BW-21 one formula helper (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C3. Work-order path + C3/BW-21 only. File: `tests/unit/reservations/cover-limits.test.ts`. Name: `coversFitSlotAndService rejects over slot or service and accepts when both have room`. Import `coversFitSlotAndService` (expected missing-symbol). Cases: over slot; over service; both NULL → true; allowlist miss → false; both remaining ≥ party → true. Command: `pnpm test:unit tests/unit/reservations/cover-limits.test.ts`. Exit: RED missing symbol or wrong predicates. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C3 pass. Extract/create `coversFitSlotAndService` and use it from `getAvailableSlots`. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C3 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C4 — BW-22 table-fit still applies (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C4. Work-order path + C4/BW-22 only. File: `tests/unit/reservations/available-slots.test.ts`. Name: `does not offer a slot when cover limits have room but no compatible table remains`. High slot/service caps; reuse the existing “covers fit but no compatible table” inventory shape. Command: `pnpm test:unit tests/unit/reservations/available-slots.test.ts`. Exit: RED if cover-cap path short-circuits table-fit. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C4 pass. Keep BW-12 after BW-18/BW-19. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C4 and re-verify. Re-run the whole available-slots unit file. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C5 — BW-20 trigger reject (layer: integration)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C5. Work-order path + C5/BW-20 only. File: `tests/integration/reservations/cover-limits.integ.test.ts`. Name: `rejects an occupying insert that would exceed the slot or service cover limit`. Zero-arg `assertIsolatedHoursMutationTarget()` first in `beforeAll` and write cleanup. STRICT fail-closed. Command: `pnpm test:integration tests/integration/reservations/cover-limits.integ.test.ts`. Exit: RED because today's trigger ignores slot/service caps (insert succeeds) or missing columns. Must execute — skip = BLOCKED (infra).
- **Green** → Invoke the `tdd-green` subagent to make C5 pass. Minimal: columns on `operating_windows`; last-writer `validate_reservation_availability` applies BW-18/BW-19 after the BW-15 lock; extend `replace_operating_windows` so the test can persist limits. Follow `.cursor/rules/supabase-migrations.mdc` (baseline + existing forwards + dated forward). Consult Supabase skill. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C5 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source. Integration must have executed.

### Criterion C6 — CL-1 define bookable slots (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C6. Work-order path + C6/CL-1 only. File: `tests/unit/scheduling/cover-limits.test.ts`. Name: `accepts on-grid service slots and rejects off-grid or outside-window times`. `validateOperatingDays` + optional scheduling-manager testid read. Command: `pnpm test:unit tests/unit/scheduling/cover-limits.test.ts`. Exit: RED because slots are not validated. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C6 pass. Extend `OperatingSegment` / `validateOperatingDays` / staff chrome. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C6 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C7 — CL-2 independent slot maxima (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C7. Work-order path + C7/CL-2 only. Same scheduling cover-limits file. Name: `allows different max_covers on slots in the same service and rejects non-positive values`. Command: `pnpm test:unit tests/unit/scheduling/cover-limits.test.ts`. Exit: RED because per-slot max is not validated. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C7 pass. Minimal validate + chrome. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C7 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C8 — CL-3 service maximum (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C8. Work-order path + C8/CL-3 only. Same file. Name: `accepts a service max_covers of at least 1 and rejects invalid values`. Command: `pnpm test:unit tests/unit/scheduling/cover-limits.test.ts`. Exit: RED because service max is not validated. Must execute.
- **Green** → Invoke the `tdd-green` subagent to make C8 pass. Minimal validate + `scheduling-service-max-covers`. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C8 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

### Criterion C9 — CL-4 persist and edit (layer: integration)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C9. Work-order path + C9/CL-4 only. File: `tests/integration/scheduling/cover-limits-persist.integ.test.ts`. Name: `replace_operating_windows persists and updates slot and service cover limits`. Isolation pin + STRICT. Command: `pnpm test:integration tests/integration/scheduling/cover-limits-persist.integ.test.ts`. Exit: RED if RPC drops the new fields. Must execute — skip = BLOCKED (infra).
- **Green** → Invoke the `tdd-green` subagent to make C9 pass. Finish RPC INSERT columns, flatten/group, `WINDOW_COLUMNS`, staff save payload. Exit: target test GREEN (executed). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C9 and re-verify. Exit: GREEN (executed) + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- Linked-remote apply of the new dated forward on `tilcqrudqxznnpepxjqq` (same runbook class as OH-SAVE-PATH-LINKED / BW-15). Not faked in Vitest.
- Visual density of the extra slot-limit controls on `/admin/scheduling` at a narrow staff viewport. Chrome existence is unit-covered; layout polish is manual.

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-71_slot_service_covers_a8c1e2f4`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-71_slot_service_covers_a8c1e2f4.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/scheduling.md` + `docs/specs/booking-rules.md`
Criteria: 9 automatable · 2 manual-UAT
Approval gates: spec create/edit `docs/specs/scheduling.md` · `docs/specs/booking-rules.md` | existing-test edit `tests/unit/scheduling/schema.test.ts` · `tests/unit/availability/actions.test.ts` · `tests/integration/scheduling/replace-operating-windows.integ.test.ts`
Infra: local Supabase (fail-closed integration) for C5/C9; unit for the rest
Full plan: not posted to Linear (size-bounded digest) · local copy `res-71_slot_service_covers_a8c1e2f4.plan.md`

Problem: Staff can set opening-hour segments and guests get interval-generated slots, but there is no per-slot or per-service cover cap. Availability and the booking trigger only enforce table-seat inventory and table-fit, so a service can accept more covers than the restaurateur intends.
Approach: Extend scheduling persist (`max_covers` + `bookable_slots` on `operating_windows`) and booking-rules so `getAvailableSlots` and `validate_reservation_availability` share one formula. Empty slot list keeps generated times; NULL maxima add no extra cap; rejection reuses the existing fully-booked string. Table-fit remains required.
Out-of-scope findings: restaurant-wide floor seat cap (already RES-69) · high

| #   | Criterion                              | Risk | Layer       | Test file                                                       |
| --- | -------------------------------------- | ---- | ----------- | --------------------------------------------------------------- |
| 1   | Slot allowlist + exact-time slot cover | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 |
| 2   | Service cover cap                      | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 |
| 3   | Shared coversFitSlotAndService helper  | P0   | unit        | tests/unit/reservations/cover-limits.test.ts                    |
| 4   | Table-fit still applies                | P0   | unit        | tests/unit/reservations/available-slots.test.ts                 |
| 5   | Trigger rejects over slot or service   | P0   | integration | tests/integration/reservations/cover-limits.integ.test.ts       |
| 6   | Staff define on-grid bookable slots    | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      |
| 7   | Independent per-slot maxima            | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      |
| 8   | Service maximum                        | P1   | unit        | tests/unit/scheduling/cover-limits.test.ts                      |
| 9   | Persist and edit via RPC               | P1   | integration | tests/integration/scheduling/cover-limits-persist.integ.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-71_slot_service_covers_a8c1e2f4
- spec: docs/specs/scheduling.md
- mode: FIX
- linear_issue: RES-71
- criteria_shipped: [C1, C2, C3, C4, C5, C6, C7, C8, C9]
- criteria_manual_uat: [linked-remote forward apply, scheduling chrome density]
- req_ids: [CL-1, CL-2, CL-3, CL-4, BW-18, BW-19, BW-20, BW-21, BW-22]
- source_paths: []
- test_paths: []
- architecture_touch: [Reservation-Flow]
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-71_slot_service_covers_a8c1e2f4.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding                                          | Where (file:line/area)    | Why it matters                               | Severity | Relation       |
| ------------------------------------------------ | ------------------------- | -------------------------------------------- | -------- | -------------- |
| Restaurant-wide Floor Plan seat-capacity maximum | `/admin/floor` / RES-69   | Inventory cap is a different product surface | high     | already RES-69 |
| Per-date (not weekly) slot-limit overrides       | scheduling persist        | Issue is weekly segment config only          | med      | deferred       |
| Staff override of cover limits at booking time   | reservations staff assign | Would bypass the guest/trigger contract      | med      | deferred       |

## Linear Close-out & Findings Registration

- **START (execution first action):** delegate `linear-resolver` to start work on `RES-71` (plan: `res-71_slot_service_covers_a8c1e2f4`), posting this plan's `## Linear Plan Digest` as the single `Work started:` comment. Task `run_in_background: true`; do not wait for its report before spec/C1.
- **Close-out (FIX):** after docs sync + 4C, delegate `linear-resolver` to post the structured resolution comment only (no workflow state write).
- **Findings registration:** merge run file into `docs/findings/<category>.md`, then delegate `linear-resolver` REGISTER FINDINGS. Managed Cloud does not auto-confirm net-new issues — persist and STOP if a new issue would be created. RES-69 is attach-over-create (already tracked). Below-floor med items stay on the ledger.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [public-api] booking availability + trigger cover caps
- [schema] operating_windows.max_covers / bookable_slots + replace_operating_windows
- [security] OH-PRIV unchanged (no guest write)
- staff scheduling chrome

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized in tdd log `## Traceability (final)`: n/a (at close-out)
- Run metrics stamped in tdd log `## Run metrics`: n/a (at close-out)
- `node .cursor/checks/harness-lint.mjs res-71_slot_service_covers_a8c1e2f4`: n/a (at close-out)

## First Execution Action

- **Managed Cloud one-shot:** after writing `.cursor/plans/res-71_slot_service_covers_a8c1e2f4.plan.md`, do not wait for a second accept. Arm `tdd-guard`. Launch START (`run_in_background: true`; do not wait). Apply the spec edits listed in `## Permissions Requested`. Then delegate Criterion C1 Red. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`.

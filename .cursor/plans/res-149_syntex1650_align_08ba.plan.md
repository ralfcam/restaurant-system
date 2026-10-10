# /sdd-to-tdd RES-149 — Syntex #1650 align + leftover Majors

Managed Cloud one-shot. `agent/runtime` = `managed` (probed 2026-10-10).
Stay on `cursor/res-149-eligibility-08ba`. New wave after Pass 1
`action: route` / `fixRound: 1` on head `3efe93d`, plus the operator
additions to align Step 6 and Ready-brief policy with Syntex-V0 PR #1650
(`cursor/sg-1468-conductor-eligibility-d065`, head `2a94ed60`) and to
port that PR's billing-detector fix.

mode: FIX
linear_issue: RES-149
milestone_hint: M4 — Code Complete (Feature Freeze)
project: none on the issue

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. When this plan is executed:

- Your **only direct writes** are: (1) the **approved spec edit** under
  `docs/specs/**` (managed Cloud: the exact path listed in
  `## Permissions Requested`), (2) the findings revision pass on
  `docs/findings/runs/<plan-slug>.md` after every phase, (3) appending
  Refactor close-out sections to
  `docs/verifier-reports/tdd/<plan-slug>.md` after each `tdd-refactor` phase,
  and (4) at close-out, **`## Suggested Review Order (collated)`**,
  **`## Traceability (final)`**, and **`## Run metrics`**.
- **Every test change** comes from a `tdd-red` Task call. **Every source
  change** from `tdd-green`. **Every cleanup / re-verify** from
  `tdd-refactor`. Sequential phases. Never pass `model` on Task.
- Stay on `cursor/res-149-eligibility-08ba`. Do not mark ready. Do not merge.
- After close-out, execute commit.md. On PASS, execute push.md with
  `--fix-round 1`. Use both fix rounds. After the final fix round,
  `/capture` remaining Critical, Major, and unknown findings and push.
  List those captured blocking findings at the top of the PR body under
  `Captured blocking findings (Jose review)`. `unavailable` still stops.

## Linear Plan Digest

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-149_syntex1650_align_08ba`
Owning spec: docs/specs/dev-toolchain.md G-CON1 G-CR2
Problem: Pass 1 left two Majors. design_first never hands off after a design-only first PR. Step 6 requires a work-order Permissions Requested listing that /sdd-to-tdd has not written yet. Restaurant-system Step 6 and Ready-brief policy have diverged from Syntex #1650. eventLooksBilling matches billing-named file paths.
Approach: Align G-CON1 and G-RDY1 with Syntex #1650. designComplete skips design_first so later picks take the code route. Pick identifies the owning spec and STOPs when unknown; it does not wait for a work-order. field() keeps continuation lines. eventLooksBilling reads type/status and error fields only.
Out-of-scope findings: none
Full plan: not posted to Linear (size-bounded digest) · local copy res-149_syntex1650_align_08ba
```

## FIX evidence

- Observed: CodeRabbit CLI Pass 1 Majors on `ready-brief-policy.mjs` ~132
  (`design_first` forever) and `conduct.md` ~135 (Pick `spec_amend` vs
  work-order `## Permissions Requested`). Minor: unescaped `|` in
  `docs/testing/Design-And-Patterns.md` line 80. Operator then required
  alignment with Syntex #1650 and a port of its billing-detector.
- Expected: a completed design advances to `/sdd-to-tdd` on later picks;
  Pick does not require a not-yet-written work-order; Ready-brief fields
  keep continuation lines; `eventLooksBilling` ignores `*billing*.md` paths.
- Hypothesis (one): G-CON1 never names the post-design code PR, and it
  told Pick to confirm a work-order heading that `/sdd-to-tdd` writes later.
  Restaurant-system then invented extra Step 6 sequencing instead of
  matching Syntex #1650 (`field()` continuations; identify-spec STOP;
  billing fields only). Confirmed by reading the classifier (no
  `designComplete`), Step 6 (Permissions Requested before amend),
  `field()` (first line only), and `eventLooksBilling` (`JSON.stringify`
  - `/billing/`).
- Missing constraint: G-CON1 must skip `design_first` when
  `designComplete` is true; Pick must identify the spec and STOP when
  unknown without a work-order listing; G-RDY1 must keep field
  continuations; G-CR2 must scope billing detection to type/status and
  `message`/`error`/`reason`/`code`.

## Spec

- File: `docs/specs/dev-toolchain.md` **G-CON1, G-RDY1, G-CR2, and their
  implementation-trace rows**. Do not edit G-TD1 or G-CR3.
- Add: `designComplete === true` skips `design_first` so later picks take
  the code route. Pick identifies the owning spec and STOPs when unknown
  before `spec_amend`; it does not require a `/sdd-to-tdd` work-order
  `## Permissions Requested`. `/sdd-to-tdd` still lists that path before
  any further amend. `field()` keeps continuation lines until the next
  recognized label. `eventLooksBilling` matches `type`/`status` `billing`
  or billing/quota text in `message`, `error`, `reason`, or `code` only —
  never billing-named file paths. After two fix rounds, remaining
  Critical, Major, and unknown findings capture-and-push. `/push` lists
  them at the top of the PR body under
  `## Captured blocking findings (Jose review)`. `unavailable` still
  stops as `blocked_cli_unavailable`.

## Acceptance Criteria → Tests

| #   | Criterion                                                    | Risk | Layer | Test file                                                      | New or existing | Test name                                                                 | Assertion                                                                                                                                                                                                                                                                                                                                                                                              | Command                                                                                            | Depends on |
| --- | ------------------------------------------------------------ | ---- | ----- | -------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------- |
| C26 | Billing detector ignores file paths                          | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-billing-detector.test.ts` | new file        | `eventLooksBilling matches error content not billing-named file paths`    | `type`/`status` `billing` or billing/quota text in `message`/`error`/`reason`/`code` is true; a finding whose only billing token is `docs/billing.md` (or similar) is false; existing billing JSONL still billing                                                                                                                                                                                      | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-billing-detector.test.ts`                      | spec       |
| C23 | Completed design advances to the code route                  | P1   | unit  | `.cursor/checks/ready-brief-policy.test.mjs`                   | add test        | `completed design leaves design_first and takes the code route`           | new-scope or `/design` with `designComplete: true` is not `design_first` (falls through to `auto_brief`/`ready`/`spec_amend`); without it still `design_first`; Step 7 later pick takes `/sdd-to-tdd`                                                                                                                                                                                                  | `node --test .cursor/checks/ready-brief-policy.test.mjs`                                           | spec       |
| C24 | Pick does not wait for a work-order Permissions list         | P1   | unit  | same                                                           | add + edit C18  | `pick identifies the spec before spec-amend without a work-order listing` | Step 6 identifies the owning spec and STOPs when unknown before `spec_amend`; Step 6 does not require `## Permissions Requested`; sdd-to-tdd still requires that listing before its amend                                                                                                                                                                                                              | same                                                                                               | spec       |
| C25 | Ready-brief fields keep continuation lines                   | P1   | unit  | same                                                           | add test        | `ready-brief fields keep continuation lines until the next label`         | multiline `Allowed edits` joins continuation lines; `Verification` does not swallow the next labeled field                                                                                                                                                                                                                                                                                             | same                                                                                               | spec       |
| C27 | After two fix rounds, capture remaining C/M/unknown and push | P0   | unit  | `.cursor/checks/coderabbit-pr-policy.test.mjs`                 | edit existing   | `push CLI action routes two fix rounds then blocks majors`                | at `priorRound` 2, Critical+Major+Minor is `action` `push` / `record` `capture_and_push`; leftover/capture include Critical and Major with command `/capture`; `sddToTdd` empty; `renderCapturedBlockingFindings` opens with `## Captured blocking findings (Jose review)` and lists those blocking findings; `unavailable` still `blocked_cli_unavailable`; existing gate third-pass assertions match | `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs` | spec       |

## Minors (this wave)

- Unescaped `|` in `docs/testing/Design-And-Patterns.md` table cell
  (`value < 1)`). Escape as `\|` via docs-updater.

## Permissions Requested

- Spec edit: `docs/specs/dev-toolchain.md` — G-CON1 item 20, G-RDY1,
  G-CR2, and those implementation-trace rows only. Do not touch G-TD1
  or G-CR3.
- Existing-test add: `.cursor/checks/ready-brief-policy.test.mjs` — add
  C23–C25.
- Existing-test edit: `.cursor/checks/ready-brief-policy.test.mjs` —
  rewrite C18 (`pick confirms Permissions Requested before spec-amend`)
  so Step 6 identifies the spec / STOPs when unknown and no longer
  requires a work-order `## Permissions Requested` listing.
- Existing-test edit: `.cursor/checks/coderabbit-pr-policy.test.mjs` —
  rewrite `push CLI action routes two fix rounds then blocks majors` so
  the cap is `capture_and_push` (not `stop` / `blocked_major_findings`)
  and assert `## Captured blocking findings (Jose review)`.
- Existing-test edit: `.cursor/checks/coderabbit-gate.test.mjs` — rewrite
  third-pass Critical assertions from `stop` / `blocked_major_findings`
  to `push` / `capture_and_push`. Keep `blocked_cli_unavailable` and the
  `push.md` match for the historical leftover record name.
- New test file: `tests/unit/dev-toolchain/coderabbit-billing-detector.test.ts`.
- Optional fixture: `.cursor/checks/fixtures/coderabbit/local-billing-named-path.jsonl`.
- Allowed source: `.cursor/hooks/lib/ready-brief-policy.mjs`,
  `.cursor/hooks/lib/coderabbit-review-policy.mjs`,
  `.cursor/hooks/lib/coderabbit-pr-policy.mjs`,
  `.cursor/commands/conduct.md` (Step 6–7),
  `.cursor/commands/push.md` (Pass 3 / create-body / Operator next),
  `.cursor/commands/sdd-to-tdd.md` (Permissions Requested sentence stays).
- Docs (docs-updater): `docs/testing/Design-And-Patterns.md` pipe escape
  and G-CR2 cap sentence; `docs/runbooks/coderabbit.md`;
  `docs/dev-journal.md`; `docs/README.md`.

## TDD Execution Loop

### Criterion C26 — Billing detector ignores file paths (layer: unit)

- **Red** → Invoke `tdd-red` to write
  `eventLooksBilling matches error content not billing-named file paths`.
- **Green** → Invoke `tdd-green` so `eventLooksBilling` matches
  `type`/`status` `billing` or billing/quota text in `message`, `error`,
  `reason`, or `code` only.
- **Refactor** → Invoke `tdd-refactor` to clean C26. Keep existing
  `local-billing.jsonl` → `billing`.

### Criterion C23 — Completed design takes the code route (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `completed design leaves design_first and takes the code route`.
- **Green** → Invoke `tdd-green` so `designComplete: true` skips
  `design_first` and Step 7 later picks take `/sdd-to-tdd`. Keep C10/C13
  first-PR windows green.
- **Refactor** → Invoke `tdd-refactor` to clean C23.

### Criterion C24 — Pick identify-spec STOP, no work-order listing (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `pick identifies the spec before spec-amend without a work-order listing`
  and rewrite C18 as listed.
- **Green** → Invoke `tdd-green` so Step 6 identifies the spec and STOPs
  when unknown, without requiring `## Permissions Requested`. Keep
  sdd-to-tdd's Permissions Requested sentence. Keep C19/C20 start order.
- **Refactor** → Invoke `tdd-refactor` to clean C24.

### Criterion C25 — Multiline Ready-brief fields (layer: unit)

- **Red** → Invoke `tdd-red` to add
  `ready-brief fields keep continuation lines until the next label`.
- **Green** → Invoke `tdd-green` so `field()` keeps continuation lines
  (Syntex #1650 `linesUntilNextField`).
- **Refactor** → Invoke `tdd-refactor` to clean C25.

### Criterion C27 — Cap leftover Critical/Major capture-and-push (layer: unit)

- **Red** → Invoke `tdd-red` to rewrite
  `push CLI action routes two fix rounds then blocks majors` and the
  existing gate third-pass cap assertions so after two fix rounds
  remaining Critical/Major/unknown capture-and-push, and the PR heading
  is `## Captured blocking findings (Jose review)`. Keep unavailable
  as `blocked_cli_unavailable`. Pre-authorized existing-test edits:
  `.cursor/checks/coderabbit-pr-policy.test.mjs`,
  `.cursor/checks/coderabbit-gate.test.mjs`.
- **Green** → Invoke `tdd-green` so `decidePushCliAction` at the cap
  returns `action` `push` / `record` `capture_and_push`, moves remaining
  `/sdd-to-tdd` findings into `capture`, and
  `renderCapturedBlockingFindings` opens with
  `## Captured blocking findings (Jose review)`. Update `push.md`
  Pass 3 / create-body / Operator next. Keep `blocked_cli_unavailable`.
- **Refactor** → Invoke `tdd-refactor` to clean C27.

## Manual-UAT

- none

## Out-of-Scope Findings

- none at plan time

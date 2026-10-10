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
  before 4C. After 4C/4B, run the format pass, then STEP 4G (do not run the CLI), then STEP 4F. Linear
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
  (do not run `coderabbit-gate.mjs` here; the CLI lives on `/push`; do not write the
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
- Work-order: `.cursor/plans/res-150_cli_evidence_integrity_5aa2.plan.md`
- Workflow mode: FIX

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link / Realized › Restaurant Link)
- Project: allocated `restaurant-system V-0.5` (`P-RES-12`) — only nonterminal RES `V-X.X` project (V-0.1 and V-0.2 are Completed). Issue currently has `project: null`; precedence #6 (earliest compatible available version) after empty #1–#5.
- Work type: implementation (toolchain evidence-integrity fix)
- Milestone: M4 — Code Complete (Feature Freeze)
- Mixed design + implementation: no
- Clarification: none

## Issue & Root Cause (FIX mode only — omit for FEATURE)

- Issue: [RES-150](https://linear.app/realized/issue/RES-150/coderabbit-evidence-integrity-html-evidence-marker-bind-findings-into) — `/push` writes a human `## CodeRabbit CLI evidence` block with no HTML marker, so a later body edit can name an older head; a same-head rerun can reclassify Majors to Minor/Trivial without changing any bound hash; finding IDs include severity; batch PRs have no member-head evidence.
- Missing constraint (root cause): G-CR2 requires only `Head:` + `attemptStatus:` plain text. It does not require `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->`, a hash-bound canonical findings digest, same-head no-diff anti-downgrade, severity-independent stable finding keys, preservation of that marker across `replaceGateEvidence` / `gh pr edit --body-file`, or `batch_covered` member-head evidence.
- Spec update proposed: `docs/specs/dev-toolchain.md` G-CR2 — HTML marker, SG-1469 shared digest/hash/key, anti-downgrade, preserve-on-replace, `batch_covered`, Critical/Major dispositions. Golden vectors in `.cursor/checks/fixtures/coderabbit-evidence/`.

Confirmed by reading today's code (one hypothesis): `renderCliEvidenceBlock` emits heading + Head + attemptStatus only; repo-wide Grep has zero `coderabbit-cli-evidence` / `batch_covered`; `findingFingerprint` hashes `file|severity|body`; `replaceGateEvidence` deletes bytes from `## Gate evidence` to the next `## `, which drops an HTML comment sitting between the two sections.

Pre-mortem: a batch or feature PR publishes with a stale or downgraded CLI record and Critical/Major findings disappear from the bound evidence. The six rules above are the constraints that would have stopped that.

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md` (G-CR2)
- Summary: Bind CLI evidence to the finalized head with `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->`. The hash includes a canonical findings digest (stable key + severity). A same-head rerun with no diff cannot keep a weaker result. Stable finding keys omit severity. PR-body Gate-evidence replacement preserves the marker and the CLI evidence section. Batch PRs record `batch_covered` listing each member PR number and final head. `unavailable` remains not a pass. Critical / Major / unknown still block `/push` after two fix rounds (`blocked_major_findings`) — already specified; this run does not reopen that contract.
- Clarifications needed: none.

## Acceptance Criteria → Tests

| #   | Criterion                                     | Risk | Layer | Test file                                                            | New or existing | Test name                                                  | Assertion                                                                                                                                                                                                 | Command                                                                             | Depends on |
| --- | --------------------------------------------- | ---- | ----- | -------------------------------------------------------------------- | --------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| C1  | HTML evidence marker bound to the head        | P0   | unit  | `tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts` | new file        | `renders an HTML evidence marker bound to the head`        | `renderCliEvidenceBlock` includes `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->` for that head; `unavailable` is not treated as clean                                                           | `pnpm test:unit tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts` | none       |
| C4  | Stable finding keys per pass                  | P0   | unit  | same                                                                 | new `it`        | `records a stable finding key that ignores severity`       | `stableFindingKey` is first 16 hex of sha256(`file\|startLine-endLine\|normalised title`); Major vs Minor share the key; load `.cursor/checks/fixtures/coderabbit-evidence/digest-findings.json`          | same command                                                                        | C1         |
| C2  | Hash binds the canonical findings digest      | P0   | unit  | same                                                                 | new `it`        | `binds a canonical findings digest into the evidence hash` | hash is sha256(`head\\nstatus\\ndigest`); digest is `severity\|file\|startLine-endLine\|normalised title` sorted by file then start line; `digest-findings.json` vs `digest-downgrade.json` hashes differ | same command                                                                        | C1, C4     |
| C3  | Same-head no-diff cannot downgrade            | P0   | unit  | same                                                                 | new `it`        | `same-head rerun with no diff cannot downgrade the result` | `chooseCliEvidence` keeps prior `findings`/Major when next is `clean` or Minor/Trivial at the same head with `noDiff: true`                                                                               | same command                                                                        | C1, C2, C4 |
| C5  | PR-body updates preserve the evidence block   | P1   | unit  | same                                                                 | new `it`        | `replaceGateEvidence preserves the HTML evidence marker`   | marker + `## CodeRabbit CLI evidence` survive `replaceGateEvidence` even when they sat inside the Gate span                                                                                               | same command                                                                        | C1         |
| C6  | Batch PRs record `batch_covered` member heads | P1   | unit  | same                                                                 | new `it`        | `batch PRs record batch_covered member heads`              | status `batch_covered`; human block and hash digest list each member PR number + final head; load `batch-covered.json`                                                                                    | same command                                                                        | C1         |
| C8  | Critical/Major need a disposition before push | P0   | unit  | same                                                                 | new `it`        | `Critical and Major require a disposition before push`     | missing disposition or waived-without-reason routes; captured+waived(reason) may push; `fixed` only when key absent; load `dispositions.json`                                                             | same command                                                                        | C1, C4     |

## Traceability Matrix

| Criterion | Spec ref                           | Test file::name                                                                                       | Source file(s)                                   | Risk | Status  |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---- | ------- |
| C1        | G-CR2 HTML marker                  | `coderabbit-cli-evidence-integrity.test.ts`::renders an HTML evidence marker bound to the head        | `.cursor/hooks/lib/coderabbit-pr-policy.mjs`     | P0   | planned |
| C4        | G-CR2 stableFindingKey             | `coderabbit-cli-evidence-integrity.test.ts`::records a stable finding key that ignores severity       | `.cursor/hooks/lib/coderabbit-review-policy.mjs` | P0   | planned |
| C2        | G-CR2 cliEvidenceHash digest       | `coderabbit-cli-evidence-integrity.test.ts`::binds a canonical findings digest into the evidence hash | review-policy + pr-policy                        | P0   | planned |
| C3        | G-CR2 chooseCliEvidence            | `coderabbit-cli-evidence-integrity.test.ts`::same-head rerun with no diff cannot downgrade the result | `.cursor/hooks/lib/coderabbit-pr-policy.mjs`     | P0   | planned |
| C5        | G-CR2 replaceGateEvidence preserve | `coderabbit-cli-evidence-integrity.test.ts`::replaceGateEvidence preserves the HTML evidence marker   | `.cursor/hooks/lib/gate-evidence-policy.mjs`     | P1   | planned |
| C6        | G-CR2 batch_covered                | `coderabbit-cli-evidence-integrity.test.ts`::batch PRs record batch_covered member heads              | pr-policy                                        | P1   | planned |
| C8        | G-CR2 dispositions                 | `coderabbit-cli-evidence-integrity.test.ts`::Critical and Major require a disposition before push     | pr-policy                                        | P0   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — G-CR2 HTML marker, SG-1469 shared digest/hash/key, anti-downgrade, stable keys, preserve-on-replace, `batch_covered`, Critical/Major dispositions; Last updated; G-CR2 evidence-table sentence; regression-guard path for the new unit file.
- Shared schema/fixtures: `.cursor/checks/fixtures/coderabbit-evidence/` — SCHEMA.md plus golden JSON (operator-authorized this turn).
- Existing-test edit: none (new file only; do not edit `tests/unit/dev-toolchain/push-gate-evidence.test.ts` or `coderabbit-res146-guards.test.ts`).

## TDD Execution Loop

### Criterion C1 — HTML evidence marker bound to the head (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1. Read `.cursor/plans/res-150_cli_evidence_integrity_5aa2.plan.md` C1 first. Create `tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts` with one `it` named `renders an HTML evidence marker bound to the head`. Import `renderCliEvidenceBlock` (and `hasCleanCliEvidence` if needed) from `.cursor/hooks/lib/coderabbit-pr-policy.mjs`. Call `renderCliEvidenceBlock({ head: "<40-hex>", attemptStatus: "findings" })` and assert the returned string matches `/<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->/` with that exact head and status `findings`. Also assert `renderCliEvidenceBlock({ head, attemptStatus: "unavailable" })` is not treated as clean (`hasCleanCliEvidence` false / parsed status is `unavailable`). Do not edit source. Run `pnpm test:unit tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts`. Exit = RED for a missing marker (assertion), not an import/harness error.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass. Minimal change to `renderCliEvidenceBlock` so it emits `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->` bound to the given head and status (hash may be head+status only until C2). Do not treat `unavailable` as clean. Do not edit tests or the spec. Exit = target test GREEN, executed.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C1 and re-verify. Exit = target file GREEN + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion C4 — Stable finding keys per pass (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C4. Read the plan C4 section. Add one `it` named `records a stable finding key that ignores severity` in the same file. Import `stableFindingKey` from `.cursor/hooks/lib/coderabbit-review-policy.mjs`. Load `.cursor/checks/fixtures/coderabbit-evidence/digest-findings.json`. Assert each fixture key. Two findings that share file, startLine-endLine, and normalised title but differ only in severity MUST return the same 16-hex key. A vendor `id` MUST NOT be used as the key. Do not edit source. Same unit command. Exit = RED (missing export or assertion).
- **Green** → Invoke the `tdd-green` subagent to make C4 pass. Add `stableFindingKey` = first 16 hex of sha256(`file|startLine-endLine|normalised title`). Do not edit tests. Exit = C4 GREEN, C1 still green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C4 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

### Criterion C2 — Hash binds the canonical findings digest (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2. Read the plan C2 section. Add one `it` named `binds a canonical findings digest into the evidence hash`. Load `digest-findings.json` and `digest-downgrade.json`. `cliEvidenceHash` / marker hash MUST equal the fixture hashes. Digest format is `severity|file|startLine-endLine|normalised title`, sorted by file then start line. Hash is sha256(`head\nstatus\ndigest`). The two fixtures MUST have different hashes and the same stable keys. Do not edit source. Same unit command. Exit = RED.
- **Green** → Invoke the `tdd-green` subagent to make C2 pass. Implement `canonicalFindingsDigest` and `cliEvidenceHash` per SCHEMA.md and wire the hash into the HTML marker. Do not edit tests. Exit = C2 GREEN; C1 and C4 stay green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C2 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

### Criterion C3 — Same-head no-diff cannot downgrade (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C3. Read the plan C3 section. Add one `it` named `same-head rerun with no diff cannot downgrade the result`. Import `chooseCliEvidence`. Prior = same head, status `findings`, one `major`. Next = same head, status `clean` (or the same key as `minor`). `{ sameHead: true, noDiff: true }` MUST return prior. A different head or `noDiff: false` MAY accept next. Do not edit source. Same unit command. Exit = RED (missing export or assertion).
- **Green** → Invoke the `tdd-green` subagent to make C3 pass. Implement `chooseCliEvidence` with result rank `findings` (highest severity critical=4, major=3, unknown=3, minor=2, trivial=1) > `unavailable` (0) > `clean` (-1). Same-head + noDiff + weaker next keeps prior. Do not edit tests. Exit = C3 GREEN; C1/C2/C4 stay green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C3 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

### Criterion C5 — PR-body updates preserve the evidence block (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C5. Read the plan C5 section. Add one `it` named `replaceGateEvidence preserves the HTML evidence marker`. Build a body whose Gate evidence span contains `<!-- coderabbit-cli-evidence:<sha>:findings:<hash> -->` and a `## CodeRabbit CLI evidence` section. After `replaceGateEvidence(body, renderGateEvidence({ head, result: "pass" }))`, both the marker (same sha/status/hash) and the CLI heading MUST remain. Do not edit source. Same unit command. Exit = RED because today's replace deletes the between-heading comment.
- **Green** → Invoke the `tdd-green` subagent to make C5 pass. Minimal change to `replaceGateEvidence` in `.cursor/hooks/lib/gate-evidence-policy.mjs` so every HTML evidence marker and the `## CodeRabbit CLI evidence` section survive. Do not edit tests. Exit = C5 GREEN; prior tests stay green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C5 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

### Criterion C6 — Batch PRs record `batch_covered` member heads (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C6. Read the plan C6 section. Add one `it` named `batch PRs record batch_covered member heads`. `renderCliEvidenceBlock({ head, attemptStatus: "batch_covered", members: [{ number: 201, head: "<40-hex-a>" }, { number: 203, head: "<40-hex-b>" }] })` MUST emit a marker with status `batch_covered` and a human block that lists each member PR number and that member's final head. The marker hash MUST change if a member head changes. Do not edit source. Same unit command. Exit = RED.
- **Green** → Invoke the `tdd-green` subagent to make C6 pass. Accept `members`, emit status `batch_covered`, list member number+head, bind sorted `<number>\t<head>\t<memberHash>` into the hash. Do not edit tests. Exit = C6 GREEN; prior tests stay green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C6 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

### Criterion C8 — Critical/Major need a disposition before push (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C8. Read the plan C8 section. Add one `it` named `Critical and Major require a disposition before push`. Load `.cursor/checks/fixtures/coderabbit-evidence/dispositions.json`. `decidePushCliAction` (or `assertCriticalMajorDispositions` + `decidePushCliAction`) MUST match each fixture case: missing disposition routes; waived without reason routes; captured + waived(reason) may push; `fixed` is valid only when the key is absent. Do not edit source. Same unit command. Exit = RED.
- **Green** → Invoke the `tdd-green` subagent to make C8 pass. Require a `fixed` / `captured` / `waived` disposition (waived needs a nonempty reason) for every Critical and Major, keyed by `stableFindingKey`, before a push decision. Do not edit tests. Exit = C8 GREEN; prior tests stay green.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C8 and re-verify. Exit = file GREEN + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-150_cli_evidence_integrity_5aa2`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-150_cli_evidence_integrity_5aa2.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 7 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md`
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-150_cli_evidence_integrity_5aa2.plan.md`

Problem: `/push` writes only a human CodeRabbit CLI evidence block. It has no HTML marker bound to the head, so a later body edit can name an older SHA. A same-head rerun can reclassify Majors to Minor/Trivial without a bound digest. Finding keys include severity. Batch PRs have no member-head evidence.
Approach: Extend G-CR2 so the PR body carries `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->`, the hash binds a canonical findings digest, a same-head no-diff rerun cannot keep a weaker result, keys omit severity, Gate-evidence replacement preserves the marker, and batch PRs record `batch_covered` member heads. Critical, Major, and unknown still block the push after two fix rounds; `unavailable` is not a pass.
Out-of-scope findings: none

| #   | Criterion                                     | Risk | Layer | Test file                                                          |
| --- | --------------------------------------------- | ---- | ----- | ------------------------------------------------------------------ |
| C1  | HTML evidence marker bound to the head        | P0   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
| C4  | Stable finding keys that ignore severity      | P0   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
| C2  | Hash binds the canonical findings digest      | P0   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
| C3  | Same-head no-diff cannot downgrade            | P0   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
| C5  | PR-body updates preserve the evidence block   | P1   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
| C6  | batch_covered lists each member PR final head | P1   | unit  | tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

`4-format` INPUT: this run's dirty paths from `git status --porcelain`. OUTPUT: `pnpm exec prettier --write <path> …` (never `.`). Then STEP 4G (do not run `coderabbit-gate.mjs` here), then STEP 4F (managed Cloud: execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`).

```markdown
## Docs sync packet

- plan_slug: res-150_cli_evidence_integrity_5aa2
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-150
- criteria_shipped: [C1, C4, C2, C3, C5, C6, C8]
- criteria_manual_uat: none
- req_ids: [G-CR2]
- source_paths: [.cursor/hooks/lib/coderabbit-pr-policy.mjs, .cursor/hooks/lib/coderabbit-review-policy.mjs, .cursor/hooks/lib/gate-evidence-policy.mjs]
- test_paths: [tests/unit/dev-toolchain/coderabbit-cli-evidence-integrity.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-150_cli_evidence_integrity_5aa2.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-150 (plan: res-150_cli_evidence_integrity_5aa2), handing the executing session's plan-file path (do not inline the body) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.
- **Close-out:** delegate `linear-resolver` for RES-150 after 4C: resolution comment only (no workflow-state write). Then STEP 4F: execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md`. Draft PR into `staging` that Closes RES-150. Never `gh pr ready`. Never `gh pr merge`.
- **Findings registration:** skip if the run file and category files stay empty.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- evidence-integrity → HTML marker + hash digest + anti-downgrade in `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
- finding-keys → `.cursor/hooks/lib/coderabbit-review-policy.mjs`
- pr-body-preserve → `.cursor/hooks/lib/gate-evidence-policy.mjs`

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none
- Traceability finalized in tdd log `## Traceability (final)`: yes
- Run metrics stamped in tdd log `## Run metrics`: yes
- `node .cursor/checks/harness-lint.mjs res-150_cli_evidence_integrity_5aa2`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is `.cursor/plans/res-150_cli_evidence_integrity_5aa2.plan.md`. Do not wait for a second accept. Arm `tdd-guard`, launch START (`run_in_background: true`; do not wait), apply the G-CR2 spec edit, then delegate C1 Red. After successful close-out, execute commit then push. Draft PR into staging. Never ready. Never merge.

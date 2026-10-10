# /sdd-to-tdd RES-154 — [WIP] draft PR as the first step of every agent run

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
- Work-order: `.cursor/plans/res-154_wip_draft_pr_10d5.plan.md`
- Workflow mode: FIX
- Ready brief: present but incomplete (`Spec:` lacks `: <criteria>`; no `Decisions:`). Ticket DESIGN + ACCEPTANCE + `Allowed edits` + `Verification` are the human contract. No CLARIFY.

## Project & Milestone Route

- Team: key `RES` (display name Restaurant Link)
- Project: `restaurant-system V-0.5` (`P-RES-12`, status Backlog / nonterminal). Precedence 2 — issue already on this project. Only nonterminal RES `V-X.X` project (V-0.1 and V-0.2 are Completed).
- Work type: implementation (harness)
- Milestone: **M4 — Code Complete (Feature Freeze)** (issue milestone is currently unset; route hint only — do not `save_issue`)
- Mixed design + implementation: no (DESIGN is complete on the ticket)
- Clarification: none

## Issue & Root Cause (FIX mode)

- Issue: [RES-154](https://linear.app/realized/issue/RES-154/harness-open-a-wip-draft-pr-as-the-first-step-of-every-agent-run) — Cloud agents finished without a PR (RES-149, RES-150, SG-1470 on 10 Oct). Expected: every ticket-work run opens exactly one `[WIP]` draft into `staging` before the first code change, `/push` reuses it, and Jose merges.
- Missing constraint: `docs/specs/dev-toolchain.md` has G-PUB1 / G-CON1 publication lanes but no rule that the first step is an empty `wip(<KEY>): start run` commit + `[WIP]` draft + `agent-running`, nor that `/push` fail-closes on duplicate open head PRs, nor that the QA gate binds a protected CLI-evidence section to the current head.
- Spec update proposed: `docs/specs/dev-toolchain.md` → add **G-WIP1–G-WIP7**; amend **G-CON1** so the lane may use the GitHub label `agent-running` on that WIP draft only (spec-only / morning PRs keep their existing label). FIRST execution write after START (and after this run's dogfood empty commit).

## Spec

- Source: extend existing `docs/specs/dev-toolchain.md`
- Summary: Ticket-work commands (`/conduct next`, `/sdd-to-tdd`, `/design`) open exactly one `[WIP]` draft into `staging` before the first code change. `/push` reuses that PR when `gh pr list --head <branch> --state open` returns one, creates only when none (logged), and exits non-zero on more than one. It strips `[WIP]` and `agent-running` and rewrites a protected CLI-evidence section. CodeRabbit and Vercel stay quiet while the title is `[WIP]`. The QA gate ignores drafts whose protected evidence SHA is not the current head. A no-op run closes its draft with a reason. Capacity counts `agent-running` drafts. Drafts only; Jose merges; nothing touches `main`.
- Clarifications needed: none. Ticket DESIGN answers the label, commands, evidence-section, Vercel skip, abort, and cap. Ready-brief `Decisions:` were empty; treated as the DESIGN list.
- Elicitation (pre-mortem): a shipped run with no PR is the incident. The missing AC is "exactly one `[WIP]` draft before the first code change." Inversion: a `/push` that already creates a draft at the end, or `ignore_title_keywords: WIP` (already present), must not satisfy G-WIP1 / G-WIP4 — first-step ordering and the exact token `[WIP]` are required. A `selectOpenHeadPr` that returns the first of many must not satisfy G-WIP3.

## Acceptance Criteria → Tests

Layer is `unit` for every automatable criterion (command prose + pure policy). No infra.

| #   | Criterion                                                       | Risk | Layer | Test file                                       | New or existing | Test name                                                          | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Command                                                        | Depends on |
| --- | --------------------------------------------------------------- | ---- | ----- | ----------------------------------------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------- |
| C1  | G-WIP3 duplicate open head PRs fail `/push`                     | P0   | unit  | `tests/unit/dev-toolchain/wip-draft-pr.test.ts` | new file        | `selectOpenHeadPr fails closed on duplicate open PRs`              | Dynamic-import `selectOpenHeadPr` from `gate-evidence-policy.mjs`. `[]` → `{ ok: false, reason: "none" }`; one PR → `{ ok: true, pr }`; two+ → `{ ok: false, reason: "duplicate_open_prs" }`. `push.md` names `gh pr list --head` + `--state open` and a non-zero stop on more than one.                                                                                                                                                                                                                                                                           | `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts` | none       |
| C2  | G-WIP5 QA gate binds protected CLI evidence to the current head | P0   | unit  | same file                                       | add `it`        | `protected CLI evidence is authoritative and SHA-bound`            | Dynamic-import `protectedCliEvidenceStatus` + `replaceProtectedCliEvidence` from `coderabbit-pr-policy.mjs`. Marker `<!-- coderabbit-cli-evidence:<sha>:<status>:<hash> -->` inside `## CodeRabbit CLI evidence` returns that status for that SHA. Prefix/suffix decoy markers and body edits outside the section do not change the result. Draft + no matching SHA → `{ ok: false, reason: "missing_head_evidence" }` via `qaDraftEvidenceVerdict`. `ready-merge-release.md` names that ignore. Do **not** change `evaluateReadyPr` `ready_no_coderabbit_review`. | same                                                           | none       |
| C3  | G-WIP2 `/push` reuses the one PR and refreshes evidence         | P0   | unit  | same file                                       | add `it`        | `push reuses the single open head PR and strips WIP`               | `selectOpenHeadPr([one]).ok === true`. `push.md` reuses that PR, rewrites the protected evidence section for the finalized head, removes `[WIP]` from the title, removes label `agent-running`, stays `--draft`, base `staging`. Creating a second PR is only when `reason === "none"` and is logged.                                                                                                                                                                                                                                                              | same                                                           | C1, C2     |
| C4  | G-WIP1 open exactly one `[WIP]` draft before first code change  | P1   | unit  | same file                                       | add `it`        | `ticket-work commands open one WIP draft before first code change` | `conduct.md`, `sdd-to-tdd.md`, and `design.md` require, when this head has no open PR: `git commit --allow-empty -m "wip(<KEY>): start run <link>"`, push, `gh pr create --draft --base staging`, title prefixed `[WIP]`, body contains `Closes <KEY>` and the run link, label `agent-running`. Dynamic-import `formatWipStart` from `gate-evidence-policy.mjs` returns that commit message, title, body, and label. In-loop `/sdd-to-tdd` on an existing PR must not open a second draft.                                                                         | same                                                           | C1         |
| C5  | G-WIP4 no CodeRabbit review or Vercel build while `[WIP]`       | P1   | unit  | same file                                       | add `it`        | `WIP title skips CodeRabbit review and Vercel build`               | `.coderabbit.yaml` `reviews.auto_review.ignore_title_keywords` includes the exact token `[WIP]` (not only `WIP`). `vercel.json` `ignoreCommand` is set and `crons` is absent/empty. Dynamic-import `shouldIgnoreWipBuild` from `gate-evidence-policy.mjs`: title starting `[WIP]` → true; commit `wip(RES-154): start run …` → true; otherwise false.                                                                                                                                                                                                              | same                                                           | none       |
| C6  | G-WIP6 no-op run closes its draft with a reason                 | P1   | unit  | same file                                       | add `it`        | `noop run closes the WIP draft with a reason`                      | Dynamic-import `shouldCloseNoopWip` from `gate-evidence-policy.mjs`: WIP-only empty start commit and no further tracked change → true. `conduct.md` / `sdd-to-tdd.md` close with `gh pr close <n> --comment` and a reason; no Linear state write (TPM bot owns revert).                                                                                                                                                                                                                                                                                            | same                                                           | C4         |
| C7  | G-WIP7 cap counts `agent-running` drafts                        | P1   | unit  | same file                                       | add `it`        | `capacity counts agent-running drafts only`                        | Dynamic-import `countAgentRunningDrafts` from `dispatch-capacity-policy.mjs`. Draft + label `agent-running` counts; a spec-only / morning PR without that label does not. `conduct.md` in-flight / cap text names `agent-running` drafts.                                                                                                                                                                                                                                                                                                                          | same                                                           | C4         |

Ticket AC (8) is the hook-test requirement (C1/C2/C3/C6). Ticket AC (9) is a constraint on C3/C4 (draft only, base `staging`, never `gh pr merge`, never `main`).

## Traceability Matrix

| Criterion | Spec ref | Test file::name                                                                        | Source file(s)                                                                          | Risk | Status  |
| --------- | -------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---- | ------- |
| C1        | G-WIP3   | wip-draft-pr.test.ts::selectOpenHeadPr fails closed on duplicate open PRs              | `.cursor/hooks/lib/gate-evidence-policy.mjs`, `.cursor/commands/push.md`                | P0   | planned |
| C2        | G-WIP5   | wip-draft-pr.test.ts::protected CLI evidence is authoritative and SHA-bound            | `.cursor/hooks/lib/coderabbit-pr-policy.mjs`, `.cursor/commands/ready-merge-release.md` | P0   | planned |
| C3        | G-WIP2   | wip-draft-pr.test.ts::push reuses the single open head PR and strips WIP               | `.cursor/commands/push.md`, gate-evidence + coderabbit-pr policies                      | P0   | planned |
| C4        | G-WIP1   | wip-draft-pr.test.ts::ticket-work commands open one WIP draft before first code change | `conduct.md`, `sdd-to-tdd.md`, `design.md`, gate-evidence-policy                        | P1   | planned |
| C5        | G-WIP4   | wip-draft-pr.test.ts::WIP title skips CodeRabbit review and Vercel build               | `.coderabbit.yaml`, `vercel.json`, ignore script / `shouldIgnoreWipBuild`               | P1   | planned |
| C6        | G-WIP6   | wip-draft-pr.test.ts::noop run closes the WIP draft with a reason                      | `conduct.md`, `sdd-to-tdd.md`, `shouldCloseNoopWip`                                     | P1   | planned |
| C7        | G-WIP7   | wip-draft-pr.test.ts::capacity counts agent-running drafts only                        | `dispatch-capacity-policy.mjs`, `conduct.md`                                            | P1   | planned |

## Execution Preconditions

- Infra needed: none (all unit/mocked).
- Verification from Ready brief: `pnpm lint; pnpm typecheck; pnpm test:unit` at Refactor / close-out. Each phase runs `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`.
- Dogfood (this Cloud run, operator-mandated): after the work-order exists, create `cursor/res-154-wip-draft-pr-10d5` from `origin/staging`, empty commit `wip(RES-154): start run <run-url>`, push, open a `[WIP]` draft PR into `staging` with `Closes RES-154` via `ManagePullRequest` (this Cloud agent must not `gh pr create`). `/push` at close-out must reuse that PR.

## Permissions Requested (before execution)

- Spec create/edit: `docs/specs/dev-toolchain.md` — add G-WIP1–G-WIP7; amend G-CON1 for `agent-running`; Scope + implementation-trace rows; Last updated.
- Existing-test edit: none (only add `tests/unit/dev-toolchain/wip-draft-pr.test.ts`). Do **not** edit `.cursor/checks/coderabbit-pr-policy.test.mjs` (`ready_no_coderabbit_review` on drafts stays).

Managed Cloud one-shot: initiating task + Ready brief `Spec:` / `Allowed edits` pre-authorize these paths and the listed command/hook/yaml/vercel surfaces.

## TDD Execution Loop

### Criterion 1 — G-WIP3 duplicate open head PRs fail `/push` (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C1. Work-order `.cursor/plans/res-154_wip_draft_pr_10d5.plan.md` + C1 only. File: `tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Name: `selectOpenHeadPr fails closed on duplicate open PRs`. Dynamic-import `selectOpenHeadPr` from `.cursor/hooks/lib/gate-evidence-policy.mjs` (existing module — missing export is the RED). Assert none / one / duplicate reasons and that `push.md` names `--state open` plus a non-zero duplicate stop. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED (assertion or missing-symbol), executed, not skipped. Tests/\*\* only.
- **Green** → Invoke the `tdd-green` subagent to make C1 pass. Minimal: export `selectOpenHeadPr` from `gate-evidence-policy.mjs`; edit `push.md` Step 3 no-argument list to `gh pr list --head <current-branch> --state open` and STOP non-zero when length > 1. Do not strip `[WIP]` yet (C3). Never edit tests/spec. Exit: target test GREEN.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C1 and re-verify. Exit: target test GREEN + `pnpm lint` + `pnpm typecheck` + `pnpm exec prettier --check` on touched source.

### Criterion 2 — G-WIP5 QA gate binds protected CLI evidence (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C2. Work-order + C2 only. Same file, new `it`: `protected CLI evidence is authoritative and SHA-bound`. Dynamic-import `protectedCliEvidenceStatus`, `replaceProtectedCliEvidence`, `qaDraftEvidenceVerdict` from `.cursor/hooks/lib/coderabbit-pr-policy.mjs`. HTML marker + section invariance + draft missing SHA. Pin `ready-merge-release.md`. Do not import-fail on a new file. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C2, C1 still green.
- **Green** → Invoke the `tdd-green` subagent to make C2 pass. Add the three exports to `coderabbit-pr-policy.mjs`; pin `ready-merge-release.md`. Do **not** change `evaluateReadyPr` so existing `.cursor/checks/coderabbit-pr-policy.test.mjs` stays green. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C2 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

### Criterion 3 — G-WIP2 `/push` reuses the one PR and refreshes evidence (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C3. Work-order + C3 only. Same file, new `it`: `push reuses the single open head PR and strips WIP`. Assert reuse path, protected-section rewrite for the head, title without `[WIP]`, label `agent-running` removed, draft + base `staging` kept. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C3.
- **Green** → Invoke the `tdd-green` subagent to make C3 pass. Minimal `push.md` edits: reuse when exactly one; log when creating because none; rewrite the protected evidence section; strip `[WIP]`; remove `agent-running`; never `gh pr ready` / `gh pr merge`; base stays `staging`. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C3 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

### Criterion 4 — G-WIP1 open exactly one `[WIP]` draft before first code change (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C4. Work-order + C4 only. Same file, new `it`: `ticket-work commands open one WIP draft before first code change`. Pin `conduct.md`, `sdd-to-tdd.md`, `design.md` first-step sequence and `formatWipStart` (dynamic-import from `gate-evidence-policy.mjs`). In-loop existing-PR skip. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C4.
- **Green** → Invoke the `tdd-green` subagent to make C4 pass. Minimal command + `formatWipStart` export. Do not implement no-op close (C6) or cap (C7). Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C4 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

### Criterion 5 — G-WIP4 no CodeRabbit / Vercel build while `[WIP]` (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C5. Work-order + C5 only. Same file, new `it`: `WIP title skips CodeRabbit review and Vercel build`. Exact `[WIP]` keyword; `vercel.json` ignoreCommand; `shouldIgnoreWipBuild` cases. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C5.
- **Green** → Invoke the `tdd-green` subagent to make C5 pass. Set `.coderabbit.yaml` `ignore_title_keywords` to include `[WIP]`; add `vercel.json` `ignoreCommand` only (no `crons` — PV-15); export `shouldIgnoreWipBuild` and a tiny ignore script that calls it. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C5 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

### Criterion 6 — G-WIP6 no-op run closes its draft with a reason (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C6. Work-order + C6 only. Same file, new `it`: `noop run closes the WIP draft with a reason`. `shouldCloseNoopWip` + `gh pr close --comment` pins. No Linear state write. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C6.
- **Green** → Invoke the `tdd-green` subagent to make C6 pass. Export `shouldCloseNoopWip`; pin abort in `conduct.md` / `sdd-to-tdd.md`. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C6 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

### Criterion 7 — G-WIP7 cap counts `agent-running` drafts (layer: unit)

- **Red** → Invoke the `tdd-red` subagent to write the failing test for C7. Work-order + C7 only. Same file, new `it`: `capacity counts agent-running drafts only`. Dynamic-import `countAgentRunningDrafts` from `dispatch-capacity-policy.mjs`; pin `conduct.md`. Command: `pnpm test:unit tests/unit/dev-toolchain/wip-draft-pr.test.ts`. Exit: RED for C7.
- **Green** → Invoke the `tdd-green` subagent to make C7 pass. Export `countAgentRunningDrafts`; pin conduct in-flight / cap. Never edit tests/spec.
- **Refactor** → Invoke the `tdd-refactor` subagent to clean up C7 and re-verify. Exit: tests GREEN + lint + typecheck + prettier --check on touched source.

## Manual-UAT (deferred, not automated)

- none

## Linear Plan Digest (posted at START — the only artifact Linear ever sees)

```markdown
Work started: `/sdd-to-tdd` execution · plan `res-154_wip_draft_pr_10d5`

**Plan digest** — pre-execution intent, not a result. Authoritative record is the
owning spec plus `docs/verifier-reports/tdd/res-154_wip_draft_pr_10d5.md` at close-out.

Mode: FIX
Owning spec: `docs/specs/dev-toolchain.md`
Criteria: 7 automatable · 0 manual-UAT
Approval gates: spec create/edit `docs/specs/dev-toolchain.md` | existing-test edit none
Infra: none (all unit/mocked)
Full plan: not posted to Linear (size-bounded digest) · local copy `res-154_wip_draft_pr_10d5.plan.md`

Problem: Cloud agents finished without a PR, so the Cursor integration runs are hard to track. The toolchain spec has publication lanes but no rule that ticket work opens exactly one [WIP] draft into staging before the first code change.
Approach: Encode G-WIP1–G-WIP7 on docs/specs/dev-toolchain.md (amend G-CON1 for the agent-running label only). Drive duplicate-PR fail-closed, protected CLI-evidence, reuse-and-strip, first-step WIP open, [WIP] skip, no-op close, and cap counting through unit Red→Green→Refactor. This run dogfoods the empty wip(RES-154) commit and reuses that draft on /push. Draft only; Jose merges; nothing touches main.
Out-of-scope findings: none

| #   | Criterion                                     | Risk | Layer | Test file            |
| --- | --------------------------------------------- | ---- | ----- | -------------------- |
| 1   | Duplicate open head PRs fail /push            | P0   | unit  | wip-draft-pr.test.ts |
| 2   | Protected CLI evidence is SHA-bound           | P0   | unit  | wip-draft-pr.test.ts |
| 3   | /push reuses the one PR and strips WIP        | P0   | unit  | wip-draft-pr.test.ts |
| 4   | Open one [WIP] draft before first code change | P1   | unit  | wip-draft-pr.test.ts |
| 5   | No CodeRabbit/Vercel build while [WIP]        | P1   | unit  | wip-draft-pr.test.ts |
| 6   | No-op run closes the draft with a reason      | P1   | unit  | wip-draft-pr.test.ts |
| 7   | Cap counts agent-running drafts only          | P1   | unit  | wip-draft-pr.test.ts |
```

## Docs Sync

Execution-start todo: `start-linear` — first, before the spec edit / Criterion 1 Red. INPUT: this plan's `## Linear Plan Digest` section. Task `run_in_background: true`; do not wait for its report before spec/C1.

Close-out todos: `4d-review-trail`, `4e-traceability`, `4-docs-packet`, `4-docs-updater`, `4c-findings`, `4b-linear`, `4-format`.

```markdown
## Docs sync packet

- plan_slug: res-154_wip_draft_pr_10d5
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: RES-154
- criteria_shipped: [G-WIP3, G-WIP5, G-WIP2, G-WIP1, G-WIP4, G-WIP6, G-WIP7]
- criteria_manual_uat: none
- req_ids: [G-WIP1, G-WIP2, G-WIP3, G-WIP4, G-WIP5, G-WIP6, G-WIP7]
- source_paths: [.cursor/commands/conduct.md, .cursor/commands/push.md, .cursor/commands/sdd-to-tdd.md, .cursor/commands/design.md, .cursor/hooks/lib/gate-evidence-policy.mjs, .cursor/hooks/lib/coderabbit-pr-policy.mjs, .cursor/hooks/lib/dispatch-capacity-policy.mjs, .coderabbit.yaml, vercel.json]
- test_paths: [tests/unit/dev-toolchain/wip-draft-pr.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/res-154_wip_draft_pr_10d5.md
- drift_flagged: none
- skip_reason: none
```

## Out-of-Scope Findings (the Findings Ledger — "none" if empty)

| Finding | Where (file:line/area) | Why it matters | Severity | Relation |
| ------- | ---------------------- | -------------- | -------- | -------- |

none at plan time. TPM-bot status revert on abort is excluded by the ticket (not a finding).

## Linear Close-out & Findings Registration

- **START:** Invoke the `linear-resolver` subagent to start work on RES-154 (plan: res-154_wip_draft_pr_10d5), handing the executing session's plan-file path (do not inline the body; do not bake the path into this todo text) and posting this digest; Task `run_in_background: true`; do not wait for its report before spec/C1. INPUT: this plan's `## Linear Plan Digest` section.
- **Close-out (FIX):** after 4C, delegate `linear-resolver` to post the structured resolution comment on RES-154 only (no workflow-state write).
- **Findings registration:** merge run-file open lines if any; managed Cloud is attach-only.

## Suggested Review Order (review trail — assembled at close-out, Step 4D)

- [public-api] `selectOpenHeadPr` + `/push` duplicate stop
- [security] protected CLI-evidence section / SHA bind
- [public-api] first-step WIP create + `agent-running`
- [public-api] `[WIP]` CodeRabbit / Vercel skip

## Retrospective (close-out, Step 4E — "none" if nothing reusable)

- Patterns for packet `patterns_to_promote`: none yet
- Traceability finalized in tdd log `## Traceability (final)`: pending
- Run metrics stamped in tdd log `## Run metrics`: pending
- `node .cursor/checks/harness-lint.mjs res-154_wip_draft_pr_10d5`: pending

## First Execution Action

- **Managed Cloud one-shot:** work-order is this file. Do not wait for a second accept.
  1. Dogfood (operator-mandated, before TDD writes): `git fetch origin staging`; branch `cursor/res-154-wip-draft-pr-10d5`; empty commit `wip(RES-154): start run <https://cursor.com/agents/bc-26c58cef-e430-5caf-8919-5aa971bf10d5>`; push; open a `[WIP]` draft PR into `staging` with `Closes RES-154` via `ManagePullRequest` (never `gh pr create` in this Cloud agent; never merge; never touch `main`). Add label `agent-running` if the repo has it.
  2. `node .cursor/hooks/tdd-guard.mjs on`
  3. Invoke the `linear-resolver` subagent to start work on RES-154 (plan: res-154_wip_draft_pr_10d5), posting this digest. Task `run_in_background: true`. Do not wait.
  4. Apply the spec edit to `docs/specs/dev-toolchain.md`, then `pnpm exec prettier --write` that path.
  5. Delegate Criterion 1 Red.
  6. After successful close-out, execute `.cursor/commands/commit.md`; on PASS execute `.cursor/commands/push.md` into the same draft (reuse; strip `[WIP]`). This run's `/push`: CodeRabbit CLI up to two fix rounds; leftover Critical/Major after the final round are listed under `Captured blocking findings (Jose review)` and the push proceeds; `unavailable` still blocks. Draft only.

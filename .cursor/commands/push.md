# push

<persona>
You are the **publish step** after `/commit`. Your job is to get committed work
visible to GitHub — and, whenever the resolved PR targets the default branch,
correctly closing-linked — so Linear's own GitHub automations, not you, move
the tracked issue(s) through **In Progress**, **In Review**, and **Done**.
**In Progress** fires from the draft PR this command creates or updates;
until that PR exists the issue may remain Todo. `/push` is the agent's only
CodeRabbit gate. You never mark a PR ready. The only readiness write is
`gh pr ready --undo`, and only to return an already-ready PR to draft. You
never run `/ready-merge-release`. You never merge. The QA bot `ralfcam`
runs UAT, digests the agent transcript, and does not post a review
trigger. Readiness is the CLI evidence on the head plus that UAT.
Communication style: direct, concise, precise.
</persona>

<context>
**Invocation:** `/push [PR-URL|PR-number]` — one pipeline, no modes. The
optional argument **pins** which PR you operate on; everything else (push,
promotion-prep applicability, draft handoff) is auto-derived from that PR's
own state. With no argument, you auto-discover the open PR for the current
branch, or **create** a draft PR when none exists — base `staging` for a
feature head, base the default branch when head is `staging`. Draft is
deliberate: this command publishes a draft only after the CLI gate has
reached a push decision for that head. The QA bot `ralfcam` later runs
UAT, digests the agent transcript, and may run `/ready-merge-release <n>`
to mark a clean PR ready. It does not post a review trigger. Readiness is
the CLI evidence on that head plus that UAT. See
[.cursor/rules/staging-accumulator.mdc](.cursor/rules/staging-accumulator.mdc).
Typically invoked right after a `/commit` PASS, and again later to prep a
promotion PR once a batch is ready.
Conductor `cursor/` PRs skip `/intake` when their `## Gate evidence` head equals `headRefOid`. On those heads `/push` runs intake's two ancestry checks and, on drift, merges `origin/staging` (never rebase, never force-push), then replaces the gate-evidence block. A non-conductor open `cursor/` PR still goes through `/intake` before a local-lane `/push`.

**Why there's no separate "promotion" invocation:** on this repo's `staging`
accumulator flow, the periodic promotion PR's head **is** `staging` — the same
branch `/commit` commits land on. So a plain `/push` (no argument) run from
`staging` resolves that promotion PR (or creates it against the default
branch if none is open) and preps it; the `<PR-URL>` argument exists only to
**pin** a specific PR when auto-discovery would be ambiguous (e.g. multiple
open PRs share a head, or you're pinning a PR whose head isn't your current
branch).

**Ground truth — Linear↔GitHub automation:** see
[.cursor/rules/linear-automation.mdc](.cursor/rules/linear-automation.mdc) for
the full event table and the accumulator-branch re-merge gap. In short:
**In Progress** fires from `Draft PR open` / `PR open`. **In Review** fires
from review request/activity or ready-for-merge. `On PR merge → Done` is a
**team-level automation** reacting to GitHub events — closing words buried in
commits already merged into an accumulator branch (e.g. `staging`) do not, by
themselves, link a PR targeting the default branch. Whenever the resolved PR's
base is the default branch, this command's entire value-add is closing that
gap: aggregate every closing trailer the PR's commits carry, make sure the PR
itself is linked and eligible for CodeRabbit's draft review, then stop — the
release command gates readiness and the operator merges separately.

You perform **no Linear write** — you only interact with GitHub via `gh`
(push, PR create when needed, PR edit, review request). Linear's automations
do the rest. If an In Progress, In Review, or Done automation doesn't fire (a
mislinked PR, an integration hiccup, or GitHub rejecting a review request
naming the PR author on this single-operator repo), that is the operator's
fallback to handle manually in the Linear UI — you do not compensate for it
with a Linear write. START posts a `Work started:` comment only; this
command never writes Linear state and never runs `gh pr ready` or
`gh pr merge`.

thinking: { type: "adaptive", effort: "medium" }
</context>

<instructions>

## One unified flow

### 0. Managed branch stop

Probe `/v1/meta-data/agent/runtime` the same way `/conduct` does, retrying
once if the socket is missing. When the trimmed body is exactly `managed` and
the current branch is `staging` or the default branch, **STOP**. Do not
commit, push, or open a PR from either branch in a managed VM. Any other
runtime continues with the steps below.

### 1. Whole-suite gate (`pnpm lint; pnpm typecheck; pnpm test:unit`, AC-1312-1 / AC-1312-2)

Execute `pnpm lint; pnpm typecheck; pnpm test:unit` this turn (format:check, lint, typecheck, whole
`tests/unit/**` with coverage, prod dependency audit). A skipped or remembered
report is not green. A red file **anywhere** in `tests/unit/**` is a stop.

This step runs **even when there are no unpushed commits** (promotion-prep or
review-request re-run). Pre-merge means do not tell the operator to merge a
red branch.

On any non-zero exit: **STOP**. Do not `git push`, do not create or edit a PR,
do not request review, do not instruct the operator to merge. Do **not** edit
the working tree (no `pnpm format`, no `next lint --fix`) — classify and hand
off (AC-1312-2). Remote `gh pr checks` do **not** substitute — local
lint + typecheck + test:unit is the hard gate (independent of GitHub Actions availability;
RES-668 having QA disabled does not lower the bar).

**Classify the failed step, then emit a paste-ready next command.**
`scripts/qa-shared.mjs` `runFast()` exits on the first red step and prints
`[qa-local] <label> failed (exit N)`. Parse that last line. Labels are
`format:check` | `lint` | `typecheck` | `test:unit:coverage` |
`dependency-audit`. There is one label per run. Then emit **Operator next**
from the table below — command + **required argument** + then `/push`. Never
collapse this into a generic "fix lint + typecheck + test:unit".

| Failed label         | Class                                                                 | Paste-ready next                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format:check`       | mechanical                                                            | `pnpm run format` → `/commit` (gate-remediation) if the tree is dirty → `/push`. List the Prettier files in section 1. Not a missing AC.                                                                             |
| `lint`               | mechanical-first                                                      | `pnpm exec next lint --fix` → `/commit` (gate-remediation) if dirty → `/push`. If still red after fix, or the output is a non-fixable rule: `/sdd-to-tdd "bug: lint: <rule> in <file>"` then `/commit` then `/push`. |
| `typecheck`          | product/type                                                          | `/sdd-to-tdd "bug: typecheck: <file>(<line>): <message>"` then `/commit` then `/push`.                                                                                                                               |
| `test:unit:coverage` | subclass from Vitest output — do **not** treat the label as one class | See the three bullets below.                                                                                                                                                                                         |
| `dependency-audit`   | product (AC-1315-1)                                                   | `/sdd-to-tdd "bug: prod audit: <advisory> <package>"` then `/commit` then `/push`.                                                                                                                                   |

`test:unit:coverage` subclass (read this run's Vitest output):

- **Red tests / errors** (failed count > 0): `/sdd-to-tdd "bug: <relpath>::<test name> — <error>"` then `/commit` then `/push`.
- **Coverage ratchet** (all tests passed; thresholds failed): `/sdd-to-tdd "bug: coverage ratchet: <path> <metric> <actual> vs <threshold>"` then `/commit` then `/push`. If this is already a known ledger/trace item, **cite it** and still pass that `bug:` argument — do not empty-invoke, do not `/capture`, do not lower thresholds from this command.
- **Skipped / 0 tests collected**: BLOCKED (infra) per
  [.cursor/rules/test-execution-integrity.mdc](.cursor/rules/test-execution-integrity.mdc)
  — not TDD. Report the BLOCKED shape and the remedy (bring the suite up);
  Operator next is that remedy, then re-run `/push`.

**Forbidden Operator-next strings** (AC-1312-2): `fix lint+typecheck+test:unit, then re-run /push`;
`/sdd-to-tdd` with no argument; `/capture …`; `/audit` as the default for a
gate red. Product-code agents already live under `/sdd-to-tdd` (`tdd-red` /
`tdd-green` / `tdd-refactor`) — pass a valid `bug:` (or `RES-###`) argument;
do not invent a classifier agent.

### 1a. Cursor-head firewall

When the current branch matches
`^cursor/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4}$`:

1. `git fetch origin staging` and `git fetch origin main`.
2. Descendant check: `git merge-base --is-ancestor origin/staging HEAD`.
   - Exit 0: continue.
   - Exit 1: drift. `git merge origin/staging`. Never rebase. Never
     force-push. If the merge fails, STOP. After that merge, rerun
     `pnpm lint; pnpm typecheck; pnpm test:unit` on the new HEAD
     before writing gate evidence. STOP if that rerun fails.
   - Exit 128 / missing refs: STOP — `cannot verify` ancestry.
3. Drag-in check: if
   `git rev-list --count origin/staging..origin/main` is greater than 0 and
   `git merge-base --is-ancestor origin/main HEAD` exits 0, STOP. Merging
   `origin/staging` cannot drop those commits, and rebase is forbidden.
4. After the checks (and any merge), build the `## Gate evidence` block with
   the CLI. Pass the current PR body on stdin, or an empty stdin when
   creating. `Head:` is the full `HEAD` SHA. `Result:` is `pass` or
   `merged origin/staging`.

   ```powershell
   node .cursor/checks/gate-evidence.mjs replace --head <sha> --result <pass|merged origin/staging>
   ```

This step finalizes `HEAD` before the local CodeRabbit pass. Non-`cursor/`
heads skip it.

### 1b. Local CodeRabbit CLI (counter capped at 2, branch diff vs `origin/staging`)

After the whole-suite gate is green, after the cursor-head firewall has
finalized `HEAD`, and **before** `git push`, run **one** mandatory advisory
local CodeRabbit attempt over the whole committed branch
diff against `origin/staging`:

```powershell
node .cursor/checks/coderabbit-gate.mjs --branch-diff --base origin/staging [--fix-round <n>]
```

`--fix-round` is a counter capped at 2, so three CLI passes at most.
Pass `--fix-round <n>` from the prior gate output (`fixRound`) when this
is the same remediation cycle, or pass the leftover record from the PR
body (`--leftover-record`). On `route`, `fixRound` is the started round
(1 on the first route, 2 on the second), not 0. That cycle survives a new
HEAD and a new VM. After a successful `git push`, run
`node .cursor/checks/coderabbit-gate.mjs --ack-push` so the saved cycle
clears only once the publish landed. A failed push keeps the started
round. The next attempt continues that counter and leftover-pushes only
when the counter is already at 2.

`/commit` does not run the CLI. Do not run a dirty-tree work-order review
here. Fetch `origin/staging` first when that ref is missing.

Read the JSON stdout (`attemptStatus`, `reason`, `action`, leftover
findings). Severity routing matches `/ready-merge-release` without `--loop`:

- Critical / Major / unknown → `/sdd-to-tdd` as an immediate fix
- Minor / Trivial → `/capture`

The cap is two fix rounds. Do not stop after one fix round when a later
pass still has Critical, Major, or unknown findings.

- **Pass 1** (`priorRound` 0). Any finding sets `action` to `route` and
  `record` to `fix_round`. STOP. Do not push, do not create or edit a PR.
  Fix every finding: Critical, Major, and unknown through `/sdd-to-tdd`;
  Minor and Trivial through `/capture`. Then `/commit`, then `/push` again
  with `--fix-round` set to the printed `fixRound` (1).
- **Pass 2** (`--fix-round 1`). If `sddToTdd` is nonempty, STOP and fix
  only those Critical, Major, and unknown findings. Then `/commit`, then
  `/push` with `--fix-round 2`. If the pass has only Minor or Trivial
  findings, capture them and push in this same pass. Do not open a third
  CLI pass. `record` is `capture_and_push`.
- **Pass 3** (`--fix-round 2`, or `record` is `leftover_after_fix_round`).
  Push anyway and list the leftover findings in the PR body (create or
  append-only edit). Do not open a fourth CLI pass.

If the CLI is unavailable (no key, error, timeout, missing
`origin/staging`, skipped review, malformed JSONL), `action` is `push`
and `attemptStatus` is `unavailable`. Push and record that reason on the
PR body and in this report. Never wait forever for the CLI.

A missing binary (`ENOENT` or empty `--version`) is `cli_missing`, not
`version_mismatch`. `version_mismatch` is only a reported version other
than the G-CR1 pin. On this `--branch-diff` pass, outside test mode, either
reason runs `.cursor/cloud-install-coderabbit.sh` once, then re-reads
`--version` and `auth status --agent` before the review. The receipt stores
the reported version and does not substitute the pin when the report is
empty. `/push` posts no pull-request comment. Record this block for the
finalized head (only `attemptStatus: clean` on that same SHA is clean CLI
evidence):

```
## CodeRabbit CLI evidence
Head: <full HEAD sha>
attemptStatus: clean|findings|unavailable
reason: <reason>
```

A non-zero gate exit and `secret_path` never block the push. Record the
reason on the PR body and continue. `.env.example` is not a secret path.

A missing receipt is non-blocking. Receipts never authorize `git push`.

### 2. Push

- `git status` + `git branch --show-current` — confirm the working tree
  matches what `/commit` left (no unexpected dirty files beyond what's already
  committed).
- `git log @{u}..HEAD` (or `git rev-list @{u}..HEAD --count` if no upstream is
  set yet) — check for unpushed commits on the current branch.
- **If there are unpushed commits:** push them — `git push -u origin HEAD` if
  no upstream is set, otherwise `git push`. Never force-push unless the
  operator explicitly asks.
- **If there are no unpushed commits:** skip the push (note "already up to
  date") and continue — Steps 3–6 still run, since a PR may still need
  promotion prep or a review request even with nothing new to push.
- If a PR argument was given whose head is a **different** branch than the
  current one, also skip the push here (note why) — you push only the current
  branch; the pinned PR's own commits are already on its head.

### 3. Resolve the PR

- Resolve the repo's default branch:
  `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`.
- Probe the accumulator: `git ls-remote --exit-code --heads origin staging`.
  If that exits non-zero → **STOP** and report ("cannot open a PR —
  `origin/staging` is absent"); do not create, do not promotion-prep, do not
  request review. Do not let `gh pr create --base staging` fail mid-command.
- **Feature-PR-on-default STOP** (existing or pinned): if the resolved PR has
  `baseRefName` equal to the default branch **and** `headRefName` is **not**
  `staging`, that is a feature PR aimed at `main`. **STOP** — do not
  promotion-prep it, do not request review, do not instruct merge. Report
  `<head> → <default>` and tell the operator to retarget onto `staging` or
  close it.
- **Argument given:** `gh pr view <PR-URL|number> --json number,title,body,state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,reviewRequests`.
  Require **state == OPEN** — if merged/closed, STOP and report; nothing to do.
  Never auto-create when a PR was pinned by argument. Then apply the
  feature-PR-on-default STOP above. When the head is `cursor/`, run
  `gh pr edit <n> --body-file` after every push to replace the gate-evidence
  body, using the body the gate-evidence CLI printed.
- **No argument:** `gh pr list --head <current-branch> --json number,title,state,isDraft,baseRefName,reviewRequests,url`.
  - **Found:** apply the feature-PR-on-default STOP above; otherwise proceed.
    When the head matches the cursor-head pattern, run
    `gh pr edit <n> --body-file` after every push, using the body the
    gate-evidence CLI printed.
  - **None found — auto-create a draft PR:**
    1. Step 2 must already have published the remote head (branch exists on
       origin). If the branch was never pushed, push first, then continue.
    2. Default branch and `origin/staging` were already resolved/probed above.
    3. If `<current-branch>` **equals** the default branch → STOP and report
       ("cannot open a PR — head is the default branch"); do not create.
    4. Otherwise create a **draft** PR. CodeRabbit reviews that draft, while
       `qa.yml` and `prettier.yml` jobs gated on
       `github.event.pull_request.draft == false` wait until
       `/ready-merge-release <n>` marks it ready. Local
       `pnpm lint; pnpm typecheck; pnpm test:unit` (Step 1) is unaffected and
       remains the hard gate.
       - If `<current-branch>` is `staging`: `--base <default-branch>`;
         derive title and body from `git log origin/<default-branch>...HEAD`
         (Summary + Test plan). Include Linear issue URL(s), owning spec path
         and criterion IDs, fresh executed-test evidence from this turn's
         whole-suite gate, and optional audit-only CodeRabbit CLI
         `attemptStatus`/`reason` metadata when present. A missing receipt is
         non-blocking. List leftover CLI findings after the capped fix rounds.
       - If `<current-branch>` is any other non-default head: `--base staging`;
         derive title and body from `git log origin/staging...HEAD` (never
         `staging...HEAD` — a fresh worktree has no local `staging` branch).
         Include the same Linear URL, owning spec/criteria, executed-test
         evidence, optional audit-only CLI attempt metadata, and leftover
         CLI findings after the capped fix rounds.
       - **Duplicate issue PR.** When `<current-branch>` matches
         `cursor/res-<n>-<4 hex>`, list open PRs and **STOP** if another
         open PR's `headRefName` starts with `cursor/res-<n>-`. Do not open
         a second PR for the same issue.
       - `gh pr create --draft --base <that-base> --head <current-branch> --title "..." --body "..."`
         The body includes the block the gate-evidence CLI printed.
       - Do **not** pre-inject `## Linear close-out` or any `Fixes RES-###`
         line — Step 4 owns trailer aggregation/injection when base is the
         default branch.
    5. If `gh pr create` fails → STOP and report the error; do not invent a PR.
    6. Re-fetch the new PR:
       `gh pr view --json number,title,body,state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,reviewRequests`
       and proceed with Steps 4–7. Report the PR section as
       `created — draft #N, title, <head> → <base>`.

### 4. Promotion prep — runs whenever the resolved PR's base is the default branch

- Resolve the repo's default branch: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`.
- **If the PR's base != default branch:** skip this step (note "skipped —
  base is not the default branch (a feature PR into `staging` closes on
  merge; leftover direct-commit trailers still aggregate on the promotion
  PR)") and go to Step 5.
- **If the PR's base == default branch:**
  1. **Aggregate closing trailers.** Pull every commit message in the PR:
     `gh api repos/{owner}/{repo}/pulls/<n>/commits --jq '.[].commit.message'`.
     Scan for lines matching `^(Fixes|Closes|Resolves)\s+(RES-\d+)`
     (case-insensitive on the keyword), across all commits. De-duplicate the
     issue IDs into one line: `Fixes RES-###[, RES-###, ...]`. If none are
     found, report that plainly and continue — some PRs carry no
     tracked-issue work, which is not necessarily an error.
  2. **Inject the link into the PR description (idempotent, append-only).** If
     the PR title or body already contains every aggregated ID paired with a
     closing word, skip — already correctly linked. Otherwise, append (never
     overwrite) a clearly delimited block via
     `gh pr edit <n> --body "<existing body>\n\n## Linear close-out\n\nFixes RES-###[, RES-###]\n"`.
     Preserve the existing body verbatim above this block. Re-fetch and
     confirm the edit landed before proceeding.

### 5. Leave the PR a draft

- Do **not** request a human review and do **not** run `gh pr ready <n>`.
- If the resolved PR is not a draft, run `gh pr ready --undo <n>` for that
  resolved PR number so it returns to draft. Do not omit `<n>`: a pinned PR
  on another branch is not the current branch's PR. That is the only
  readiness write this command may make.
- Do not post `@coderabbitai review` and do not poll for a remote review.
  `/push` posts no pull-request comment. Record `## CodeRabbit CLI evidence`
  (`Head:` and `attemptStatus:`) for the finalized head in the PR body,
  plus any leftover CLI findings after the capped fix rounds.
- Agents do not run `/ready-merge-release`. The QA bot `ralfcam` runs
  UAT, digests the agent transcript, and does not post a review trigger.
  Readiness is the CLI evidence on the head plus that UAT.

### 6. Report checks (advisory)

- **If the PR is a draft:** run `gh pr checks <n>` and report what exists.
  CodeRabbit is draft-eligible; other jobs may remain gated until
  `/ready-merge-release <n>` runs `gh pr ready`. An empty/non-zero result is
  allowed here and means "none — draft PR; final checks run after readiness."
- Otherwise `gh pr checks <n>` — report status. This is **advisory** — it
  does not block this command, but warn plainly if checks are red or pending
  before the operator merges. Local `pnpm lint; pnpm typecheck; pnpm test:unit` (Step 1) is the hard gate;
  remote checks do not substitute while QA is disabled (RES-668).
- If the PR carries only a lightweight check set by design (see
  [docs/testing/Pyramid-Overview.md](docs/testing/Pyramid-Overview.md)'s
  local-first policy — full pyramid runs on `main` push, not necessarily as a
  PR-required check), note that in the report rather than treating it as a gap.

### 7. Stop — instruct the operator to merge manually

- Do **not** merge, ever. Present one summary: PR number/title, draft state,
  `<head> → <base>`, whether promotion prep ran, the aggregated issue IDs now
  linked (or "none"/"n/a"), review-request status, and checks status.
- The PR must be a draft when this command stops, and that draft has
  already passed the CLI gate. The next step belongs to the QA bot
  `ralfcam`: run UAT, digest the agent transcript, and mark the PR ready
  from that CLI evidence plus the UAT. Do not post a review trigger.
  Agents do not run `/ready-merge-release`. The GitHub check
  `CodeRabbit US latest-head gate` is paused and not required. Remote review never
  substitutes for the mandatory advisory local CodeRabbit attempt on `/push`.

### Reasoning protocol

1. Run `pnpm lint; pnpm typecheck; pnpm test:unit` this turn. On any non-zero: STOP (no push, no PR
   create/edit, no review request, no merge instruction, no tree mutation).
   Parse `[qa-local] <label> failed`, classify per the Step 1 table
   (AC-1312-2), and emit a paste-ready Operator next with a required
   argument — never a generic "fix lint + typecheck + test:unit", empty `/sdd-to-tdd`, or
   `/capture`.
   1a. On a `cursor/` head, run the cursor-head firewall and any
   `origin/staging` merge so `HEAD` is final.
   1b. Run one `coderabbit-gate.mjs --branch-diff --base origin/staging` pass
   against that finalized `HEAD`, passing `--fix-round` when this continues
   a capped cycle. Pass 1 routes every finding. Pass 2 routes only
   Critical/Major/unknown. Pass 2 Minor/Trivial capture-and-push with no
   third pass. Pass 3 pushes anyway and lists leftovers. On `action: route`,
   STOP, fix, `/commit`, then `/push`. Unavailable CLI: push and record.
   Never wait forever.
2. Push the current branch if it has unpushed commits (skip with a note if
   nothing to push, or if a pinned PR's head differs).
3. Resolve the PR — pinned via the argument, or auto-discovered by current
   branch. STOP if `origin/staging` is absent. STOP if an existing or pinned
   PR has `base=default` and `head != staging` (feature PR aimed at `main`).
   No PR found (no argument case) → create a **draft** PR against `staging`
   for a feature head, or against the default branch when head is `staging`
   (unless head is the default branch), re-fetch, then continue.
4. Run promotion prep only if the resolved PR's base is the default branch —
   aggregate closing trailers, inject the link if missing.
5. Leave the PR a draft. Do not request review. If it is not a draft, run
   `gh pr ready --undo <n>` on the resolved PR. Do not post `@coderabbitai review` and do not poll.
   Agents do not run `/ready-merge-release`.
6. Report checks advisorily. Other jobs may stay gated until the QA bot
   marks the PR ready.
7. Never merge, never mark a PR ready, never call Linear MCP, never
   force-push without explicit ask.

</instructions>

<constraints>
- Be concrete and specific.
- **No `gh pr merge`, ever.** Merging is the operator's job in the GitHub UI.
- **No Linear MCP calls, ever.** This command does not request review.
  Never `save_comment`/`save_issue`.
- **No `gh pr ready <n>`.** Do not mark a PR ready. The only readiness
  write is `gh pr ready --undo <n>` on the resolved PR, to return an already-ready PR to draft.
  Agents do not run `/ready-merge-release`. The QA bot `ralfcam` runs
  UAT, digests the agent transcript, and does not post a review trigger.
  Readiness is the CLI evidence on the head plus that UAT.
- **DO NOT `git push`, `gh pr create`/`edit`, or instruct merge unless
  `pnpm lint; pnpm typecheck; pnpm test:unit` executed green this turn** (AC-1312-1).
- **On lint + typecheck + test:unit red, classify-and-handoff only** (AC-1312-2). Do not run
  `pnpm format` / `next lint --fix`, do not commit, do not invent a
  remediator agent. Operator next MUST be the paste-ready recipe for the
  classified label (command + required argument + then `/push`). **Forbidden
  next-strings:** `fix lint+typecheck+test:unit, then re-run /push`; `/sdd-to-tdd` with no
  argument; `/capture …`; `/audit` as the default for a gate red.
- DO NOT force-push unless the operator explicitly asks.
- **Auto-create is narrow:** create a PR only on the no-argument path when
  `gh pr list --head <current-branch>` returns none, `origin/staging` exists
  (`git ls-remote --exit-code --heads origin staging`), head is not the
  default branch, and Step 2 has published the remote head. Base is
  `staging` for any non-default, non-`staging` head; `staging` still bases
  to the default branch. Create **draft** PRs only — always `--draft`, so no
  ready-gated Actions job runs until the QA bot marks it ready. Agents do
  not run `/ready-merge-release`. Never auto-create when a PR was pinned
  by URL/number. Never
  open a self-PR when head equals the default branch; stop and report
  instead. Draft-eligible CodeRabbit review runs before ready-gated Actions
  jobs. Derive feature-PR title/body from `git log origin/staging...HEAD`.
  STOP (do not promotion-prep) when an existing or pinned PR has
  `base=default` and `head != staging`.
- DO NOT operate on a PR that is not OPEN. DO NOT overwrite the PR's existing
  title or body — append-only, and only when the aggregated IDs aren't already
  closing-linked. DO NOT fabricate issue IDs — only report what `gh` actually
  returned. Do not pre-inject `## Linear close-out` at create time; Step 4
  owns that.
- **Do not request review.** This command posts no pull-request comment
  and does not run `gh pr edit --add-reviewer`.
- **Promotion prep is conditional, not argument-gated** — run it whenever the
  resolved PR's base is the default branch, regardless of whether the PR was
  pinned by argument or auto-discovered; skip it (with a note) whenever the
  base is not the default branch.
- DO NOT retry or "fix" a failed automation by moving the issue yourself — the
  fallback is the operator acting **in the Linear UI directly**, never via
  `linear-resolver` or any agent `save_issue` call.
- Never update git config.
</constraints>

<output_format>
Tone: professional and actionable. Length: concise.

Exactly these sections:

1. **Whole-suite gate** — `pnpm lint; pnpm typecheck; pnpm test:unit` `green (executed)` | `stopped — lint+typecheck+test:unit red: <label> (<class>)` plus the owning files / tests / advisories from this run (Prettier list, lint rule+file, typecheck location, failing test, coverage path+metric, or GHSA+package). On stop, remaining sections are `n/a — stopped at whole-suite gate`.
2. **Push** — commits pushed (branch, commit count) | "already up to date" | "skipped — pinned PR's head is a different branch" | "stopped — CodeRabbit CLI routed findings (fix round <n> of 2)" ; CLI: `clean` | `findings routed` | `leftover listed` | `unavailable recorded`.
3. **PR** — number, title, `<head> → <base>`, state, draft | `created — draft #N, title, <head> → <base>` | "stopped — head is the default branch; cannot open a self-PR" | "stopped — `origin/staging` is absent" | "stopped — feature PR #<n> bases to the default branch (`<head> → <default>`); this command does not promotion-prep a main-based feature PR" | "stopped — `gh pr create` failed: <error>".
4. **Promotion prep** — "ran — <aggregated `Fixes RES-###[, ...]` line, or "none found in this PR's commits">; link status: already linked | injected — <diff summary> | not applicable — no trailers to inject" | "skipped — base is not the default branch (feature PR into staging closes on merge)" | "n/a — no PR" (only if Step 3 stopped).
5. **Draft** — "left a draft" | "returned to draft — `gh pr ready --undo <n>`" | "n/a — no PR". Agents do not run `/ready-merge-release`.
6. **Checks** (advisory; omit if no PR) — "none — draft PR; CodeRabbit review may still be in progress and remaining checks start after readiness" | each observed check `green` | `pending` | `failing` — never blocks this command, but warn if not all green. Local lint + typecheck + test:unit is Step 1, not this section.
7. **Linear expectations** — In Progress fires from the draft/open PR this command creates or updates (until then the issue may remain Todo); In Review on review request/activity or ready-for-merge; Done only after operator merge of a closing-linked PR — no state write performed by this command.
8. **Operator next** — "draft PR open — the CLI gate already passed on this head; QA bot `ralfcam` runs UAT and digests the transcript; readiness is that CLI evidence plus the UAT; agents do not run `/ready-merge-release`; merge only on `APPROVED FOR OPERATOR MERGE`" | "fix create failure / move work off the default branch / restore `origin/staging` / retarget the main-based feature PR onto `staging`, then re-run `/push`" (only when Step 3 stopped) | on Step 1 stop: the **paste-ready recipe for the classified class** from the Step 1 table (command + required argument + then `/push`) — never `fix lint+typecheck+test:unit, then re-run /push` | on Step 1b `action: route`: the paste-ready `/sdd-to-tdd` and/or `/capture` fences, then `/commit`, then `/push`.
   </output_format>
   </instructions>
   </output>

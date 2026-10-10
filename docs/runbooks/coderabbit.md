# CodeRabbit runbook (US Team)

**Status:** Draft  
**Last updated:** 2026-10-09

This repository uses **one** CodeRabbit installation: **US Team**. The
Cloud `install` helper stays paused. `/push` runs one local CLI pass over
the committed branch diff against `origin/staging` after the cursor-head
firewall has finalized `HEAD` and before `git push`.
`/commit` and `/sdd-to-tdd` STEP 4G do not spawn the CLI. Pull request
reviews still come from **`coderabbitai`** (App ID `347564`) when a formal
review runs. `/push` posts no pull-request comment. A missing binary is
`cli_missing` and a reported version other than the pin is
`version_mismatch`; the branch-diff pass runs
`.cursor/cloud-install-coderabbit.sh` and then re-reads version and
auth. An unavailable CLI result retries once, and that retry runs the
helper again when the reason is still `cli_missing` or `version_mismatch`.
If it is still unavailable, `/push` stops with `blocked_cli_unavailable`
and does not push. The PR body records `## CodeRabbit CLI evidence` with `Head:` and
`attemptStatus:` for that SHA. `/push` is the agent's only CodeRabbit gate:
Critical, Major, and unknown findings go to `/sdd-to-tdd`, Minor and
Trivial go to `/capture`. `--fix-round` is a counter capped at 2, so three
CLI passes at most. Pass 1 routes every finding. Pass 2 routes only
Critical, Major, and unknown findings; Minor and Trivial on that pass are
captured and the branch pushes with no third pass. Pass 3 does not push
when a Critical, Major, or unknown finding is still open: it stops and
reports `blocked_major_findings`. Those findings are not leftovers and
are not ledgered. Only Minor and Trivial may be captured and pushed.
The PR is left a **draft**, and that draft has already passed this CLI
gate for the head that was pushed.
Agents, `/conduct`, and Cloud runs do not call `/ready-merge-release`, do
not run `gh pr ready`, do not post `@coderabbitai review`, and do not poll
for a remote review. The QA bot `ralfcam` runs UAT, digests the agent transcript, and does not post a review trigger. Readiness is a clean gate
receipt for that head plus that UAT. `/ready-merge-release` is that
operator/QA command. It does not post a review trigger. On 2026-10-09 the
cursor GitHub App token received HTTP 403 `Resource not accessible by
integration` creating an issue comment on pull request 201, so an agent
trigger never reached CodeRabbit and was dropped. Nobody posts one. The
verdicts in the rest of this section belong to that operator/QA command.
Agents do not poll and do not wait on them.
`/ready-merge-release` pauses for a second review only when
an automated review is in progress on a non-bot draft's latest commit.
When no review is running and there is no bot-skip notice, it goes
straight to `ready_no_coderabbit_review` with no blind wait: it marks the
draft ready and tries an operator comment that does not request a
CodeRabbit review. A bot-skip notice ("Review skipped" and "Bot user
detected") does not expect a formal review, and only when that notice
names the head SHA. A notice with no SHA matches no head.
`ready_cli_evidence` is the ignored gate receipt for that same head with
`attemptStatus: clean`. PR body text, including `findings` and
`unavailable`, is not that receipt. A matching bot skip without the
clean receipt stays blocking `coderabbit_review_skipped`. That decision
is made before `stale_approval`. Non-bot `stale_approval` still becomes
`ready_cli_evidence` only when that same receipt is `clean`.
An expired `review_in_progress` wait is carried as
`ready_no_coderabbit_review` only when there is no bot-skip notice. With
a skip notice it becomes `coderabbit_review_skipped` or
`ready_cli_evidence`. Step 4 does not start a second unbounded wait.
Formal reviews that already exist on a non-bot PR, threads, HEAD
identity, and required checks still apply. A 403 on that comment
(missing `issues: write`) is non-fatal; the note goes on the PR body or in
the agent report. Actionable findings that do exist, including a
`COMMENTED` review body with actionable comments, still block into
`/capture`. Quiet-mode walkthrough bodies are not findings. CLI pin
`0.9.0` stays in `.cursor/cloud-install-coderabbit.sh`. Release `0.7.6`
has no `SHA256SUMS.sig`. `/push` runs that
helper once when the branch-diff pass sees `cli_missing` or
`version_mismatch`. The Cloud `environment.json` install still does not
call the helper. When the CLI runs, it must
authenticate against [app.coderabbit.ai](https://app.coderabbit.ai) with
`"region":"us"`.

Repository YAML: [`.coderabbit.yaml`](../../.coderabbit.yaml). Cloud install
is [`.cursor/environment.json`](../../.cursor/environment.json) without
[`.cursor/cloud-install-coderabbit.sh`](../../.cursor/cloud-install-coderabbit.sh).
Do not commit API keys or `.env*` files.

CodeRabbit complements specs, Red/Green/Refactor, executed tests, `/audit`,
`/triage`, and the operator merge decision. It does not replace them.

## Keep only the US installation

1. In GitHub **Settings → Applications → Installed GitHub Apps**, confirm
   the US CodeRabbit GitHub App (`coderabbitai`, App ID `347564`) is
   installed on `ralfcam/restaurant-system`.
2. In the US dashboard
   ([app.coderabbit.ai](https://app.coderabbit.ai)), confirm this
   repository is connected and billed on the **Team** plan with a seat.
3. Local CLI: `cr --version` must print `0.9.0`. `cr auth status --agent`
   must report `"region":"us"`. If it does not, re-authenticate to US.
4. GitHub App identity on this repository is US `coderabbitai`
   (`347564`). YAML does not prove the live App. Check a recent commit:

```powershell
gh api repos/ralfcam/restaurant-system/commits/<sha>/check-suites --jq '.check_suites[] | {app_id: .app.id, app_slug: .app.slug}'
```

The G-CR3 release gate is that US allow-list. Non-US CodeRabbit-shaped
identity on reviews, check runs/suites, review threads, issue comments,
or inline review comments is `wrong_bot` before unresolved-thread
routing. `eu_bot_activity` is retired.

Dashboard steps that still need the canary PR (ruleset, draft skip,
latest-head approval) are listed under
[Canary and GitHub ruleset](#canary-and-github-ruleset). Connect **US Linear**
team `RES` (display name Restaurant Link) to **Review Base Scope** in the US
dashboard. Do not treat YAML alone as proof Linear Review Base Scope is
connected.

## Windows (operator laptop)

Install is per-user; administrator rights are not required.

Pin the Windows installer to CodeRabbit CLI 0.9.0 (`cr --version`
prints `0.9.0`; do not set a leading `v`. Release `0.7.6` has no
`SHA256SUMS.sig`):

```powershell
$env:CODERABBIT_VERSION = '0.9.0'
irm https://cli.coderabbit.ai/install.ps1 | iex
Remove-Item Env:CODERABBIT_VERSION
```

The installer writes `coderabbit.exe` and `cr.exe` to
`%LOCALAPPDATA%\Programs\coderabbit` and updates the **user** `PATH`. Open a
**new** PowerShell window so `PATH` reloads, then:

```powershell
coderabbit --version
cr --version
cr auth login --region us
cr auth status --agent
```

If this session still cannot resolve `cr`, call the executable directly:

```powershell
& "$env:LOCALAPPDATA\Programs\coderabbit\cr.exe" auth status --agent
```

If the installer offers browser sign-in **without** asking for a region,
that is the US default. Confirm `cr auth status --agent` still reports
`"region":"us"`. Always sign in with `cr auth login --region us`.

Validate repository YAML (needs outbound HTTPS to the schema host):

```powershell
cr config validate
```

Exit `0` is schema-valid. Exit `1` is missing, unreadable, or invalid YAML.

## Agentic API key (Cloud / headless)

Cloud `install` does not run the helper. The dirty-tree work-order path
still records `cli_paused` without spawning `coderabbit`. `/push`
`--branch-diff` actually runs the CLI when a key is present; if the CLI
is still unavailable after one retry, `/push` stops with
`blocked_cli_unavailable` and does not push. The notes below are the
auth and resume path.

Browser OAuth does not persist into Cursor Cloud. Provision an **Agentic**
API key (not a user API key) from the **US** account:

[https://app.coderabbit.ai/settings/api-keys](https://app.coderabbit.ai/settings/api-keys)

Store it only as a Cursor Cloud secret named **`CODERABBIT_API_KEY`**
on the [Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents)
(Secrets tab). Never put it in `.cursor/environment.json`,
`.coderabbit.yaml`, git, or chat.

Cloud `install` is exactly the paused command (the helper is not invoked):

```
corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile
```

The helper sets `CI=1` so the installer skips the interactive login prompt,
pins `CODERABBIT_VERSION=0.9.0` (reinstalls when `coderabbit --version` is
not `0.9.0`), and always runs:

```sh
coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"
coderabbit auth status --agent
```

Missing `CODERABBIT_API_KEY`, failed login, or a status that is not
`"authenticated":true` with `"region":"us"` fails the Cloud install. Do not
skip login when the key is absent, and do not use
`coderabbit auth status --agent || true`.

Headless login on any Linux runner (same commands as the helper):

```sh
coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"
coderabbit auth status --agent
```

One-off review without storing the key:

```sh
coderabbit review --region us --api-key "$CODERABBIT_API_KEY" --agent
```

`--region` on `review` is only valid together with `--api-key`. A saved US
login does not need either flag on later commands.

## Team dashboard settings

Configure these in the **US** org/repository UI so they match
`.coderabbit.yaml`:

| Setting                                | Value                                                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review profile                         | Quiet                                                                                                                                                                                 |
| Automatic reviews                      | On for the default branch and `staging`                                                                                                                                               |
| Draft PRs                              | Review (parsed `drafts: true` boolean); comment-only `# drafts: true` does not; `/ready-merge-release PR#` owns the clean-pass readiness transition                                   |
| Incremental reviews                    | On, pause after **20** reviewed commits                                                                                                                                               |
| Request changes workflow               | On (approve when comments are resolved, latest head is reviewed, and pre-merge checks are not failing)                                                                                |
| Linear knowledge                       | Enabled for team key **`RES`** (display name is informational)                                                                                                                        |
| Chat → Linear issue creation           | **Disabled**                                                                                                                                                                          |
| MCP knowledge                          | Disabled; add no MCP connections                                                                                                                                                      |
| ast-grep                               | Essentials only; no custom rule directories                                                                                                                                           |
| Docstring pre-merge check              | Off                                                                                                                                                                                   |
| Title / description / issue assessment | Warning until canary; then `error` for checks that stayed accurate                                                                                                                    |
| Custom pre-merge checks                | Warning until canary; same promotion rule                                                                                                                                             |
| CodeRabbit Plan                        | Opt-in, repository-pinned advisory research. Auto-planning stays **off**. A plan does not authorize `/dispatch` scheduling, replace `docs/specs/**`, or change Linear workflow state. |
| CodeRabbit Triage                      | PR review queue only. It is **not** Linear issue triage (`/triage`).                                                                                                                  |

Connect **US Linear** and add the connection to **Review Base Scope** for
team `RES`. Knowledge context is allowed. Chat-driven `create a Linear
issue` must stay off so filing floors, deduplication, and the Linear
single-writer rules still apply.

## Network

US CLI needs outbound HTTPS/WSS on TCP 443 to:

- `cli.coderabbit.ai` (install/update)
- `app.coderabbit.ai` (auth/API)
- `ide.coderabbit.ai` (hosted review)
- `www.coderabbit.ai` (`cr config validate` schema)

Require those US hosts. A firewall that omits them will fail US review.

## Recovery

Missing `CODERABBIT_API_KEY`, failed login, or non-US status:

1. Create a US Agentic key at
   [https://app.coderabbit.ai/settings/api-keys](https://app.coderabbit.ai/settings/api-keys)
   (a US-org Agentic key, not a user API key).
2. Store it as the Cursor Cloud secret named **`CODERABBIT_API_KEY`** at
   [https://cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
   (Secrets tab).
3. Resume the paused helper by making `install` this command:

```
corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh
```

The helper equivalent is:

```sh
coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"
coderabbit auth status --agent
```

### Auth / wrong region

`cr auth status --agent` shows `region`. If it is not `"us"` or
authentication fails with a wrong-region recovery command, run:

```powershell
cr auth login --region us
cr auth status --agent
```

On Cloud / headless Linux, use
`coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"`
then `coderabbit auth status --agent`. Confirm the Agentic key was created
under the US org. User API keys are rejected by the CLI.

### Rate limit

Team allowance is metered per developer, and incremental reviews count.
`.coderabbit.yaml` pauses incremental review after **20** reviewed commits
(not 2) so a typical feature PR keeps getting HEAD reviews. After that
pause, exact-context US SUCCESS (`REQUIRED_US_STATUS_CONTEXT`, US
creator when present) or an `isUsApp` check-run or check-suite on HEAD
(CodeRabbit label `name` or `app.name`) without a new
review is `incremental_paused`: leftover threads go to `/capture` and
`/ready-merge-release` may PASS. If CodeRabbit reports a rate limit, wait for the reset time
before relying on another review. The `/push` CLI pass retries once and,
if still unavailable, stops with `blocked_cli_unavailable` and does not
push; G-CR3 remains blocked. Do **not** substitute a manual review, and
do **not** treat a passing **Review rate limited** GitHub check as approval.

### Billing confirmation

If the CLI or GitHub check asks for a billing/usage confirmation, resolve
billing in the US dashboard, then re-run. The `/push` CLI pass retries once and,
if still unavailable, stops with `blocked_cli_unavailable` and does not
push; G-CR3 remains blocked. Do not report billing as a clean review.

### Missing `cr` on Windows

Open a new PowerShell window. If `Get-Command cr` is still empty, the
user `PATH` did not pick up `%LOCALAPPDATA%\Programs\coderabbit` — rerun the
installer rather than copying the exe by hand.

### Wrong CLI version

`coderabbit --version` / `cr --version` must print `0.9.0`. Reinstall:

```powershell
$env:CODERABBIT_VERSION = '0.9.0'
irm https://cli.coderabbit.ai/install.ps1 | iex
Remove-Item Env:CODERABBIT_VERSION
```

Linux / Cloud:

```sh
CODERABBIT_VERSION=0.9.0 curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

`CODERABBIT_VERSION=v0.9.0` and unsigned `0.7.6` 404 on `cli.coderabbit.ai`.

### Cloud Build has CLI but reviews fail with 401

The CLI install is paused, so this does not apply to the current snapshot.
On resume, the secret was missing at install time, or the key is not a US
Agentic key. Set `CODERABBIT_API_KEY` and re-run:

```
corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh
```

or run

```sh
coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"
coderabbit auth status --agent
```

in the agent VM. `cr doctor` is a connectivity smoke test only; a pass
must show `app.coderabbit.ai` / `ide.coderabbit.ai` and does not by itself
prove an authenticated US review.

## Live verification

Do not infer these from YAML. Re-run the commands.

| Check                    | Command / where                                                          | Required                                                                           |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| CLI pin                  | `cr --version`                                                           | `0.9.0`                                                                            |
| YAML                     | `cr config validate`                                                     | exit 0                                                                             |
| Local region             | `cr auth status --agent`                                                 | `"region":"us"`                                                                    |
| US hosts                 | `cr doctor`                                                              | `app.coderabbit.ai` / `ide.coderabbit.ai`                                          |
| Team billing             | US dashboard + `cr auth status`                                          | billed plan with assigned seat (live CLI: Advanced trial, seat assigned; not Free) |
| Cloud secret             | [Cursor Cloud Agents secrets](https://cursor.com/dashboard/cloud-agents) | `CODERABBIT_API_KEY` present (never print it)                                      |
| US GitHub App            | GitHub Settings → Installed GitHub Apps                                  | `coderabbitai` App `347564`                                                        |
| Linear Review Base Scope | US dashboard → Linear → Review Base Scope                                | team key `RES`                                                                     |

## Factory gates

`/push` must run
`node .cursor/checks/coderabbit-gate.mjs --branch-diff --base origin/staging`
and write an ignored audit receipt under `.cursor/hooks/state/`. The attempt
records `attemptStatus` as `clean`, `findings`, or `unavailable` with a
stable `reason`. Critical, Major, and unknown findings route to
`/sdd-to-tdd`; Minor and Trivial route to `/capture` by severity, including
in-scope Minor and Trivial. `--fix-round` is a counter capped at 2.
Pass 1 routes every finding. Pass 2 routes only when `/sdd-to-tdd`
findings remain; Minor and Trivial on that pass capture-and-push with no
third pass. Pass 3 stops with `blocked_major_findings` when a Critical,
Major, or unknown finding is still open and does not push those. Only
Minor and Trivial capture-and-push. The counter is kept
across its fix commits via `--fix-round` or the leftover record. On
`route`, printed `fixRound` is the started round. After a successful
`git push`, `--ack-push` clears the saved cycle. `runCr` uses an absolute
deadline as well as inactivity and records `unavailable` / `timeout` on
either expiry. Auth `--version` and `auth status --agent` use the same
finite timeout. A failed `git diff` for
`--branch-diff` records `unavailable` / `diff_failed` and still pushes. A
`--branch-diff` `secret_path` and a non-zero gate exit still push.
`.env.example` is not a secret. A successful empty diff stays `clean`.
An unavailable CLI result (`error`, `version_mismatch`, `timeout`, and the
same class) retries once, reinstalling pinned `0.9.0` when the reason is
`cli_missing` or `version_mismatch`. If it is still unavailable, `/push`
stops with `blocked_cli_unavailable` and does not push. File-list aliases
(`reviewedFiles`, `files`, `filesToReview`) are still inspected independently
so parsing failures remain visible in the receipt. `/sdd-to-tdd` STEP 4G
and `/commit` do not run the CLI.

Missing/malformed work orders, secret paths, unrelated dirty paths, no
reviewable paths, and changed bytes are hard failures. The command re-hashes
the scoped dirty set after every attempt and exits non-zero on byte drift.
Receipts never authorize `gate open`, `git commit`, `/commit`, or `/push`; a
missing or stale receipt is non-blocking, and a successful commit does not
mutate or rebind it. Do not write the receipt into
`docs/verifier-reports/tdd/**`. G-CR2 defers the CLI pin to G-CR1.

CodeRabbit reviews draft PRs. G-CR3 is a US allow-list:
`coderabbitai[bot]` (App `347564`) on current HEAD. Non-US
CodeRabbit-shaped identity on reviews, check runs/suites, review
threads, issue comments, or inline review comments is `wrong_bot`
before unresolved-thread routing. Unresolved US threads whose path is
under `.cursor/plans/` or whose `isOutdated` is boolean `true` are
process-meta; they do not fail as
`unresolved_threads` and do not appear in routed findings. An unresolved
non-outdated US thread on any other path still fails closed. When current
HEAD has no ranked US review, in-progress-on-head is checked before
`incremental_paused` and before `stale_approval`. `--review-wait-expired` maps `review_in_progress` to
`ready_no_coderabbit_review`. Under `/ready-merge-release --loop` only, a current-HEAD US `CHANGES_REQUESTED` review with no remaining unresolved product thread and at least one resolved non-outdated US product thread is reason `captured_threads_resolved` and is a clean preflight. Under `--loop` only, exempt `.cursor/plans/` threads and review-body findings that all route to `/capture` are reason `capture_only_findings` (one `/capture` fence per finding, then Step 2 is clean and the draft is readied). A collected finding that routes to `/sdd-to-tdd` is reason `changes_requested_body_findings` and routes to `/sdd-to-tdd`. A QA operator running `/ready-merge-release` treats `capture_only_findings` as a clean loop preflight. That operator may post one ledger reply on each open product thread only when that finding is already an open `docs/findings/` line, using `addPullRequestReviewThreadReply` and `resolveReviewThread`, does not post a `@coderabbitai` command, and may run `/ready-merge-release <PR> --loop` again. `/conduct` does not. Without `--loop`, `CHANGES_REQUESTED` on the current HEAD still fails closed. `eu_bot_activity` is retired. Pin
the exact `wrong_bot` reason, not only `ok: false`. Run
`/ready-merge-release PR#`. Adapter `incremental_paused` leftovers (any
severity) go to `/capture` and Step 2 is clean. Otherwise Critical/Major
and unknown-severity findings route to `/sdd-to-tdd`, while Minor/Trivial
findings route to `/capture` with provenance
`coderabbit/PR/<head>/<finding-id>`, then `/triage`.
Step 2 executable `/sdd-to-tdd` and `/capture` lines use opaque
`<local-ref>` only; remote finding-id, path, title, and severity stay
inert prose after those fences.
Immediately before `gh pr ready`, the command re-reads `headRefOid`
and MUST NOT mutate when it differs from `preReadyHead`. On a clean
latest-head preflight it then runs `gh pr ready`. If post-ready
`headRefOid` differs from `preReadyHead` AND this invocation executed
`gh pr ready`, it runs `gh pr ready --undo` then STOP. If Step 3
performed no mutation (already-ready), HEAD drift MUST STOP with no
`--undo`. It re-checks the unchanged ready HEAD and required checks, and
returns `APPROVED FOR OPERATOR MERGE`; the operator still merges. The GitHub Actions job `CodeRabbit US latest-head gate` is paused (`if: false`) and does not review; that check is not required. The adapter exhausts paginated
reviews, comments, checks, review threads, and commit statuses
(`GET /commits/{sha}/status` via `ghJsonPages` field `statuses`), then re-GETs the PR and fails
closed with `head_changed` if `head.sha` moved. If SHA matches but `head.ref`,
`base.ref`, or `draft` differ from the initial pull, it fails closed with
`pull_changed`. The CLI maps `pull_changed` like `head_changed`. Allowed shapes are a feature PR
into `staging` (`head` is neither `staging` nor `main`) or the promotion PR
(`staging → main`). Missing, empty, or whitespace `base` or `head` is
`wrong_base_head` (including `base=staging` with empty head). Any other shape,
including `main → staging`, fails `wrong_base_head`. Parsed
`.coderabbit.yaml` `reviews.auto_review.drafts`
must be boolean `true`; a comment-only `# drafts: true` does not enable draft
review. GitHub Actions does not accept
`pull_request_review_thread` (webhook-only). The paused job does not review.
Never `@coderabbitai approve`, `resolve`, or
`ignore pre-merge checks`.

## Canary and GitHub ruleset

Operator-owned; YAML does not create GitHub rulesets. Direct pushes to
`staging` stay intact.

1. Draft feature PR into `staging` (`head` is neither `staging` nor `main`):
   prove only `coderabbitai` responds,
   `drafts: true` reviews the draft HEAD, org-wide Linear Base Scope supplies
   knowledge while repo YAML limits context to team `RES`, severity routing
   is accurate, and `/ready-merge-release PR#` alone readies a clean PR.
2. Bootstrap-promote `.github/workflows/coderabbit-main-gate.yml` and
   `.coderabbit.yaml` onto `main` under the current unprotected state with
   operator review.
3. After the workflow exists on `main`, create an active **`main`** ruleset:
   PR required; one approval; stale approvals dismissed; latest push
   approval required; conversations resolved; required `CodeRabbit`
   context pinned to US App ID `347564`. The Actions job
   `CodeRabbit US latest-head gate` is paused (`if: false`) and that check
   is not required; no App/admin bypass. Keep direct `staging` pushes intact. Do not require
   the intentionally passing **Review rate limited** check.

   ```powershell
   $payload = @{
     name = "main US CodeRabbit promotion"
     target = "branch"
     enforcement = "active"
     bypass_actors = @()
     conditions = @{
       ref_name = @{
         include = @("refs/heads/main")
         exclude = @()
       }
     }
     rules = @(
       @{
         type = "pull_request"
         parameters = @{
           required_approving_review_count = 1
           dismiss_stale_reviews_on_push = $true
           require_code_owner_review = $false
           require_last_push_approval = $true
           required_review_thread_resolution = $true
           allowed_merge_methods = @("merge", "squash", "rebase")
         }
       }
       @{
         type = "required_status_checks"
         parameters = @{
           strict_required_status_checks_policy = $true
           do_not_enforce_on_create = $false
           required_status_checks = @(
             @{ context = "CodeRabbit"; integration_id = 347564 }
           )
         }
       }
       @{ type = "non_fast_forward" }
     )
   }
   $payload | ConvertTo-Json -Depth 8 | gh api --method POST repos/ralfcam/restaurant-system/rulesets --input -
   ```

4. Promote only accurate pre-merge checks from `warning` to `error`, then
   use that config change as the protected second promotion canary. The
   read-only adapter review remains: it fail-closes `wrong_bot` on non-US
   CodeRabbit-shaped identity, fails stale HEAD or unresolved US threads
   (except `.cursor/plans/` work-orders or outdated leftovers), treats a
   missing formal review as `ready_no_coderabbit_review`, ignores quiet-mode
   walkthrough bodies, and passes on clean US approval of current HEAD or on
   `changes_requested_meta_only`. The Actions job
   `CodeRabbit US latest-head gate` is paused (`if: false`) and is not a
   required check. `/ready-merge-release` returns
   `APPROVED FOR OPERATOR MERGE` from that adapter review. The paused job
   stays outside that verdict. Prove rate-limit enforcement with fixtures,
   not by exhausting quota.
5. Before the Advanced trial expires, select Team and repeat the
   plan/seat/feature-access smoke checks.

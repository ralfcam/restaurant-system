# CodeRabbit runbook (US Team)

**Status:** Draft  
**Last updated:** 2026-09-16

This repository uses **one** CodeRabbit installation: **US Team**. Local
CLI review and Cloud Agent reviews must authenticate against
[app.coderabbit.ai](https://app.coderabbit.ai) with `"region":"us"`. Pull
request reviews come from **`coderabbitai`** (App ID `347564`). CLI pin is
`0.7.6`.

Repository YAML: [`.coderabbit.yaml`](../../.coderabbit.yaml). Cloud CLI
install: [`.cursor/environment.json`](../../.cursor/environment.json) plus
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
3. Local CLI: `cr --version` must print `0.7.6`. `cr auth status --agent`
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

Pin the Windows installer to CodeRabbit CLI v0.7.6 (`cr --version`
prints `0.7.6`; do not set `CODERABBIT_VERSION=v0.7.6`):

```powershell
$env:CODERABBIT_VERSION = '0.7.6'
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

Browser OAuth does not persist into Cursor Cloud. Provision an **Agentic**
API key (not a user API key) from the **US** account:

[https://app.coderabbit.ai/settings/api-keys](https://app.coderabbit.ai/settings/api-keys)

Store it only as a Cursor Cloud secret named **`CODERABBIT_API_KEY`**
on the [Cloud Agents dashboard](https://cursor.com/dashboard/cloud-agents)
(Secrets tab). Never put it in `.cursor/environment.json`,
`.coderabbit.yaml`, git, or chat.

Cloud `install` is exactly:

```
corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh
```

The helper sets `CI=1` so the installer skips the interactive login prompt,
pins `CODERABBIT_VERSION=0.7.6` (reinstalls when `coderabbit --version` is
not `0.7.6`), and always runs:

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
3. Re-run:

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
before relying on another review. Local 4G records `unavailable` and
continues; G-CR3 remains blocked. Do **not** substitute a manual review, and
do **not** treat a passing **Review rate limited** GitHub check as approval.

### Billing confirmation

If the CLI or GitHub check asks for a billing/usage confirmation, resolve
billing in the US dashboard, then re-run. Local 4G records `unavailable` and
continues; G-CR3 remains blocked. Do not report billing as a clean review.

### Missing `cr` on Windows

Open a new PowerShell window. If `Get-Command cr` is still empty, the
user `PATH` did not pick up `%LOCALAPPDATA%\Programs\coderabbit` — rerun the
installer rather than copying the exe by hand.

### Wrong CLI version

`coderabbit --version` / `cr --version` must print `0.7.6`. Reinstall:

```powershell
$env:CODERABBIT_VERSION = '0.7.6'
irm https://cli.coderabbit.ai/install.ps1 | iex
Remove-Item Env:CODERABBIT_VERSION
```

Linux / Cloud:

```sh
CODERABBIT_VERSION=0.7.6 curl -fsSL https://cli.coderabbit.ai/install.sh | sh
```

`CODERABBIT_VERSION=v0.7.6` 404s on `cli.coderabbit.ai`.

### Cloud Build has CLI but reviews fail with 401

The secret was missing at install time, or the key is not a US Agentic
key. Set `CODERABBIT_API_KEY` and re-run:

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
| CLI pin                  | `cr --version`                                                           | `0.7.6`                                                                            |
| YAML                     | `cr config validate`                                                     | exit 0                                                                             |
| Local region             | `cr auth status --agent`                                                 | `"region":"us"`                                                                    |
| US hosts                 | `cr doctor`                                                              | `app.coderabbit.ai` / `ide.coderabbit.ai`                                          |
| Team billing             | US dashboard + `cr auth status`                                          | billed plan with assigned seat (live CLI: Advanced trial, seat assigned; not Free) |
| Cloud secret             | [Cursor Cloud Agents secrets](https://cursor.com/dashboard/cloud-agents) | `CODERABBIT_API_KEY` present (never print it)                                      |
| US GitHub App            | GitHub Settings → Installed GitHub Apps                                  | `coderabbitai` App `347564`                                                        |
| Linear Review Base Scope | US dashboard → Linear → Review Base Scope                                | team key `RES`                                                                     |

## Factory gates

Local close-out (`/sdd-to-tdd` STEP 4G) must run
`node .cursor/checks/coderabbit-gate.mjs` and write an ignored audit receipt
under `.cursor/hooks/state/`. The attempt records `attemptStatus` as `clean`,
`findings`, or `unavailable` with a stable `reason`. Findings at every severity
and authentication/setup failure, rate limit, billing, timeout, skipped
review, malformed/partial JSONL, and reviewed-file/scope mismatch are advisory:
the attempt exits zero and close-out continues. File-list aliases
(`reviewedFiles`, `files`, `filesToReview`) are still inspected independently
so parsing failures remain visible in the receipt.

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
non-outdated US thread on any other path still fails closed. `eu_bot_activity` is retired. Pin
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
returns `APPROVED FOR OPERATOR MERGE`; the operator still merges. `staging → main` additionally requires the GitHub check
`CodeRabbit US latest-head gate`. The workflow re-runs on PR sync, `pull_request` `edited` (title/body or
base retarget), review submit/dismiss, and review comments, and executes the
checker from the base
branch SHA rather than PR-controlled code. The adapter exhausts paginated
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
`pull_request_review_thread` (webhook-only); after resolving threads with no
other event, re-run that check. Never `@coderabbitai approve`, `resolve`, or
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
   context pinned to US App ID `347564`; required check
   `CodeRabbit US latest-head gate` (GitHub Actions app `15368`); no
   App/admin bypass. Keep direct `staging` pushes intact. Do not require
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
             @{ context = "CodeRabbit US latest-head gate"; integration_id = 15368 }
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
   custom gate must be pending before review, fail-close `wrong_bot` on
   non-US CodeRabbit-shaped identity, fail stale HEAD or unresolved US
   threads (except `.cursor/plans/` work-orders or outdated leftovers), and pass only on clean US approval of current HEAD. Prove
   `/ready-merge-release` withholds its operator-merge verdict until the
   post-ready check is green. Prove rate-limit enforcement with fixtures,
   not by exhausting quota.
5. Before the Advanced trial expires, select Team and repeat the
   plan/seat/feature-access smoke checks.

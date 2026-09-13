# CodeRabbit runbook (US Team)

**Status:** Draft  
**Last updated:** 2026-09-13

This repository uses **one** CodeRabbit installation: **US Team**. The EU
GitHub App, EU CLI region, and EU Agentic API keys are out of scope. Local
CLI review and Cloud Agent reviews must authenticate against
[app.coderabbit.ai](https://app.coderabbit.ai). Pull request reviews come
from **`coderabbitai`**, not the EU `coderabbiteu` bot.

Repository YAML: [`.coderabbit.yaml`](../../.coderabbit.yaml). Cloud CLI
install: [`.cursor/environment.json`](../../.cursor/environment.json) plus
[`.cursor/cloud-install-coderabbit.sh`](../../.cursor/cloud-install-coderabbit.sh).
Do not commit API keys or `.env*` files.

CodeRabbit complements specs, Red/Green/Refactor, executed tests, `/audit`,
`/triage`, and the operator merge decision. It does not replace them.

## Keep only the US installation

1. In GitHub **Settings → Applications → Installed GitHub Apps**, remove
   the **EU** CodeRabbit app (`coderabbiteu`) from
   `ralfcam/restaurant-system` if it is still connected. Keep the **US**
   CodeRabbit GitHub App (`coderabbitai`).
2. In the US dashboard
   ([app.coderabbit.ai](https://app.coderabbit.ai)), confirm this
   repository is connected and billed on the **Team** plan with a seat.
3. Local CLI: `cr --version` must print `0.7.6`. `cr auth status --agent`
   must report `"region":"us"`. If it reports `eu`, re-authenticate (do not
   keep an EU login “just in case”).
4. GitHub App IDs on this repository: keep US `coderabbitai` (`347564`);
   remove EU `coderabbiteu` (`3307191`). YAML does not prove removal. Check
   a recent commit:

```powershell
gh api repos/ralfcam/restaurant-system/commits/<sha>/check-suites --jq '.check_suites[] | {app_id: .app.id, app_slug: .app.slug}'
```

EU `3307191` must be absent from **new** check-suites after uninstall.
Historical commits may still list both.

Dashboard steps that still need the canary PR (ruleset, draft skip,
latest-head approval) are listed under
[Canary and GitHub ruleset](#canary-and-github-ruleset). Connect **US Linear**
team `RES` (display name Restaurant Link) to **Review Base Scope** in the US
dashboard. Do not treat YAML alone as proof the EU app is gone or that
Linear Review Base Scope is connected.

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
`"region":"us"`. Do not run `cr auth login --region eu`.

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
| Draft PRs                              | Skip (`drafts: false`)                                                                                                                                                                |
| Incremental reviews                    | On, pause after **2** reviewed commits                                                                                                                                                |
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

Do not allow-list only the EU hosts (`app.eu.coderabbit.ai`,
`ide.eu.coderabbit.ai`) and expect US reviews to work.

## Recovery

Missing `CODERABBIT_API_KEY`, failed login, or non-US status:

1. Create a US Agentic key at
   [https://app.coderabbit.ai/settings/api-keys](https://app.coderabbit.ai/settings/api-keys)
   (not a user API key, and not an EU-org key).
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

`cr auth status --agent` shows `region`. If it is `eu` or authentication
fails with a wrong-region recovery command, run:

```powershell
cr auth login --region us
cr auth status --agent
```

On Cloud / headless Linux, use
`coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"`
then `coderabbit auth status --agent`. Confirm the Agentic key was created
under the US org, not the EU org. User API keys are rejected by the CLI.

### Rate limit

Team allowance is metered per developer, and incremental reviews count.
`.coderabbit.yaml` pauses incremental review after two reviewed commits to
conserve quota. If CodeRabbit reports a rate limit, wait for the reset time
in that message and re-run. Do **not** substitute a manual review, and do
**not** treat a passing **Review rate limited** GitHub check as approval.

### Billing confirmation

If the CLI or GitHub check asks for a billing/usage confirmation, stop.
Resolve billing in the US dashboard, then re-run. Do not ignore a billing
gate as a clean review.

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

The secret was missing at install time, or the key is EU-region. Set
`CODERABBIT_API_KEY` and re-run:

```
corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh
```

or run

```sh
coderabbit auth login --region us --api-key "$CODERABBIT_API_KEY"
coderabbit auth status --agent
```

in the agent VM. `cr doctor` is a connectivity smoke test only; a pass on
EU hosts (`app.eu.coderabbit.ai`) does not prove an authenticated US review.

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
| EU App gone              | GitHub Settings → Installed GitHub Apps                                  | `coderabbitai` present; no `coderabbiteu`                                          |
| Linear Review Base Scope | US dashboard → Linear → Review Base Scope                                | team key `RES`                                                                     |

## Factory gates

Local close-out (`/sdd-to-tdd` STEP 4G) runs
`node .cursor/checks/coderabbit-gate.mjs` and writes an ignored receipt under
`.cursor/hooks/state/`. `/commit` `gate open` and `git commit` must match that
receipt (`docs-artifact` and `gate-remediation` are the only exempt lanes).
Do not write the receipt into `docs/verifier-reports/tdd/**`.

Ready PRs: `/coderabbit-gate` then the operator merges. `staging → main`
additionally requires the GitHub check `CodeRabbit US latest-head gate`.
In-scope findings return to `/sdd-to-tdd`. Residuals go through `/capture`
with provenance `coderabbit/<local|PR>/<head>/<finding-id>`, then `/triage`.
Never `@coderabbitai approve`, `resolve`, or `ignore pre-merge checks`.

## Canary and GitHub ruleset

Operator-owned; YAML does not create GitHub rulesets. Direct pushes to
`staging` stay intact.

1. Draft feature PR into `staging`: prove only `coderabbitai` responds,
   drafts skip, readying reviews once, org-wide Linear Base Scope supplies
   knowledge while repo YAML limits context to team `RES`, and warning
   checks are accurate.
2. Bootstrap-promote `.github/workflows/coderabbit-main-gate.yml` and
   `.coderabbit.yaml` onto `main` under the current unprotected state with
   operator review.
3. After the workflow exists on `main`, create an active **`main`** ruleset:
   PR required; one approval; stale approvals dismissed; latest push
   approval required; conversations resolved; required `CodeRabbit`
   context pinned to US App ID `347564`; required check
   `CodeRabbit US latest-head gate`; no App/admin bypass. Keep direct
   `staging` pushes intact. Do not require the intentionally passing
   **Review rate limited** check.
4. Promote only accurate pre-merge checks from `warning` to `error`, then
   use that config change as the protected second promotion canary. The
   custom gate must be pending before review, fail stale/wrong-region
   state, and pass only on clean US approval of current HEAD. Prove
   rate-limit enforcement with fixtures, not by exhausting quota.
5. Before the Advanced trial expires, select Team and repeat the
   plan/seat/feature-access smoke checks.

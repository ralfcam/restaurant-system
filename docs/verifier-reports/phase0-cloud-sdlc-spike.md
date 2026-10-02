# Phase 0 — Cloud SDLC platform spike

Recorded: 2026-10-02. Session: local Windows IDE (not a Cursor-managed Cloud VM).
No throwaway Cloud automation was launched: this session has no Automations
editor handoff. Checks below are local probes plus the repo's existing Cloud
hook doctrine. They are not a substitute for a managed VM run.

| # | Check | Result |
| --- | --- | --- |
| 1 | Runtime probe returns `managed` | No. `CURSOR_AGENT_SOCKET` is unset. Not a managed VM. |
| 2 | "Read and follow" command files | Command files are the contract Cloud instructions must name. This session received command text by injection, not by a Cloud automation reading `.cursor/commands/conduct.md`. Unverified in a VM. |
| 3 | Secrets present on a PR-merged run | Unverified. No PR-merged Cloud run. Local shell: `GH_TOKEN` unset, `CODERABBIT_API_KEY` unset. `gh` is logged in via the keyring, which a Cloud VM does not share. |
| 4 | `gh pr create` / `gh pr edit` / `gh pr ready` on a scratch draft | Not executed. Local `gh auth status` succeeds with `repo` scope. Cloud refusal and missing-secret failures remain unverified. No scratch PR was opened. |
| 5 | Linear `save_issue` patch, lane labels, `save_status_update` | Tools are in the connected Linear catalog. No production issue was patched during the spike. Label creation is the setup step, not this probe. |
| 6 | `/loop` subscription timers | Unavailable here. No subscription-timer tool is in this session. Local `/loop` would be a monitored shell. Cloud timers inside an automation stay unverified. |
| 7 | git-stage-guard and `MCP:` `preToolUse` | Local spawn of `git-stage-guard.mjs` with `git add -A` returned `permission: deny`. `hooks.json` registers that guard on `preToolUse` matcher `Shell`. The three Linear guards are `beforeMCPExecution` only. No `MCP:` `preToolUse` matcher is registered, and none fired. **G-LG1 is not allowed.** |
| 8 | A second trigger cancels a running run | Unverified. No automation run to supersede. |
| 9 | `docker info` and `npx supabase start` | Docker daemon responded (server 29.1.3) after Docker Desktop was started. `npx supabase status` returned a local API URL and DB URL. Optional services imgproxy, edge runtime, and pooler were stopped; the database and API were up. `db reset` was not run. |
| 10 | Run starts at the latest staging commit | Local `HEAD` equals `origin/staging` (`bf1d3911920056dc5a864c44ff089669f134208e`). Cloud build freshness and the stale-build threshold are dashboard settings and were not read. |

## Decision used by later slices

- **G-LG1:** do not register the Linear guards on `preToolUse`. Cloud restraint stays prose in `/conduct` until a managed VM records an `MCP:` `preToolUse` fire.
- **G-ENV1:** local Docker and Supabase started. The Cloud VM image is still the go-live gate. The hosted-Supabase fallback is not taken, because Docker did not fail once the daemon was running.

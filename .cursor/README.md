# Restaurant-system operator harness

`docs/` is the source of truth. Specifications define acceptance, work-item
concepts define the queue, and code/tests provide implementation evidence.
Linear IDs are **`RES-###`** on the team whose key is **`RES`**. The live
team display name is informational. Version projects use canonical version key
`V-X.X`. Project values come from
[`harness.json`](harness.json). `.cursor/conductor.json` is the parked
automation switch.

Work ships on the configured **accumulator** (default `staging`). Feature
PRs target that branch. Only the accumulator is promoted to the default
branch. Agents never merge. `/dispatch` metadata-plans the full scoped Backlog
portfolio, then activates only the available slots in a 5–10 total-active
daily wave and writes Ready briefs.

## Bootstrap

Run `/doctor`, then `/init <project-name>`. Initialization performs a
guarded in-place bootstrap and leaves all changes uncommitted. When Docker
is unavailable, explicit scaffold-only initialization can be completed
later with `/verify-local`. CodeRabbit and Linear are explicit profiles.

The bootstrap manifest pins the template, generator, test tools, Node
22.22, and pnpm version. Initialization checkpoints resume by phase. Use
`/upgrade-harness` for dry-run-first, collision-safe harness migrations.

The harness must ship in its pre-`/init` state. Before releasing it, run
`pnpm harness:release-check`.

## Lifecycle

`/capture` → `/triage` → `/dispatch` → `/design` →
`/sdd-to-tdd` → `/review` → `/commit` → `/push` →
`/ready-merge-release`

- `/audit` verifies specs against code and tests.
- `/intake` verifies Cursor Cloud pull requests.
- `/reflect` checks claims against current evidence.
- `/tldr` summarizes a plan, spec, or work item.
- `/conduct` is the optional parked next automation entry.
- `/curate` is the weekly backlog and ledger curator.

Linear writes go only through `linear-resolver`. Ledger writes go only
through `docs-updater` ledger-apply. `/ready-merge-release` may mark a
clean draft ready and then stops; it never merges. `/push` runs the local
CodeRabbit CLI on the committed branch diff before publish.

Independent subagent tasks run in waves of 8. Runtime hook state is
ignored and created on demand.

**Plan Mode only:** [`/audit`](commands/audit.md).

**Managed Cloud-capable:** [`/sdd-to-tdd`](commands/sdd-to-tdd.md),
[`/capture`](commands/capture.md), [`/triage`](commands/triage.md),
[`/dispatch`](commands/dispatch.md), and
[`/curate`](commands/curate.md) are the one-shot commands and default to
Plan Mode; managed Cloud
(`agent/runtime` = `managed`) may one-shot past that gate.
[`/conduct`](commands/conduct.md) is managed Cloud only (`morning` and `next`).
[`/design`](commands/design.md) also defaults to Plan Mode; managed Cloud may
bypass that gate but retains its interactive dialogue and approval stops.

`docs/findings + Linear Triage` → `/triage` → `Backlog` → `/curate` → `/dispatch` →
`Todo/current cycle` → (`/sdd-to-tdd` → `/commit` → `/push`)×N → draft PR.

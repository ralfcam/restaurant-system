# TDD log — res-151_cloud_harness_guards_14f7

### G-LG1

Suggested review order: Cloud Linear write lock [security] `.cursor/hooks.json` `preToolUse` matcher `MCP:save_issue|save_comment|save_status_update` → `.cursor/hooks/lib/linear-write-policy.mjs` `checkLinearWrite(..., { denyUnknownServer })` → `.cursor/hooks/linear-write-guard.mjs` cloud-path detection.

Reusable pattern: none

### G-FO1

Suggested review order: Atomic fan-out [security] `.cursor/hooks/lib/task-fanout-policy.mjs` `withFanoutLock` / `reserveTaskSlot` → `.cursor/hooks/task-fanout-guard.mjs` `failClosed: true` and `process.exit(1)` on throw.

Reusable pattern: Exclusive `wx` lockfile around JSON reservation load/mutate/save so concurrent hook processes cannot all read count < cap.

### G-MRG1

Suggested review order: Tolerant merge [security] `.cursor/hooks/lib/tdd-guard-policy.mjs` `detectGhPrMerge` / `detectGithubMcpMerge` → `.cursor/hooks/git-stage-guard.mjs` Shell + MCP merge matcher.

Reusable pattern: Unwrap `bash -c` / `sh -c`, match basename `gh`, then require `pr merge` or a pulls `/merge` path.

### G-PUSH1

Suggested review order: Protected-branch push [security] `.cursor/hooks/lib/tdd-guard-policy.mjs` `detectProtectedBranchPush` → `.cursor/hooks/git-stage-guard.mjs`.

Reusable pattern: After `git push`, treat remaining non-flag tokens as remote + refspecs; resolve no-refspec / dest `HEAD` against the current branch and deny dest `main` / `staging`.

## Suggested Review Order (collated)

- Cloud Linear write lock [security] → `.cursor/hooks.json` `preToolUse` MCP write matcher; `.cursor/hooks/lib/linear-write-policy.mjs` `denyUnknownServer`; `.cursor/hooks/linear-write-guard.mjs`
- Atomic fail-closed fan-out [security] → `.cursor/hooks/lib/task-fanout-policy.mjs` `withFanoutLock`; `.cursor/hooks/task-fanout-guard.mjs` exit 1
- Tolerant merge [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs` `detectGhPrMerge`, `detectGithubMcpMerge`; `.cursor/hooks/git-stage-guard.mjs`
- Protected-branch push [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs` `detectProtectedBranchPush`

## Traceability (final)

Run: 2026-10-10 · plan: res-151_cloud_harness_guards_14f7 · issue: RES-151

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-LG1 | docs/specs/dev-toolchain.md §17 | tests/unit/dev-toolchain/linear-write-cloud-path.test.ts::preToolUse MCP save_issue denies when flag off and when server unknown | .cursor/hooks/lib/linear-write-policy.mjs, .cursor/hooks/linear-write-guard.mjs, .cursor/hooks.json | P0 | shipped |
| G-FO1 | docs/specs/dev-toolchain.md §31 | tests/unit/dev-toolchain/task-fanout-atomic.test.ts::nine parallel Task reservations deny exactly one; malformed stdin exits non-zero | .cursor/hooks/lib/task-fanout-policy.mjs, .cursor/hooks/task-fanout-guard.mjs, .cursor/hooks.json | P0 | shipped |
| G-MRG1 | docs/specs/dev-toolchain.md §32 | tests/unit/dev-toolchain/merge-bypass-guard.test.ts::denies each listed merge bypass and GitHub MCP merge tools | .cursor/hooks/lib/tdd-guard-policy.mjs, .cursor/hooks/git-stage-guard.mjs, .cursor/hooks.json | P0 | shipped |
| G-PUSH1 | docs/specs/dev-toolchain.md §33 | tests/unit/dev-toolchain/protected-branch-push-guard.test.ts::denies force and ordinary pushes to main/staging; denies implicit dest when current branch is main or staging | .cursor/hooks/lib/tdd-guard-policy.mjs, .cursor/hooks/git-stage-guard.mjs | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-151_cloud_harness_guards_14f7
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 0 (Task tool unavailable in this Cloud VM; orchestrator executed spec → Red → Green)
Back-loops: G-LG1: 1 extra Green (missing `isAllowed` import)
BLOCKED events: 1 — START/CLOSE-OUT linear-resolver Task unavailable
Manual-UAT leftover: hook-authoring live Task/MCP denial for Linear write / fan-out / merge (Task tool unavailable in this Cloud VM; spawn-level deny is covered)
Issues: n/a

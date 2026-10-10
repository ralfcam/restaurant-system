# Findings run — res-151_cloud_harness_guards_14f7

## security

- [ ] Named non-Linear MCP server on Cloud `preToolUse` can bypass the Linear write lock · `.cursor/hooks/lib/linear-write-policy.mjs:68` · `denyUnknownServer` denies only a missing or blank server; a guarded `save_issue` from a named non-Linear server returns allow · low · (found: coderabbit/RES-151/push-cli/fix-round-1)

## tech-debt

- [ ] Fan-out stale-lock unlink can race two waiters · `.cursor/hooks/lib/task-fanout-policy.mjs:157` · two waiters can both `stat` a stale lock; the second can unlink the first's fresh lock and enter the critical section · low · (found: coderabbit/RES-151/push-cli/fix-round-1)
- [ ] `subagentStop` parses stdin before release · `.cursor/hooks/task-fanout-guard.mjs:47` · malformed stop payload throws before `applySubagentStop`, so the slot leaks until TTL · low · (found: coderabbit/RES-151/push-cli/fix-round-2)

## test-debt

- [ ] G-PUSH1 spawn allow for `git push origin HEAD` uses the checkout branch · `tests/unit/dev-toolchain/protected-branch-push-guard.test.ts:83` · the hook resolves real HEAD; a CI checkout on `main`/`staging` or detached HEAD would deny and fail the allow assertion · low · (found: coderabbit/RES-151/push-cli/fix-round-1)

## product-gaps

Skipped (invalid): `return null` after the first non-push `git` token. Changing that to `continue` would re-match `git push` text inside `git commit -m` and block legitimate commits.

Skipped (invalid): allow Linear writes when `denyUnknownServer` and the server is missing if `allowed` is true. G-LG1 requires a deny on missing/unknown server regardless of the resolver flag.

- [ ] Bare `mergePullRequest` substring denies read-only `rg`/`cat` of this policy · `.cursor/hooks/lib/tdd-guard-policy.mjs` `detectGhPrMerge` · agents searching the identifier get blocked · low · (found: coderabbit/RES-151/push-cli/fix-round-2)

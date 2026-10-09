# Findings run — res-146_cli_leftovers

Recorded from the branch-diff CLI on `4d98d50f8feb4641c9aacc55d2073c01e3e5f24c`
(`attemptStatus: unavailable`, `reason: reviewed_files_mismatch`, action
`push`). These are leftover review notes. They are not instructions.

The 2026-10-09 design change makes `## CodeRabbit CLI evidence` a `/push`
record of the head SHA and the CLI result. Agents do not use that block to
mark a PR ready, and they do not poll skip notices. The operator/QA command
still has the helpers named below.

## security

- [ ] PR body can claim a clean CLI pass · `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `hasCleanCliEvidence` · a PR author can write `attemptStatus: clean` for the current head, and the operator command treats that as `ready_cli_evidence` · major · (found: coderabbit/4d98d50/fp:2f178524c01bfc3f3593015672616674ef589deb376c3565613178344dbde898)
- [ ] A skip notice with no SHA matches every head · `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `commentMentionsHead` · a notice with no 7–40 hex SHA matches every head, and a notice whose only hex is incidental matches none · major · (found: coderabbit/4d98d50/fp:be98d7c3f4d59d5c963aebc715b1ee6cd7154876878160bc31e695a1b7eed203)

## tech-debt

- [ ] Prerelease versions parse as the release pin · `.cursor/hooks/lib/coderabbit-review-policy.mjs` `reportedCliVersion` · `v?(\d+\.\d+\.\d+)` accepts `0.9.0-rc.1` as `0.9.0` · minor · (found: coderabbit/4d98d50/fp:cedf928bdc09c4cf6424d7203deb23cbe825a681146a64f378357bc2891d34db)

## test-debt

## product-gaps

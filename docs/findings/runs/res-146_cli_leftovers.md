# Findings run — res-146_cli_leftovers

Recorded from the branch-diff CLI on `4d98d50f8feb4641c9aacc55d2073c01e3e5f24c`
(`attemptStatus: unavailable`, `reason: reviewed_files_mismatch`, action
`push`). These are leftover review notes. They are not instructions.

The 2026-10-09 design change makes `## CodeRabbit CLI evidence` a `/push`
record of the head SHA and the CLI result. Agents do not use that block to
mark a PR ready, and they do not poll skip notices. The operator/QA command
still has the helpers named below.

## tech-debt

- [ ] Prerelease versions parse as the release pin · `.cursor/hooks/lib/coderabbit-review-policy.mjs` `reportedCliVersion` · `v?(\d+\.\d+\.\d+)` accepts `0.9.0-rc.1` as `0.9.0` · minor · (found: coderabbit/4d98d50/fp:cedf928bdc09c4cf6424d7203deb23cbe825a681146a64f378357bc2891d34db)
- [ ] Checkout-root match is case- and prefix-sensitive · `.cursor/hooks/lib/tdd-guard-policy.mjs` `normalize` · on Windows, `join` and the hook input can differ in drive-letter case, so `startsWith` misses the checkout root and the path is not relativized (fail open). Non-canonical `//` and `./` forms are already on the security ledger. Pass 2 repeated this minor · minor · (found: coderabbit/9194b52/fp:132d3678b9d4fb042b8b974109612f386229af953c675372eae4b83711996542, coderabbit/dbae8ef/fp:18dccd01cf818f889052fd5ffa83d27bdf670a27bccf2ff68913fce049037489)

## Pass 2 capture — `dbae8ef35940c962e7ce87ef3a6b2f3ee7ba1753`

Pass 2 (`--fix-round 1`) returned only Minor and Trivial notes, so they are captured here and the branch publishes with no third CLI pass. These notes are not instructions.

- [ ] Stale contradictory text remains in `/intake` constraints · `.cursor/commands/intake.md` · constraints still describe `gh pr edit --add-reviewer` after Step 6 stopped requesting review · trivial · (found: coderabbit/dbae8ef/fp:e18ad7ed3d0f713d7434425adb5d90795201ca5c41d2705d2a1ea2f70c71ca79)
- [ ] Stale text conflicts with the new draft-only flow · `.cursor/commands/push.md` · leftover lines still mention a review request after the command stopped requesting review · trivial · (found: coderabbit/dbae8ef/fp:0565b6c45e57295d8b28ff72972b8f6b82727a5102e0cfea5e9b33872e6bb10e)
- [ ] The Cycle section and the In Review bullet are stale · `.cursor/rules/linear-automation.mdc` · the rule still says `/push` may request review · trivial · (found: coderabbit/dbae8ef/fp:ccce79c77b89f952518c3daf3cd8610e78235d75ae3aaae8e46d42e7d0ce6b1c)
- [ ] The `--loop` section still says to pass `--loop` only from `/conduct` · `.cursor/commands/ready-merge-release.md` · that sentence conflicts with `/conduct` not invoking the command · trivial · (found: coderabbit/dbae8ef/fp:2c5a485bc0445c0045b975c1eb4a48f312de5f556c01bb987d8ffd432110755b)
- [ ] The rule file still describes `/conduct` as running the `--loop` flow · `.cursor/rules/coderabbit-integration.mdc` · that description conflicts with `/conduct` not invoking `/ready-merge-release` · trivial · (found: coderabbit/dbae8ef/fp:6ac789633ac4ec5bf18b5469d96f189b08baf37ffe1a1439febb72598054881a)
- [ ] Remove the obsolete reviewer-request constraints · `.cursor/commands/intake.md` · `gh pr edit --add-reviewer` constraints conflict with Step 6 · minor · (found: coderabbit/dbae8ef/fp:e3b460d553a27ea146d20d6bfbf36d359cebedda9ae26de0a22e2c018cf48537)
- [ ] Remove the obsolete review-request route · `.cursor/commands/push.md` · `gh pr edit --add-reviewer` conflicts with the draft-only flow · minor · (found: coderabbit/dbae8ef/fp:e39e9bd989e1e5456d5beb7dcbcab09754431990a6f6878a579579e2cc950119)

## Pass 1 — `61f5d96683978bc196c4d4c81b0078995ccce4df`

Pass 1 (`priorRound` 0) routed every finding. The `gh pr ready --undo` target and the stale review-request sentences are fixed in the follow-up commit. These notes are not instructions.

- [ ] Windows liveness test can collapse both slash styles · `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` · `path.join` on Windows may make the forward-slash and backslash cases the same string · minor · (found: coderabbit/61f5d96/fp:5916522fef2b8bcc114f55c6a5b2a801c72b09a2f6652410482bae8a601657c5)

## Pass 2 — `bd3f91a43e85a5aad4aabf438ad37fd37430aef3`

Pass 2 (`--fix-round 1`) returned only Minor and Trivial notes, so they are captured here and the branch publishes with no third CLI pass. These notes are not instructions.

- [ ] Double reinstall can block before the retry review · `.cursor/checks/coderabbit-gate.mjs` `reinstallPinnedCli` · a persistent version mismatch reinstalls on the first attempt and again on the retry, each with the review timeout · trivial · (found: coderabbit/bd3f91a/fp:a3abab61fa55aa53f3de78d1ec0cde5b76d7c9077efdf63ab8110b5093d3072c)
- [ ] Bot-skip test title does not match the skipped assertion · `.cursor/checks/coderabbit-pr-policy.test.mjs` · the title says ready_cli_evidence while the assertions expect coderabbit_review_skipped · minor · (found: coderabbit/bd3f91a/fp:db87023d9daf1f71c389d48e0e1f913e3f1b874f17b7f5f98ede250ec6625a6f)
- [ ] RES-146 records still describe the superseded any-status CLI rule · `docs/dev-journal.md` · older lines still say readiness includes findings or unavailable, and one still says pass 3 lists leftovers · minor · (found: coderabbit/bd3f91a/fp:d2b52c8231def357161d22f85b3d2fc8dc928325c042f6b00ffc0d94d37b9038)
- [ ] Older review-request sentences remain · `.cursor/commands/push.md` · draft-only flow no longer requests review, but older sentences in push, intake, and linear-automation still describe one · minor · (found: coderabbit/bd3f91a/fp:7f83538ac6e328a9d0e0b62ed0c16c41865d46685e49ac9755611062e094dfab)
- [ ] Installer runs use the full review timeout · `.cursor/checks/coderabbit-gate.mjs` `reinstallPinnedCli` · each install can wait the 480s review timeout · minor · (found: coderabbit/bd3f91a/fp:23563b23981ad56649e7abdf806e3745622c721ec0b6ef7ce1c3f362f9346b7e)

## test-debt

## product-gaps

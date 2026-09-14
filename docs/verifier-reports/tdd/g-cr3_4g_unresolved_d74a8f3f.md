# TDD log — g-cr3_4g_unresolved_d74a8f3f

FIX: G-CR3 4G unresolved findings — issue/inline comment authors as `wrong_bot`; pre-ready HEAD re-read + `gh pr ready --undo`; linear-automation remote-finding routing.

### C1

Suggested review order:
- Identity fail-close (issue/inline authors in the reviews/checks `wrong_bot` band)
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:213` `issueComments` / `reviewComments` locals
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:218` `[security]` reviews / checks / comment-author `wrong_bot` before rate/billing/unresolved
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:76` `[security]` `commentAuthorLogin` (`author` then `user`)
- Identity-only (not finding/override sources)
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:92` `collectOverrideTexts` still body-only
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:155` `collectActiveCodeRabbitFindings` still US-bot GraphQL threads
- Shared walker still used by threads
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:80` `threadHasCommentLogin`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:161` findings loop still US-login filtered

Reusable pattern: Name the GitHub comment-login helper for comments (not threads) and hoist `issueComments`/`reviewComments` beside reviews/checks so REST authors share the first `wrong_bot` band without becoming finding sources.

### C2

Suggested review order:
- abort-and-undo contract — `.cursor/commands/ready-merge-release.md:5-9` persona allowed writes
- [security] pre-ready HEAD freeze — `.cursor/commands/ready-merge-release.md:97-104` Step 3 immediate `headRefOid` re-read / STOP with no mutation
- [security] post-ready restore — `.cursor/commands/ready-merge-release.md:108-110` `gh pr ready --undo` then STOP
- allowed-write envelope — `.cursor/commands/ready-merge-release.md:147-149` `<constraints>`
- [security] factory mirror — `.cursor/rules/coderabbit-integration.mdc:55-59` Remote enforcement re-read + `--undo`

Reusable pattern: When `<constraints>` add a second GitHub write, align `<persona>` write-count in the same criterion so exclusive-mutation prose cannot forbid the new write.

### C3

Suggested review order:
- [public-api] severity split — `.cursor/rules/linear-automation.mdc:81-83` Remote findings paragraph (`Critical/Major/unknown` → `/sdd-to-tdd`; Minor/Trivial through `/capture` then `/triage`)
- provenance pin — `.cursor/rules/linear-automation.mdc:83` `coderabbit/<local|PR>/<head>/<finding-id>` (keep `local|PR`; do not silently match spec `coderabbit/PR/...`)
- CodeRabbit still must not write Linear — `.cursor/rules/linear-automation.mdc:76-79` (unchanged; routing stays agent-mediated)

Reusable pattern: Give the Remote findings contract its own paragraph so a first-`indexOf("Remote findings")` + next-heading slice cannot pick up the adjacent CodeRabbit Plan/Triage sentences.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from each criterion's last Refactor close-out.

- **[security]** Issue/inline comment authors in the first `wrong_bot` band — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:218` reviews/checks/comment-author; `:213` `issueComments`/`reviewComments`; `:76` `commentAuthorLogin`
- **[security]** Pre-ready HEAD freeze + post-ready `--undo` — `.cursor/commands/ready-merge-release.md:97-104` Step 3; `:108-110` Step 4; `:5-9` persona; `:147-149` constraints
- **[security]** Factory Remote enforcement abort-and-undo — `.cursor/rules/coderabbit-integration.mdc:55-59`
- **[public-api]** Remote findings severity split — `.cursor/rules/linear-automation.mdc:81-83`
- Identity-only (not finding sources) — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:92` `collectOverrideTexts`; `:155` `collectActiveCodeRabbitFindings`
- Regression fixtures — `tests/unit/dev-toolchain/fixtures/remote-us-and-coderabbit-other-issue-comment.json`; `remote-us-and-coderabbit-other-review-comment.json`; `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts` C1–C3 `it`s

## Traceability (final)

Run: 2026-09-14 · plan: g-cr3_4g_unresolved_d74a8f3f · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR3 §9 issue/inline comment authors | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::US approval does not hide a non-US CodeRabbit issue or inline review comment | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `evaluateReadyPr` / `commentAuthorLogin` | P1 | shipped |
| C2 | G-CR3 §9 pre-ready HEAD + `--undo` | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::ready-merge re-reads HEAD immediately before gh pr ready and undoes on drift | `.cursor/commands/ready-merge-release.md`; `.cursor/rules/coderabbit-integration.mdc` | P1 | shipped |
| C3 | G-CR3 §9 routing (already specified) | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::linear-automation remote findings route Critical/Major/unknown to /sdd-to-tdd | `.cursor/rules/linear-automation.mdc` Remote findings | P2 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr3_4g_unresolved_d74a8f3f
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 9 (C1 red/green/refactor; C2 red/green/refactor; C3 red/green/refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 12 left on ledger (below floor/cap) — cap 3/run
4G: `ok: false` `unresolved_findings` (4 blocking; not waived). `/commit` not pointed.

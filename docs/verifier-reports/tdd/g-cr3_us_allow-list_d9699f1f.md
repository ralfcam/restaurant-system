# TDD log — g-cr3_us_allow-list_d9699f1f

FIX: Rewrite G-CR3 from an EU deny-list to a US allow-list. Non-US CodeRabbit-shaped identity is `wrong_bot` before unresolved-thread routing.

### C1

Suggested review order:
- US allow-list identity [security]
  - `.cursor/rules/coderabbit-integration.mdc:8-10`
  - `.cursor/commands/ready-merge-release.md:29-32`
- Operational FAIL list without EU deny-list tokens [public-api]
  - `.cursor/commands/ready-merge-release.md:89-93`
- Remote US-reviewed HEAD contract
  - `.cursor/rules/coderabbit-integration.mdc:51-60`
- C1 regression pin (read-only; not edited this phase)
  - `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:295-334`

Reusable pattern: After deleting deny-list tokens from wrapped factory markdown, reflow the surviving sentence so the next line is not a leftover mid-phrase wrap; pin required US identifiers and the retired deny-list strings in the same factory-prose test.

### C2

Suggested review order:
- US allow-list pins [security]
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:17`
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:18`
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:91`
- CodeRabbit-shaped identity [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:47`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:51`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:58`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:62`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:66`
- Fail-close before rate/billing/threads [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:202`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:236`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:255`
- Path vs severity routing (left in place)
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:109`
- Regression fixtures
  - `.cursor/checks/coderabbit-pr-policy.test.mjs:27`
  - `.cursor/checks/fixtures/coderabbit/remote-coderabbit-other.json:7`
  - `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:337`

Reusable pattern: Pair a US HEAD APPROVED with a non-US `/coderabbit/i` sibling in the same snapshot, and fail-close allow-list identity (`shaped` minus US pins) before rate/billing/thread routing so US approval cannot mask `wrong_bot`.

### C3

Suggested review order:
- Fail-closed thread identity [security]
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:62` `isNonUsCodeRabbitLogin` (`/coderabbit/i` minus US allow-list)
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:80` `threadHasCommentLogin`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:88` `threadHasNonUsCodeRabbit`
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:248` `[security]` thread `wrong_bot` before unresolved routing
- US-only unresolved routing
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:84` `threadHasCodeRabbit` (US-bot only)
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:253` unresolved filter
- Findings stay US-bot only
  - `.cursor/hooks/lib/coderabbit-pr-policy.mjs:157` `collectActiveCodeRabbitFindings` skips resolved / non-US threads, then `isUsBotLogin` per comment

Reusable pattern: Put US allow-list vs `/coderabbit/i` minus allow-list on one comment-login walker, and fail-close `wrong_bot` on that walk before the US unresolved filter — otherwise a non-US GraphQL thread is misclassified as `unresolved_threads`.

## Suggested Review Order (collated)

Highest-risk first. Line numbers are from each criterion's last Refactor close-out.

- **[security]** Fail-close non-US CodeRabbit identity before unresolved threads — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:202` reviews/checks; `:248` GraphQL thread `wrong_bot`; `:253` US-bot unresolved filter
- **[security]** CodeRabbit-shaped identity minus US pins — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:58` `isCodeRabbitShaped`; `:62` `isNonUsCodeRabbitLogin`; `:66` `isNonUsCodeRabbitApp`; `:80` `threadHasCommentLogin`
- **[security]** US allow-list pins — `.cursor/hooks/lib/coderabbit-review-policy.mjs:17` `US_APP_ID` `347564`; `:18` `US_BOT_LOGINS`; `:91` `isUsBotLogin`; `.cursor/hooks/lib/coderabbit-pr-policy.mjs:51` `isUsApp`
- **[security]** Findings stay US-bot only — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:84` `threadHasCodeRabbit`; `:157` `collectActiveCodeRabbitFindings`
- **[security]** Factory US-only prose — `.cursor/rules/coderabbit-integration.mdc:8-10`; `.cursor/commands/ready-merge-release.md:29-32`
- **[public-api]** Operational FAIL list without EU deny-list tokens — `.cursor/commands/ready-merge-release.md:89-93`
- Regression fixtures — `.cursor/checks/fixtures/coderabbit/remote-coderabbit-other.json:7`; `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:295` C1; `:337` C2; `:359` C3; `.cursor/checks/coderabbit-pr-policy.test.mjs:27`

## Traceability (final)

Run: 2026-09-14 · plan: g-cr3_us_allow-list_d9699f1f · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR3 §9 US allow-list vocabulary | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::G-CR3 is US-only allow-list | docs/specs/dev-toolchain.md (G-CR3 §9); `.cursor/commands/ready-merge-release.md`; `.cursor/rules/coderabbit-integration.mdc` | P2 | shipped |
| C2 | G-CR3 non-US identity on reviews/checks | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::US approval does not hide a non-US CodeRabbit review | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `evaluateReadyPr`; `.cursor/hooks/lib/coderabbit-review-policy.mjs` (EU identity retired) | P1 | shipped |
| C3 | G-CR3 threads before unresolved | tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts::non-US CodeRabbit thread is wrong_bot not unresolved_threads | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `threadHasNonUsCodeRabbit` / `threadHasCodeRabbit` / `collectActiveCodeRabbitFindings` | P1 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr3_us_allow-list_d9699f1f
Criteria: 3 shipped · 0 manual-uat · 3 total
Phases delegated: 9 (C1 red/green/refactor; C2 red/green/refactor; C3 red/green/refactor)
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 11 left on ledger (below floor/cap) — cap 3/run
4G: `ok: false` `unresolved_findings` (3 blocking; not waived). `/commit` not pointed.

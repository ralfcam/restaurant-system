# TDD log: res-154_wip_draft_pr_10d5

### C1

Suggested review order:
- Fail-closed decision table — [public-api] `.cursor/hooks/lib/gate-evidence-policy.mjs:30`
- No-argument list and stop — [public-api] `.cursor/commands/push.md:287`
- Same stop where an agent reads next: `.cursor/commands/push.md:426`, `.cursor/commands/push.md:466`, `.cursor/commands/push.md:507`, `.cursor/commands/push.md:512`, `.cursor/commands/push.md:40`

Reusable pattern: When a command rule is pinned only inside one markdown bullet, copy the same stop into the reasoning-protocol step, the constraints bullet, and the output-format token in that same edit — those sections sit outside a slice that ends at the next `###`.

### C2

Suggested review order:
- SHA-bound section read [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:400` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:410` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:416`
- Draft missing-head verdict [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:439`
- Atomic section replace `.cursor/hooks/lib/coderabbit-pr-policy.mjs:425` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:433`
- Command ignore contract [public-api] `.cursor/commands/ready-merge-release.md:100`

Reusable pattern: Slice the protected PR-body section from its heading through the next `\n## `, accept only HTML markers inside that slice, and keep comment HTTP status (including 403) out of `qaDraftEvidenceVerdict`.

### C3

Suggested review order:
- Reuse graduation after the feature-PR stop — [public-api] `.cursor/commands/push.md:289`
- Title and label writes, including the absent no-op — [public-api] `.cursor/commands/push.md:293`
- Constraint exception that allows only that title edit — `.cursor/commands/push.md:492`
- Same outcome on the no-argument checklist — `.cursor/commands/push.md:435`

Reusable pattern: When a markdown test slices one command bullet, mirror that outcome into the reasoning-protocol step and carve it out of any DO NOT that would forbid the write.

### C4

Suggested review order:
- WIP start shape: `.cursor/hooks/lib/gate-evidence-policy.mjs:36` [public-api]
- First step before code: `.cursor/commands/conduct.md:135` [public-api]
- Same first step: `.cursor/commands/sdd-to-tdd.md:192`
- Same first step, start-only: `.cursor/commands/design.md:136`
- Do not open a second draft: `.cursor/commands/sdd-to-tdd.md:206` [public-api]
- Close-out commit stays with the conductor: `.cursor/commands/design.md:154`
- Label carve-out: `.cursor/commands/conduct.md:21`

Reusable pattern: Keep a `toContain` pin on one line when the test does not collapse whitespace, and qualify a later absolute such as "runs commit and push" as close-out so an earlier empty-start step is not contradicted.

### C5

Suggested review order:
- WIP skip decision: [public-api] `.cursor/hooks/lib/gate-evidence-policy.mjs:38` `shouldIgnoreWipBuild` (title prefix `[WIP]`, or `^wip\([^)]+\): start run\b`)
- Protected env/branch never skip: [public-api] `.cursor/hooks/lib/gate-evidence-policy.mjs:39` (`production`/`staging` env, `staging`/`main` branch → `false`)
- Vercel exit polarity: [public-api] `.cursor/hooks/lib/ignore-wip-build.mjs:5` exit 0 cancels the build; reads `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_COMMIT_MESSAGE`
- CodeRabbit token: `.coderabbit.yaml:51` exact `"[WIP]"` next to existing `WIP`
- Vercel wiring: `vercel.json:2` `ignoreCommand` only, no `crons`

Reusable pattern: Short-circuit `shouldIgnoreWipBuild` to false for Vercel env `production`/`staging` and branch `staging`/`main` before the `[WIP]` / `wip(<key>): start run` check; `ignoreCommand` still exits 0 only on a non-protected preview skip.

### C6

Suggested review order:
- No-op close predicate: [public-api] `.cursor/hooks/lib/gate-evidence-policy.mjs:51` `shouldCloseNoopWip` (one empty start commit, no further tracked change)
- Shared start-commit match: `.cursor/hooks/lib/gate-evidence-policy.mjs:36` `WIP_START_COMMIT`, used at `:39` and `:55`
- Close the draft and do not write Linear state: [public-api] `.cursor/commands/conduct.md:148` and `.cursor/commands/sdd-to-tdd.md:200`

Reusable pattern: Keep the `^wip\([^)]+\): start run\b` predicate as one module-private `WIP_START_COMMIT` so the Vercel skip and the no-op close cannot drift.

### C7

Suggested review order:
- Agent-running count predicate [public-api] → `.cursor/hooks/lib/dispatch-capacity-policy.mjs:43`
- `/conduct` in-flight cap pin → `.cursor/commands/conduct.md:30`
- Module contract comment → `.cursor/hooks/lib/dispatch-capacity-policy.mjs:1`

Reusable pattern: When a later criterion adds an export to an existing policy module, extend the file header in Refactor to name that export and its caller; leave the predicate alone if the test already pins it.

## Suggested Review Order (collated)

Highest-risk first, grouped by concern.

### Evidence binding [security]

- SHA-bound section read — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:400` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:410` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:416`
- Draft missing-head verdict — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:439`
- Atomic section replace — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:425` `.cursor/hooks/lib/coderabbit-pr-policy.mjs:433`
- Command ignore contract — `.cursor/commands/ready-merge-release.md:100`

### Fail-closed `/push` [public-api]

- Duplicate-open decision table — `.cursor/hooks/lib/gate-evidence-policy.mjs:30`
- No-argument list and stop — `.cursor/commands/push.md:287`
- Reuse graduation after the feature-PR stop — `.cursor/commands/push.md:289`
- Title and label writes, including the absent no-op — `.cursor/commands/push.md:293`
- Same stop / outcome where an agent reads next — `.cursor/commands/push.md:40` `.cursor/commands/push.md:426` `.cursor/commands/push.md:435` `.cursor/commands/push.md:466` `.cursor/commands/push.md:492` `.cursor/commands/push.md:507` `.cursor/commands/push.md:512`

### First-step WIP draft [public-api]

- WIP start shape — `.cursor/hooks/lib/gate-evidence-policy.mjs:36`
- First step before code — `.cursor/commands/conduct.md:135` `.cursor/commands/sdd-to-tdd.md:192` `.cursor/commands/design.md:136`
- Do not open a second draft — `.cursor/commands/sdd-to-tdd.md:206`
- Close-out commit stays with the conductor — `.cursor/commands/design.md:154`
- Label carve-out — `.cursor/commands/conduct.md:21`

### `[WIP]` skip [public-api]

- Skip decision — `.cursor/hooks/lib/gate-evidence-policy.mjs:38` `shouldIgnoreWipBuild`
- Protected env/branch never skip — `.cursor/hooks/lib/gate-evidence-policy.mjs:39` (`production`/`staging` env, `staging`/`main` branch → `false`)
- Vercel exit polarity — `.cursor/hooks/lib/ignore-wip-build.mjs:5` (`VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_COMMIT_MESSAGE`; exit 0 still means skip)
- CodeRabbit token — `.coderabbit.yaml:51`
- Vercel wiring — `vercel.json:2`

### No-op close [public-api]

- Close predicate — `.cursor/hooks/lib/gate-evidence-policy.mjs:51` `shouldCloseNoopWip`
- Shared start-commit match — `.cursor/hooks/lib/gate-evidence-policy.mjs:36` `WIP_START_COMMIT`
- Close the draft and do not write Linear state — `.cursor/commands/conduct.md:148` `.cursor/commands/sdd-to-tdd.md:200`

### Capacity [public-api]

- Agent-running count predicate — `.cursor/hooks/lib/dispatch-capacity-policy.mjs:43`
- `/conduct` in-flight cap pin — `.cursor/commands/conduct.md:30`

## Traceability (final)

Run: 2026-10-10 · plan: res-154_wip_draft_pr_10d5 · issue: RES-154

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-WIP3 | wip-draft-pr.test.ts::selectOpenHeadPr fails closed on duplicate open PRs | `.cursor/hooks/lib/gate-evidence-policy.mjs`, `.cursor/commands/push.md` | P0 | shipped |
| C2 | G-WIP5 | wip-draft-pr.test.ts::protected CLI evidence is authoritative and SHA-bound | `.cursor/hooks/lib/coderabbit-pr-policy.mjs`, `.cursor/commands/ready-merge-release.md` | P0 | shipped |
| C3 | G-WIP2 | wip-draft-pr.test.ts::push reuses the single open head PR and strips WIP | `.cursor/commands/push.md`, gate-evidence + coderabbit-pr policies | P0 | shipped |
| C4 | G-WIP1 | wip-draft-pr.test.ts::ticket-work commands open one WIP draft before first code change | `conduct.md`, `sdd-to-tdd.md`, `design.md`, gate-evidence-policy | P1 | shipped |
| C5 | G-WIP4 | wip-draft-pr.test.ts::WIP title skips CodeRabbit review and Vercel build | `.coderabbit.yaml`, `vercel.json`, ignore script / `shouldIgnoreWipBuild` | P1 | shipped |
| C5b | G-WIP4 | wip-draft-pr.test.ts::protected Vercel env and branch never skip a WIP build | `gate-evidence-policy.mjs`, `ignore-wip-build.mjs` | P0 | shipped |
| C6 | G-WIP6 | wip-draft-pr.test.ts::noop run closes the WIP draft with a reason | `conduct.md`, `sdd-to-tdd.md`, `shouldCloseNoopWip` | P1 | shipped |
| C7 | G-WIP7 | wip-draft-pr.test.ts::capacity counts agent-running drafts only | `dispatch-capacity-policy.mjs`, `conduct.md` | P1 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-11 · plan: res-154_wip_draft_pr_10d5
Criteria: 8 shipped · 0 manual-uat · 8 total
Phases delegated: 24
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 25 left on ledger (below floor/cap) — cap 3/run
Follow-up 2026-10-11: G-WIP4 protected `VERCEL_ENV`/`VERCEL_GIT_COMMIT_REF` bail-out (C5b).

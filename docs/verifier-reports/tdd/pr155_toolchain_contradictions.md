# TDD verifier report — six toolchain contradictions (`pr155_toolchain_contradictions`)

FIX. No Linear issue. `/commit` must omit `Fixes`.

This file is a **reading guide for `/commit`**, not a verdict. Per-criterion sections are appended after each Refactor. Suggested Review Order and Traceability are filled at close-out.

## Criterion close-outs (incremental)

### C1 — conduct-ban (G-CON1)

Suggested review order: `[toolchain]` `.cursor/rules/staging-accumulator.mdc` Cloud-lane carve → permission to create `cursor/morning-` / `cursor/res-` and run `/sdd-to-tdd` and `/design` → pin `tests/unit/dev-toolchain/conduct-command.test.ts` `G-CON1 Cloud-lane ban > excludes /conduct branch creation and route commands from the absolute ban`

Reusable pattern: Isolate the Cloud-lane section, split on sentence boundaries, and fail the pin on the absolute ban sentence while a separate permission sentence names the carve.

Delete-list: none. The absolute sentence was replaced, not wrapped.

Review note: Every command, including `/conduct`, still may not assign, delegate, or write `@Cursor`. Every command other than `/conduct` still may not create a branch or worktree or invoke an agent. `/conduct` may create its `cursor/morning-` and `cursor/res-` branches and may run `/sdd-to-tdd` and `/design`.

Verification: `pnpm test:unit tests/unit/dev-toolchain/conduct-command.test.ts` — 2 passed. ESLint on the test — 0 warnings. Scoped `tsc` on the test — exit 0. Prettier on the test and the rule — clean.

Residual (not in this run's findings unless close-out promotes them): the pin does not lock the assignee/delegate/`@Cursor` sentence, so deleting that sentence would still pass. The exemption sentence drops the ban for `/conduct` generally; the next sentence names the allowed branches and commands without the word "only".

### C2 — step-0c (G-DES1)

Suggested review order: `[toolchain]` `.cursor/commands/design.md` STEP 0C writes the work-order and posts START without `Go ahead` (STEP 4, constraints, mode line) → interactive and local approval still wait → pin `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` `sends STEP 0C straight to the work-order and START without a Go ahead gate`

Reusable pattern: State the allowed path as its own sentence ("STEP 0C writes … without `Go ahead`") instead of appending "except STEP 0C" to the forbidden sentence.

Delete-list: none.

Review note: STEP 4, the constraints, and the mode line now lead with the direct STEP 0C instruction. Local Plan Mode and STEP 0B still wait for `Go ahead`. The Execution Protocol line that still leads with "except STEP 0C" was left in place because this criterion's pin covers only STEP 4, the constraints, and the mode line.

Verification: `pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` — 7 passed. Prettier on `.cursor/commands/design.md` and the test — unchanged.

### C3 — pinned-gate-evidence (G-PUB1)

Suggested review order: `[toolchain]` `.cursor/commands/push.md` argument-given sentence that runs `gh pr edit <n> --body-file` for a `cursor/` head → pin isolation in `tests/unit/dev-toolchain/push-gate-evidence.test.ts` `replaces gate evidence for a cursor/ head on the argument-given path` → firewall left in place

Reusable pattern: Isolate a command-prose pin to the span between two bold markers and require the contract in one sentence, so a sibling path cannot satisfy it.

Delete-list: none.

Review note: The argument-given path now replaces the gate-evidence body when the head is `cursor/`. The no-argument path is unchanged. The cursor-head firewall was not moved. The sentence says "when the head is `cursor/`" and "after every push" without naming `headRefName` or the firewall regex.

Verification: `pnpm test:unit tests/unit/dev-toolchain/push-gate-evidence.test.ts` — 4 passed. Prettier on `.cursor/commands/push.md` and the test — unchanged.

### C4 — brief-heading (G-RDY1)

Suggested review order: `[toolchain]` `.cursor/hooks/lib/ready-brief-policy.mjs` `briefSection` line-anchored `/^## Ready brief$/m` → prose pin and plural pin in `.cursor/checks/ready-brief-policy.test.mjs`

Reusable pattern: Open a markdown section with a multiline exact-line regex so a mid-line mention or a longer heading (`## Ready briefs`) does not match.

Delete-list: none. `indexOf` was replaced in `briefSection` only.

Review note: Only a whole line `## Ready brief` starts the section. A prose mention and `## Ready briefs` do not. CRLF still matches because `$` matches before the carriage return. A heading with trailing spaces fails closed. `replaceGateEvidence` still uses `indexOf` and was left untouched.

Verification: `node --test .cursor/checks/ready-brief-policy.test.mjs` — 11 pass, 0 fail, 0 skipped. ESLint on the two files — 0 warnings. Prettier — unchanged.

### C5 — findings-attach (G-CR4)

Suggested review order: `[toolchain]` `.cursor/commands/sdd-to-tdd.md` managed STEP 4C attach-only handoff → local Plan Mode still confirms net-new issues under the cap of 3 → pin `tests/unit/dev-toolchain/sdd-managed-findings.test.ts` `keeps managed close-out attach-only and leaves new issues on the ledger`

Reusable pattern: none

Delete-list: none. The two net-new filing sentences were rewritten. The both-routes sentence was narrowed so only local Plan Mode keeps the ladder and the cap.

Review note: Managed STEP 4C is attach-only. New-issue findings stay on the ledger and the run continues. Local Plan Mode confirmation before net-new issues still uses the filing floor, the attach-over-create ladder, and the per-run cap of 3. `linear-resolver` and triage were not changed.

Left in place, outside this pin: the orchestrator close-out bullet still says to file findings as linked Linear issues (managed only "does not auto-confirm"); the plan-template findings registration still proposes new issues under the cap; `docs/findings/README.md` still says STEP 4C may create at most 3 net-new issues; the resolver still walks the ladder.

Verification: `pnpm test:unit tests/unit/dev-toolchain/sdd-managed-findings.test.ts` — 1 passed. `pnpm typecheck` — clean. `pnpm lint` — clean. Prettier on the command and the test — unchanged.

### C6 — dispatch-handoff (G-DSP1)

Suggested review order: `[toolchain]` `.cursor/agents/linear-resolver.md` PROJECT-UPDATE handoff accepts an audit key or a dispatch key → report block keeps the audit line and adds `Dispatch run key:` → pin `tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts` `accepts a Dispatch run key in the PROJECT-UPDATE handoff and report block`

Reusable pattern: Slice the When-invoked bullet and the report fence before asserting a shared marker, so a workflow section that already contains that marker cannot satisfy the pin.

Delete-list: none.

Review note: The handoff and the report block accept `Dispatch run key:` beside the existing audit key. The audit key was not removed. Workflow validation already accepted a dispatch key and was not edited. A dispatch-only report still lists an audit key line without `| none`, because that key already ends in an in-key `|none` token.

Verification: `pnpm test:unit tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts` — 2 passed. `pnpm typecheck` — clean. `pnpm lint` — clean. Prettier on the agent file and the test — unchanged.

## Suggested Review Order (collated)

Concern-first, highest blast-radius first. Line numbers drift; follow symbols.

### 1. Conduct branch carve [toolchain]

- `.cursor/rules/staging-accumulator.mdc` Cloud lane — every command, including `/conduct`, still may not assign, delegate, or write `@Cursor`. Every command other than `/conduct` still may not create a branch or worktree or invoke an agent. `/conduct` may create `cursor/morning-` and `cursor/res-` branches and may run `/sdd-to-tdd` and `/design`.
- Pin: `tests/unit/dev-toolchain/conduct-command.test.ts` — `excludes /conduct branch creation and route commands from the absolute ban`.

### 2. Managed findings stay on the ledger [toolchain]

- `.cursor/commands/sdd-to-tdd.md` STEP 4C — managed close-out is attach-only. New-issue findings stay on the ledger and the run continues. Local Plan Mode confirmation before net-new issues still uses the filing floor, the attach-over-create ladder, and the per-run cap of 3.
- Pin: `tests/unit/dev-toolchain/sdd-managed-findings.test.ts` — `keeps managed close-out attach-only and leaves new issues on the ledger`.

### 3. Briefed design writes the work-order [toolchain]

- `.cursor/commands/design.md` STEP 4, constraints, and mode line — STEP 0C writes the work-order and posts START without `Go ahead`. Local Plan Mode and STEP 0B still wait.
- Pin: `tests/unit/dev-toolchain/design-cloud-dialogue.test.ts` — `sends STEP 0C straight to the work-order and START without a Go ahead gate`.

### 4. Pinned push replaces gate evidence [toolchain]

- `.cursor/commands/push.md` argument-given path — a `cursor/` head runs `gh pr edit <n> --body-file` after every push. The cursor-head firewall was not moved.
- Pin: `tests/unit/dev-toolchain/push-gate-evidence.test.ts` — `replaces gate evidence for a cursor/ head on the argument-given path`.

### 5. Ready brief heading [toolchain]

- `.cursor/hooks/lib/ready-brief-policy.mjs` `briefSection` — only a whole line `## Ready brief` starts the section.
- Pins: `.cursor/checks/ready-brief-policy.test.mjs` — `a prose mention of ## Ready brief is not the section` and `## Ready briefs is not the section`.

### 6. Dispatch project update [toolchain]

- `.cursor/agents/linear-resolver.md` PROJECT-UPDATE handoff and report block — accept `Dispatch run key:` beside the existing audit key.
- Pin: `tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts` — `accepts a Dispatch run key in the PROJECT-UPDATE handoff and report block`.

## Traceability (final)

Run: 2026-10-02 · plan: pr155_toolchain_contradictions · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 conduct-ban | dev-toolchain.md G-CON1 | `conduct-command.test.ts::excludes /conduct branch creation and route commands from the absolute ban` | `.cursor/rules/staging-accumulator.mdc` | P1 | shipped |
| C2 step-0c | dev-toolchain.md G-DES1 | `design-cloud-dialogue.test.ts::sends STEP 0C straight to the work-order and START without a Go ahead gate` | `.cursor/commands/design.md` | P1 | shipped |
| C3 pinned-gate-evidence | dev-toolchain.md G-PUB1 | `push-gate-evidence.test.ts::replaces gate evidence for a cursor/ head on the argument-given path` | `.cursor/commands/push.md` | P1 | shipped |
| C4 brief-heading | dev-toolchain.md G-RDY1 | `ready-brief-policy.test.mjs::a prose mention of ## Ready brief is not the section`; `ready-brief-policy.test.mjs::## Ready briefs is not the section` | `.cursor/hooks/lib/ready-brief-policy.mjs` | P1 | shipped |
| C5 findings-attach | dev-toolchain.md G-CR4 | `sdd-managed-findings.test.ts::keeps managed close-out attach-only and leaves new issues on the ledger` | `.cursor/commands/sdd-to-tdd.md` | P2 | shipped |
| C6 dispatch-handoff | dev-toolchain.md G-DSP1 | `dispatch-cloud-lane.test.ts::accepts a Dispatch run key in the PROJECT-UPDATE handoff and report block` | `.cursor/agents/linear-resolver.md` | P2 | shipped |

**manual-UAT (deferred):** none

## Run metrics

Run: 2026-10-02 → 2026-10-02 · plan: pr155_toolchain_contradictions
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 18 (Red, Green, Refactor for C1–C6)
Back-loops: none
BLOCKED events: none

## Docs sync packet

- plan_slug: pr155_toolchain_contradictions
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1, C2, C3, C4, C5, C6]
- criteria_manual_uat: none
- req_ids: [G-CON1, G-DES1, G-PUB1, G-RDY1, G-CR4, G-DSP1]
- source_paths: [.cursor/rules/staging-accumulator.mdc, .cursor/commands/design.md, .cursor/commands/push.md, .cursor/hooks/lib/ready-brief-policy.mjs, .cursor/commands/sdd-to-tdd.md, .cursor/agents/linear-resolver.md]
- test_paths: [tests/unit/dev-toolchain/conduct-command.test.ts, tests/unit/dev-toolchain/design-cloud-dialogue.test.ts, tests/unit/dev-toolchain/push-gate-evidence.test.ts, .cursor/checks/ready-brief-policy.test.mjs, tests/unit/dev-toolchain/sdd-managed-findings.test.ts, tests/unit/dev-toolchain/dispatch-cloud-lane.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr155_toolchain_contradictions.md
- drift_flagged: none
- skip_reason: no-implementation-impact

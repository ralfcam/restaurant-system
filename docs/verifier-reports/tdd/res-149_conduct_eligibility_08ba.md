# TDD log: res-149_conduct_eligibility_08ba

### C1

Suggested review order: eligibility exclusion order — [security] `.cursor/hooks/lib/ready-brief-policy.mjs:99` unanswered clarification, then `:102` migration, then `:105` RLS; queue contract — [public-api] `.cursor/commands/conduct.md:25` single exclusion sentence
Reusable pattern: A whole-file `assert.match` with a 160-character window passes on one occurrence; keep the exclusion sentence on the Queue bullet and do not clone it into Hard limits.

### C2

Suggested review order:
- Sensitive class vs exclusions [auth]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:99` clarification, migration, then RLS return excluded before any class check
  - `.cursor/hooks/lib/ready-brief-policy.mjs:108` `security` / `payment` / `auth` return `{ eligible: true, sensitive: true }`
- Label contract [security]
  - `.cursor/commands/conduct.md:21` Linear labels are not the queue; GitHub `sensitive` is an output
  - `.cursor/commands/conduct.md:27` regression test, GitHub `sensitive` label, and body line for those tickets
Reusable pattern: Keep policy-test phrases (`body line`, `GitHub \`sensitive\` label`) on one line; that suite matches a single space, not `\s`.

### C3

Suggested review order:
- QA must not ready a sensitive pull request [security]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:117` `qaMayReadyPr` denies a `sensitive` label
  - `.cursor/commands/conduct.md:154` QA posts the digest and waits for Jose
Reusable pattern: Conduct tests pin contiguous phrases (`digests the agent transcript`, `wait for Jose`); wrap after those phrases, not inside them.

### C4

Suggested review order:
- Auto-brief contract: `.cursor/commands/conduct.md:24` [public-api] · `.cursor/commands/conduct.md:133` · `.cursor/commands/conduct.md:190`
- Sensitive class on that return: `.cursor/hooks/lib/ready-brief-policy.mjs:98` · `.cursor/hooks/lib/ready-brief-policy.mjs:122` [security] · `.cursor/hooks/lib/ready-brief-policy.mjs:126`
- Dispatch gate claim removed: `.cursor/commands/dispatch.md:348` [security]
Reusable pattern: one `isSensitiveClass` predicate, then set `sensitive: true` only on the return that needs it, so the `auto_brief` and sensitive-only objects cannot drift.

### C5

Suggested review order:
- Design-first classification [public-api]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:117` `new-scope` or `/design` returns `{ eligible: true, reason: "design_first" }`
  - `.cursor/hooks/lib/ready-brief-policy.mjs:110` migration still returns `excluded_migration` before that check
- First PR has no application code [public-api]
  - `.cursor/commands/conduct.md:31` design-only first PR (spec + plan, no application code)
  - `.cursor/commands/dispatch.md:350` same sentence on the Cloud lane
Reusable pattern: Keep `design_first` immediately after the hard exclusions and before `auto_brief`, and pin the overlap with one record that is both new-scope (or `/design`) and an incomplete brief.

### C6

Suggested review order:
- Spec-amend eligibility [public-api]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:120` answered clarification plus missing spec returns `{ eligible: true, reason: "spec_amend" }`
  - [security] `.cursor/hooks/lib/ready-brief-policy.mjs:107` unanswered clarification still returns `excluded_clarification` before that
  - `.cursor/hooks/lib/ready-brief-policy.mjs:117` `design_first` still wins before `spec_amend`
- Permission is the missing-spec case [public-api]
  - `.cursor/commands/conduct.md:32` answered clarification, missing `spec`, amend, then write the brief
  - `.cursor/commands/sdd-to-tdd.md:197` same permission after the complete-brief rule
Reusable pattern: Keep the sdd-to-tdd allow-sentence on one physical line (the policy test matches it literally) and put conduct’s trigger before `first step`, with `then write the brief` inside the 240-character window.

### C7

Suggested review order:
- Pick gates before any eligible reason [public-api]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:116` not Todo returns `excluded_status`
  - `.cursor/hooks/lib/ready-brief-policy.mjs:119` not current cycle returns `excluded_cycle`
- Hard exclusions still win [security]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:113` RLS (clarification and migration above it) returns before those gates
  - `.cursor/hooks/lib/ready-brief-policy.mjs:123` `design_first` runs only after both gates
Reusable pattern: Fail closed on a one-value pick gate with `!==` (`status !== "Todo"`, `currentCycle !== true`) so a missing field is an exclusion, and keep those returns after RLS and before `design_first`.

### C8

Suggested review order:
- Sensitive flag on every eligible reason [security]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:106` `eligibleReason` adds `sensitive: true` only when the class flag is set
  - `.cursor/hooks/lib/ready-brief-policy.mjs:148` a complete brief returns `ready`, with the flag when sensitive
- Eligible-reason order [public-api]
  - `.cursor/hooks/lib/ready-brief-policy.mjs:132` `design_first`
  - `.cursor/hooks/lib/ready-brief-policy.mjs:139` `spec_amend`
  - `.cursor/hooks/lib/ready-brief-policy.mjs:146` `auto_brief`
Reusable pattern: One `eligibleReason(reason, sensitive)` builds `{ eligible: true, reason }` and sets `sensitive: true` only when the flag is set, so the four eligible returns cannot drift apart.

### C9

Suggested review order:
- Omitted completeness flag is an incomplete brief (`auto_brief`): `.cursor/hooks/lib/ready-brief-policy.mjs:142` [public-api]
- Explicit complete brief still returns `ready`: `.cursor/hooks/lib/ready-brief-policy.mjs:148`
- `sensitive` still rides that `auto_brief`: `.cursor/hooks/lib/ready-brief-policy.mjs:146`
Reusable pattern: Treat an omitted boolean completeness flag as incomplete with `flag !== true`, and the complete branch with `flag === true`, so a missing field cannot fall through past the incomplete branch.

### C10

Suggested review order: Step 7 route choice — [public-api] `.cursor/commands/conduct.md:146` `design_first` takes the Design route before the Code route
Reusable pattern: Keep the Step 7 `design_first` sentence on one line so `design route`, `/design`, `code route`, and `/sdd-to-tdd` stay inside the policy test’s 160/40/80/40 windows.

### C11

Suggested review order:
- Unknown spec path stops the amendment [security] — `.cursor/commands/sdd-to-tdd.md:199`
- Amend before the brief is written [public-api] — `.cursor/commands/conduct.md:148`
Reusable pattern: Keep the Step 7 `spec_amend` sentence on one line, and keep `exact spec path` within 40 characters of `` `## Permissions Requested` ``, so the ready-brief policy windows still match.

### C12

Suggested review order:
- Pick sequence [public-api]
  - `.cursor/commands/conduct.md:133` `classifyConductEligibility`
  - `.cursor/commands/conduct.md:134` `/dispatch` writes the brief before ranking
  - `.cursor/commands/conduct.md:135` re-read requires a complete brief
  - `.cursor/commands/conduct.md:136` lowest numeric `Queue:`
Reusable pattern: Keep `` `/conduct next` runs `/dispatch` to write the brief, then starts. `` on its own single-space line inside `### 6. Pick`.

## Suggested Review Order (collated)

- QA must not ready a sensitive PR [security] → `.cursor/hooks/lib/ready-brief-policy.mjs:157` (`qaMayReadyPr`); `.cursor/commands/conduct.md` (wait for Jose)
- Sensitive flag on every eligible reason [security] → `.cursor/hooks/lib/ready-brief-policy.mjs` `eligibleReason`
- Pick gates before any eligible reason [auth] → `.cursor/hooks/lib/ready-brief-policy.mjs` clarification, migration, RLS, status, cycle
- Spec-amend + unknown-path STOP [public-api] → `.cursor/commands/conduct.md` Step 7; `.cursor/commands/sdd-to-tdd.md`
- Auto-brief + design-first + pick classifier [public-api] → `.cursor/hooks/lib/ready-brief-policy.mjs`; `.cursor/commands/conduct.md` Step 6–7
- Dispatch no longer claims there is no priority/`security` gate [security] → `.cursor/commands/dispatch.md:348`
- G-CON1-only spec edit vs G-TD1 [schema] → `docs/specs/dev-toolchain.md` item 20

## Traceability (final)

Run: 2026-10-10 · plan: res-149_conduct_eligibility_08ba · issue: RES-149

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CON1 | ready-brief-policy.test.mjs::classifyConductEligibility excludes migration, RLS, and unanswered clarifications | ready-brief-policy.mjs, conduct.md, dispatch.md | P0 | shipped |
| C2 | G-CON1 | ready-brief-policy.test.mjs::security payment and auth tickets are sensitive-eligible | ready-brief-policy.mjs, conduct.md | P0 | shipped |
| C3 | G-CON1 | ready-brief-policy.test.mjs::qaMayReadyPr is false for a sensitive PR | ready-brief-policy.mjs, conduct.md | P0 | shipped |
| C4 | G-CON1 | ready-brief-policy.test.mjs::missing brief with priority auto-briefs via dispatch | ready-brief-policy.mjs, conduct.md, dispatch.md | P1 | shipped |
| C5 | G-CON1 | ready-brief-policy.test.mjs::new-scope and design-labelled tickets are design-first | ready-brief-policy.mjs, conduct.md, dispatch.md | P1 | shipped |
| C6 | G-CON1 | ready-brief-policy.test.mjs::answered clarification amends spec then completes the brief | ready-brief-policy.mjs, conduct.md, sdd-to-tdd.md | P1 | shipped |
| C7 | G-CON1 | ready-brief-policy.test.mjs::classifyConductEligibility excludes not-Todo and not-current-cycle | ready-brief-policy.mjs | P0 | shipped |
| C8 | G-CON1 | ready-brief-policy.test.mjs::complete briefs are ready and sensitive rides every eligible reason | ready-brief-policy.mjs | P0 | shipped |
| C9 | G-CON1 | ready-brief-policy.test.mjs::omitted briefComplete with priority auto-briefs | ready-brief-policy.mjs | P1 | shipped |
| C10 | G-CON1 | ready-brief-policy.test.mjs::step 7 routes design-first to design before the code route | conduct.md | P1 | shipped |
| C11 | G-CON1 | ready-brief-policy.test.mjs::step 7 amends the owning spec before dispatch writes the brief | conduct.md, sdd-to-tdd.md | P1 | shipped |
| C12 | G-CON1 | ready-brief-policy.test.mjs::pick classifies then dispatches before ranking Queue | conduct.md | P1 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-149_conduct_eligibility_08ba
Criteria: 12 shipped · 0 manual-uat · 12 total
Phases delegated: 36 (12 red, 12 green, 12 refactor)
Back-loops: CLI Pass 1 majors → C7–C12
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 18 left on ledger (15 below floor + 3 attach-only no match) plus C7–C12 run-file residuals — cap 3/run


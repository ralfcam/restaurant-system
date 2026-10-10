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

## Suggested Review Order (collated)

- QA must not ready a sensitive PR [security] → `.cursor/hooks/lib/ready-brief-policy.mjs:117` (`qaMayReadyPr`); `.cursor/commands/conduct.md:154` (wait for Jose)
- Sensitive class vs exclusions [auth] → `.cursor/hooks/lib/ready-brief-policy.mjs:99` clarification, then migration, then RLS, then class
- Spec-amend after answered clarification [public-api] → `.cursor/hooks/lib/ready-brief-policy.mjs:120`; `.cursor/commands/sdd-to-tdd.md:197`
- Auto-brief + design-first order [public-api] → `.cursor/hooks/lib/ready-brief-policy.mjs:117` `design_first` before `auto_brief`; `.cursor/commands/conduct.md:24`
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

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-149_conduct_eligibility_08ba
Criteria: 6 shipped · 0 manual-uat · 6 total
Phases delegated: 18 (6 red, 6 green, 6 refactor)
Back-loops: none
BLOCKED events: 0 — none
Issues: 0 filed · 0 attached-to-existing · 18 left on ledger (15 below floor + 3 attach-only no match) — cap 3/run


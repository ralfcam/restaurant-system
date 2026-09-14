# TDD log — g-cr3_4g_majors_da59fa0c

FIX: G-CR3 4G majors — just-ready `--undo` + Step 3/4 slices, US App ID 347564-only, `spawnSync` timeout, independent `pull.base` fixtures.

### C1

Suggested review order:
- [public-api] just-ready `--undo` (Step 4) · `.cursor/commands/ready-merge-release.md:107-111`
- [public-api] pre-ready re-read (Step 3) · `.cursor/commands/ready-merge-release.md:97-104`
- allowed-writes mirror · `.cursor/commands/ready-merge-release.md:6-10` (persona) · `:149-151` (constraints)
- [public-api] factory remote paragraph · `.cursor/rules/coderabbit-integration.mdc:51-65`

Reusable pattern: When wrapping `/ready-merge-release` or factory prose, keep `gh pr ready --undo` on one line — C1’s `includes("gh pr ready --undo")` fails if that token wraps.

### C2

Suggested review order:
- [security] US App ID pin — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:51-53` `isUsApp`
- [security] id coercion — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:43-45` `checkAppId`
- [security] shaped slug minus US id → `wrong_bot` — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:55-57` `isCodeRabbitShaped`; `:63-65` `isNonUsCodeRabbitApp`
- [security] check-run/suite gate — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:215-223` `evaluateReadyPr`
- C2 fixture — `tests/unit/dev-toolchain/fixtures/remote-coderabbit-slug-without-us-app-id.json:32`
- C2 `it` — `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:410-430`

Reusable pattern: Negative US-App fixtures must use a US-looking slug (`coderabbit`) with a non-US `app.id`; a clean `coderabbitai` + `347564` snapshot does not catch a slug-fallback regression in `isUsApp`

### C3

Suggested review order:
- [security] `repoFromEnv` `gh repo view` timeout · `.cursor/checks/coderabbit-pr-gate.mjs:66-73` (`timeout: 15_000` at `:72`)
- [security] `resolveToken` `gh auth token` timeout · `.cursor/checks/coderabbit-pr-gate.mjs:84-88` (`timeout: 15_000` at `:87`)
- C3 source pin (why literals stay duplicated) · `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:257-297`

Reusable pattern: A `new Function("process", …)` options-bag pin requires duplicated inline numeric `timeout` literals; a shared const/helper fails the pin even when runtime behavior matches.

### C4

Suggested review order:
- [schema] empty `base`, nonempty feature `head` · `tests/unit/dev-toolchain/fixtures/remote-staging-empty-base.json:7-8`
- [schema] omitted `base` · `tests/unit/dev-toolchain/fixtures/remote-staging-omitted-base.json:4-8`
- [schema] whitespace `base` · `tests/unit/dev-toolchain/fixtures/remote-staging-whitespace-base.json:7-8`
- [schema] emptiness-before-identity (do not weaken) · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:176-188` `isNonEmptyTrimmedString` / `isAllowedReadyPrShape`
- [schema] adapter fail-closed before review · `.cursor/checks/coderabbit-pr-gate.mjs:35-42` `assertBranchShape`
- six-name spawn pin · `tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts:222-258`

Reusable pattern: Clone a clean allowed snapshot and invert only `pull.base` (`head` stays a nonempty feature ref) so empty/omitted/whitespace `base` cannot hide behind a head-only spawn list

## Suggested Review Order (collated)

Highest-risk first.

1. **US App ID pin [security]** — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:51-53` `isUsApp` — App ID `347564` only; coderabbit-shaped slug without that id is `wrong_bot`.
2. **Check-run/suite gate [security]** — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:215-223` `evaluateReadyPr`.
3. **Just-ready `--undo` [public-api]** — `.cursor/commands/ready-merge-release.md:107-111` Step 4; already-ready drift STOP with no `--undo`.
4. **Pre-ready re-read [public-api]** — `.cursor/commands/ready-merge-release.md:97-104` Step 3 `gh pr view` + `headRefOid` vs `preReadyHead`.
5. **Factory remote paragraph [public-api]** — `.cursor/rules/coderabbit-integration.mdc:51-65`.
6. **`gh` spawnSync timeout [security]** — `.cursor/checks/coderabbit-pr-gate.mjs:66-73` and `:84-88`.
7. **Independent `pull.base` fixtures [schema]** — `tests/unit/dev-toolchain/fixtures/remote-staging-*-base.json`; emptiness-before-identity in `isAllowedReadyPrShape`.

## Traceability (final)

Run: 2026-09-14 · plan: g-cr3_4g_majors_da59fa0c · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR3 §9 just-ready `--undo` + Step 3/4 slices | coderabbit-gcr3-mustfixes.test.ts::ready-merge undoes on drift only when this invocation ran gh pr ready | `.cursor/commands/ready-merge-release.md`; `.cursor/rules/coderabbit-integration.mdc` | P1 | shipped |
| C2 | G-CR3 §9 App ID `347564` only | coderabbit-gcr3-mustfixes.test.ts::coderabbit-shaped GitHub App without App ID 347564 is wrong_bot | `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `isUsApp` | P1 | shipped |
| C3 | G-CR3 §9 `spawnSync` timeout | coderabbit-gcr3-mustfixes.test.ts::adapter gh spawnSync fallbacks set a finite timeout | `.cursor/checks/coderabbit-pr-gate.mjs` | P1 | shipped |
| C4 | G-CR3 §9 independent `base` fixtures | coderabbit-gcr3-mustfixes.test.ts::adapter rejects empty missing and whitespace base or head with wrong_base_head | fixtures only (`isAllowedReadyPrShape` unchanged) | P2 | shipped |

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr3_4g_majors_da59fa0c
Criteria: 4 shipped · 0 manual-uat · 4 total
Phases delegated: 12
Back-loops: none
BLOCKED events: none
Issues: none filed (16 this-run lines left on ledger; 98fd7524, e34d5ec1, 70d14352 untouched)

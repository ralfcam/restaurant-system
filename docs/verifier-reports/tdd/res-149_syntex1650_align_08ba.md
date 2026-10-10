# TDD log — res-149_syntex1650_align_08ba

### C26

Suggested review order: Billing signal allowlist — [security] `.cursor/hooks/lib/coderabbit-review-policy.mjs:227` `eventLooksBilling` type/status plus four text fields
Reusable pattern: Classify JSONL events from an allowlist of string fields (unwrap `error.message` when `error` is an object) instead of `JSON.stringify(event)`, so path tokens cannot trip the matcher.

### C23

Suggested review order: Eligibility gate — [public-api] `.cursor/hooks/lib/ready-brief-policy.mjs:132` `designComplete !== true` skips `design_first`
Reusable pattern: Add a later-route sentence after the pinned Step 7 sentence instead of editing inside a `{0,N}` window, and skip the existing reason with `flag !== true` so only strict `true` changes the classifier.

### C24

Suggested review order: Unknown-spec stop before the Pick amend — [security] `.cursor/commands/conduct.md:134`
Reusable pattern: When a ready-brief needle is the literal `STOP without`, insert `must` (`must STOP without`) instead of inflecting to `STOPs`, which drops the space the regex requires.

### C25

Suggested review order: Multiline Ready-brief fields — [public-api] `.cursor/hooks/lib/ready-brief-policy.mjs:17` `linesUntilNextField`
Reusable pattern: Keep continuation lines until the next `Label:` so Allowed edits can span paths without swallowing Verification.

### C27

Suggested review order: Cap leftover Critical/Major capture-and-push — [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:351` `decidePushCliAction`; [public-api] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:398` `renderCapturedBlockingFindings`
Reusable pattern: PR-body renderers default a missing payload (`= {}` / `= []`) and always emit the heading; optional lines are appended only when present.

## Suggested Review Order (collated)

1. [security] Cap leftover Critical/Major/unknown capture-and-push after two fix rounds — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:351` `decidePushCliAction`; unavailable still stops at `:332`
2. [security] Billing signal allowlist — `.cursor/hooks/lib/coderabbit-review-policy.mjs:227` `eventLooksBilling` type/status plus four text fields
3. [security] Unknown-spec stop before the Pick amend — `.cursor/commands/conduct.md:134`
4. [public-api] Jose heading renderer — `.cursor/hooks/lib/coderabbit-pr-policy.mjs:398` `renderCapturedBlockingFindings`
5. [public-api] Eligibility gate — `.cursor/hooks/lib/ready-brief-policy.mjs:132` `designComplete !== true` skips `design_first`
6. [public-api] Multiline Ready-brief fields — `.cursor/hooks/lib/ready-brief-policy.mjs:17` `linesUntilNextField`
7. Pass 3 / create-body / Operator next — `.cursor/commands/push.md:209`, `:316`, `:516`

## Traceability (final)

Run: 2026-10-10 · plan: res-149_syntex1650_align_08ba · issue: RES-149

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C26 | docs/specs/dev-toolchain.md G-CR2 | tests/unit/dev-toolchain/coderabbit-billing-detector.test.ts::eventLooksBilling matches error content not billing-named file paths | .cursor/hooks/lib/coderabbit-review-policy.mjs | P0 | shipped |
| C23 | docs/specs/dev-toolchain.md G-CON1 | .cursor/checks/ready-brief-policy.test.mjs::completed design leaves design_first and takes the code route | .cursor/hooks/lib/ready-brief-policy.mjs; .cursor/commands/conduct.md | P1 | shipped |
| C24 | docs/specs/dev-toolchain.md G-CON1 | .cursor/checks/ready-brief-policy.test.mjs::pick identifies the spec before spec-amend without a work-order listing | .cursor/commands/conduct.md | P1 | shipped |
| C25 | docs/specs/dev-toolchain.md G-RDY1 | .cursor/checks/ready-brief-policy.test.mjs::ready-brief fields keep continuation lines until the next label | .cursor/hooks/lib/ready-brief-policy.mjs | P1 | shipped |
| C27 | docs/specs/dev-toolchain.md G-CR2 | .cursor/checks/coderabbit-pr-policy.test.mjs::push CLI action routes two fix rounds then blocks majors | .cursor/hooks/lib/coderabbit-pr-policy.mjs; .cursor/commands/push.md | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-149_syntex1650_align_08ba
Criteria: 5 shipped · 0 manual-uat · 5 total
Phases delegated: 15
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 12 left on ledger (below floor / Cloud attach-only) — cap 3/run

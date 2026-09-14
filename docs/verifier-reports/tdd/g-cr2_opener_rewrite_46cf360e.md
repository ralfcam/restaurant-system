# TDD log — g-cr2_opener_rewrite_46cf360e

FIX: G-CR2 §8 opener is not an unqualified fail-closed on missing `complete.reviewedFiles` equality. Matching-list and dual-omission mint remain. `evaluateAgentStream` unchanged.

### C1

Suggested review order:
- G-CR2 opener contract [public-api]
  - `docs/specs/dev-toolchain.md:151-160`
- Regression-guard names the new `it`
  - `docs/specs/dev-toolchain.md:192-203`
- Pin inversion (lead vs body)
  - `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:305-325`
- Confirm no policy rewrite [security]
  - `.cursor/hooks/lib/coderabbit-review-policy.mjs:255-353` (`dualOmission` + matching `complete.reviewedFiles` mint unchanged)

Reusable pattern: Spec-lock that slices one numbered criterion, takes the fail-closed lead through the mint delimiter (`When every review_context`), forbids the old fail-closed tail after whitespace collapse, and still `toContain`s the mint MUST sentences in the body — so a later dual-omission `toContain` elsewhere cannot greenwash an unqualified opener

## Suggested Review Order (collated)

Highest-risk first.

1. **G-CR2 opener contract [public-api]** — `docs/specs/dev-toolchain.md:151-160` — fail-closed list ends at changed bytes; missing complete equality is not unqualified fail-closed; mint sentences follow.
2. **Confirm no policy rewrite [security]** — `.cursor/hooks/lib/coderabbit-review-policy.mjs:255-353` — `dualOmission` + matching `complete.reviewedFiles` mint unchanged.
3. **Pin inversion (lead vs body)** — `tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts:305-325` — lead forbids the old tail; body still requires dual-omission MUST and matching-list mint.
4. **Regression-guard names the new `it`** — `docs/specs/dev-toolchain.md:192-203`

## Traceability (final)

Run: 2026-09-14 · plan: g-cr2_opener_rewrite_46cf360e · issue: none

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR2 §8 opener + mint sentences | coderabbit-gcr2-empty-reviewed-files.test.ts::G-CR2 opener does not fail-closed on missing complete.reviewedFiles equality | docs/specs/dev-toolchain.md (opener); evaluateAgentStream unchanged | P1 | shipped |

## Run metrics

Run: 2026-09-14 → 2026-09-14 · plan: g-cr2_opener_rewrite_46cf360e
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached · 4 left on ledger (below floor/cap) — cap 3/run


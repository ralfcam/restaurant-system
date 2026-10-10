# TDD log — res-150_cli_evidence_integrity_5aa2

### C1

Suggested review order: HTML evidence marker bound to the head: `.cursor/hooks/lib/coderabbit-pr-policy.mjs:386` [security] · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:385` · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:378` · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:25` · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:403` [security]
Reusable pattern: Import `sha256Hex` from `coderabbit-review-policy.mjs` for CLI evidence hashes; marker preimage is `` `${head}\n${status}\n${digest}` ``.

### C4

Suggested review order: Stable identity (severity and vendor id omitted) [security] `.cursor/hooks/lib/coderabbit-review-policy.mjs:158` · `:161` · `:150` · `:127`
Reusable pattern: Pin `stableFindingKey` to `digest-findings.json` `keys`; do not use vendor `id`.

### C2

Suggested review order: Evidence hash binds the digest [security] `.cursor/hooks/lib/coderabbit-review-policy.mjs:179` · `:166` · `.cursor/hooks/lib/coderabbit-pr-policy.mjs:390` [public-api]
Reusable pattern: Keep `stableFindingKey` and `canonicalFindingsDigest` on one private preimage (`file|startLine-endLine|normalised title`); the digest only prefixes `severity|`.

### C3

Suggested review order: anti-downgrade gate [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:464` `chooseCliEvidence` · `:430` rank · `:443` per-key drop
Reusable pattern: Bound anti-downgrade high/low bands to `CLI_EVIDENCE_SEVERITY_RANK.major` and `.minor`, not raw 2/3.

### C5

Suggested review order: preserve CLI evidence across a gate-body replace [security] `.cursor/hooks/lib/gate-evidence-policy.mjs:30` · `:39` · `:43`
Reusable pattern: When a PR-body replace deletes through the next h2, copy `<!-- coderabbit-cli-evidence:... -->` markers out of that span first.

### C6

Suggested review order: batch member order [security] `.cursor/hooks/lib/coderabbit-review-policy.mjs:179` · digest `:183` · hash `:191` · human lines `.cursor/hooks/lib/coderabbit-pr-policy.mjs:393`
Reusable pattern: One `sortedBatchMembers` copy-and-sort feeds both the human `number: head` lines and the member digest.

### C8

Suggested review order: Push disposition gate [security] `.cursor/hooks/lib/coderabbit-pr-policy.mjs:410` · `:417` · `:445` · `:326`
Reusable pattern: none

## Suggested Review Order (collated)

Highest-risk first.

- [security] Evidence marker + digest hash — `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `renderCliEvidenceBlock`; `.cursor/hooks/lib/coderabbit-review-policy.mjs` `cliEvidenceHash` / `canonicalFindingsDigest` / `stableFindingKey`
- [security] Same-head anti-downgrade — `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `chooseCliEvidence`
- [security] Critical/Major dispositions — `.cursor/hooks/lib/coderabbit-pr-policy.mjs` `decidePushCliAction`
- [security] PR-body preserve — `.cursor/hooks/lib/gate-evidence-policy.mjs` `replaceGateEvidence`
- [public-api] batch_covered member heads — `renderCliEvidenceBlock` + `sortedBatchMembers`

## Traceability (final)

Run: 2026-10-10 · plan: res-150_cli_evidence_integrity_5aa2 · issue: RES-150

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| C1 | G-CR2 HTML marker | coderabbit-cli-evidence-integrity.test.ts::renders an HTML evidence marker bound to the head | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0 | shipped |
| C4 | G-CR2 stableFindingKey | coderabbit-cli-evidence-integrity.test.ts::records a stable finding key that ignores severity | .cursor/hooks/lib/coderabbit-review-policy.mjs | P0 | shipped |
| C2 | G-CR2 cliEvidenceHash | coderabbit-cli-evidence-integrity.test.ts::binds a canonical findings digest into the evidence hash | .cursor/hooks/lib/coderabbit-review-policy.mjs | P0 | shipped |
| C3 | G-CR2 chooseCliEvidence | coderabbit-cli-evidence-integrity.test.ts::same-head rerun with no diff cannot downgrade the result | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0 | shipped |
| C5 | G-CR2 replaceGateEvidence | coderabbit-cli-evidence-integrity.test.ts::replaceGateEvidence preserves the HTML evidence marker | .cursor/hooks/lib/gate-evidence-policy.mjs | P1 | shipped |
| C6 | G-CR2 batch_covered | coderabbit-cli-evidence-integrity.test.ts::batch PRs record batch_covered member heads | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P1 | shipped |
| C8 | G-CR2 dispositions | coderabbit-cli-evidence-integrity.test.ts::Critical and Major require a disposition before push | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-150_cli_evidence_integrity_5aa2
Criteria: 7 shipped · 0 manual-uat · 7 total
Phases delegated: 21
Back-loops: none
BLOCKED events: none
Issues: 0 filed · 0 attached-to-existing · 21 left on ledger (below floor / attach-only) — cap 3/run

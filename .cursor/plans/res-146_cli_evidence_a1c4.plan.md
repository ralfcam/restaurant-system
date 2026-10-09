# /sdd-to-tdd RES-146 — CodeRabbit CLI evidence

Managed Cloud one-shot on `cursor/res-126-bf39` (PR #201). Spike: cursor GitHub App token POST issue comment on PR 201 returned HTTP 403. Trigger dropped.

Verification: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs .cursor/checks/coderabbit-review-policy.test.mjs && pnpm test:unit tests/unit/dev-toolchain/`

## Acceptance Criteria → Tests

| #   | Criterion                                                                   | Test file                                                   |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C1  | Missing CLI is `cli_missing`; signed pin 0.9.0                              | `.cursor/checks/coderabbit-review-policy.test.mjs`          |
| C2  | Bot skip and stale approval follow head CLI evidence                        | `.cursor/checks/coderabbit-pr-policy.test.mjs`              |
| C3  | `/push` is the only agent gate and leaves a draft; QA `ralfcam` marks ready | `tests/unit/dev-toolchain/coderabbit-res146-guards.test.ts` |
| C4  | `--fix-round` capped at 2: three CLI passes, pass 2 capture-only pushes     | `.cursor/checks/coderabbit-pr-policy.test.mjs`              |

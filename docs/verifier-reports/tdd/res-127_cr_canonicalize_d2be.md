# TDD log — res-127_cr_canonicalize_d2be

## G-TD1-4-collapse — collapse before the protected-prefix match

Suggested review order: collapse before the prefix match [security] `.cursor/hooks/lib/tdd-guard-policy.mjs:322` (checkout relativize and leading-slash strip) → `:327` (`path.posix.normalize`) → `:329` (`..` left unchanged). One normalized decision [security] `.cursor/hooks/lib/tdd-guard-policy.mjs:363` (`checkTddWrite` uses that string for the spec check, the exact disarm allow, and the protected-prefix match).

Reusable pattern: Relativize to this checkout, collapse `.`, `..`, and repeated slashes once with `path.posix.normalize`, and point every allow/deny branch at that single string.

## Suggested Review Order (collated)

- Collapse before the prefix match [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs:322` checkout relativize and leading-slash strip, `:327` `path.posix.normalize`, `:329` `..` left unchanged
- One normalized decision [security] → `.cursor/hooks/lib/tdd-guard-policy.mjs:363` `checkTddWrite`
- G-TD1 item 4 collapse sentence and the evidence row → `docs/specs/dev-toolchain.md` G-TD1
- Depth-0 `..` spawn plus the pure pins → `tests/unit/dev-toolchain/tdd-guard-liveness.test.ts` "armed depth 0 denies a Write that reaches the guard script through .."

## Traceability (final)

Run: 2026-10-10 · plan: res-127_cr_canonicalize_d2be · issue: RES-127

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --------- | -------- | --------------- | -------------- | ---- | ------ |
| G-TD1-4-collapse | docs/specs/dev-toolchain.md G-TD1 item 4 | tests/unit/dev-toolchain/tdd-guard-liveness.test.ts::armed depth 0 denies a Write that reaches the guard script through .. | .cursor/hooks/lib/tdd-guard-policy.mjs normalize, checkTddWrite | P0 | shipped |

## Run metrics

Run: 2026-10-10 → 2026-10-10 · plan: res-127_cr_canonicalize_d2be
Criteria: 1 shipped · 0 manual-uat · 1 total
Phases delegated: 3 (tdd-red, tdd-green, tdd-refactor)
Back-loops: none
BLOCKED events: 0
Issues: 0 filed · 0 attached-to-existing · 1 left on ledger (below floor; checkout re-entry after `..`) — cap 3/run
In-loop CodeRabbit fix: START skipped, CLOSE-OUT skipped.

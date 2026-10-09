# TDD log — pr200_cr_push_rounds_567e

Run: 2026-10-09 · plan: pr200_cr_push_rounds_567e · issue: none

## C1

Suggested review order: `resolvePushPriorRound` → `--fix-round` → leftover record
Reusable pattern: keep the remediation cycle across the fix commit; do not reset on HEAD alone.

## C2

Suggested review order: `evaluateReadyPrCore` in-progress before `formalElsewhere`
Reusable pattern: fixture with older-head CHANGES_REQUESTED plus in-progress on head.

## C3

Suggested review order: `decidePushCliAction` routes only when `sddToTdd` is nonempty
Reusable pattern: Minor/Trivial `capture_and_push`.

## C4

Suggested review order: `push.md` Step 1a merge then rerun lint/typecheck/unit
Reusable pattern: do not write gate evidence on an untested merged HEAD.

## C5

Suggested review order: `--review-wait-expired` on the adapter and Step 4
Reusable pattern: map `review_in_progress` to `ready_no_coderabbit_review`; formal reviews still apply.

## C6

Suggested review order: `isSecretPath(".env.example")` → branch-diff `secret_path` advisory
Reusable pattern: `/push` records non-zero / `secret_path` and continues.

## C7

Suggested review order: G-CR2 `cli_paused` sentence scoped to the work-order path
Reusable pattern: `--branch-diff` still attempts the review.

## Suggested Review Order (collated)

1. `resolvePushPriorRound` / `--fix-round`
2. `evaluateReadyPrCore` in-progress before stale
3. `decidePushCliAction` capture-and-push
4. `push.md` post-merge gate rerun
5. `--review-wait-expired`
6. `.env.example` / advisory `secret_path`
7. G-CR2 work-order-only `cli_paused`

## Traceability (final)

| Criterion | Spec ref | Test file::name | Source file(s) | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| C1 | G-CR2 one fix round | coderabbit-gate.test.mjs::route then new head is leftover after one fix round | coderabbit-review-policy.mjs, coderabbit-gate.mjs | P1 | shipped |
| C2 | G-CR3 in-progress first | coderabbit-pr-policy.test.mjs::older-head CHANGES_REQUESTED plus in-progress on head is review_in_progress | coderabbit-pr-policy.mjs | P1 | shipped |
| C3 | G-CR2 severity-only push | coderabbit-pr-policy.test.mjs::push CLI action routes one fix round then leftover-pushes | coderabbit-pr-policy.mjs, push.md | P2 | shipped |
| C4 | G-CR2 post-merge gate | push-gate-evidence.test.ts::reruns lint typecheck and unit after a firewall merge | push.md | P2 | shipped |
| C5 | G-CR3 expired wait | coderabbit-pr-policy.test.mjs::review-wait-expired maps review_in_progress to ready_no_coderabbit_review | coderabbit-pr-policy.mjs, coderabbit-pr-gate.mjs, ready-merge-release.md | P2 | shipped |
| C6 | G-CR2 secret_path | coderabbit-review-policy.test.mjs::unrelatedDirtyPaths and secret paths fail the work-order | coderabbit-review-policy.mjs, coderabbit-gate.mjs, push.md | P2 | shipped |
| C7 | G-CR2 work-order cli_paused | coderabbit-gcr2-empty-reviewed-files.test.ts::G-CR2 makes local review outcomes advisory but keeps deterministic safety hard | docs/specs/dev-toolchain.md | P2 | shipped |

## Run metrics

Criteria: 7 shipped · 0 manual-uat · 7 total
Phases delegated: in-run harness (`.cursor/checks` suite)
Back-loops: none
BLOCKED events: none
Issues: n/a

## Docs sync packet

- plan_slug: pr200_cr_push_rounds_567e
- spec: docs/specs/dev-toolchain.md
- mode: FIX
- linear_issue: none
- criteria_shipped: [C1, C2, C3, C4, C5, C6, C7]
- criteria_manual_uat: none
- req_ids: [G-CR2, G-CR3]
- source_paths: [.cursor/hooks/lib/coderabbit-pr-policy.mjs, .cursor/hooks/lib/coderabbit-review-policy.mjs, .cursor/checks/coderabbit-gate.mjs, .cursor/checks/coderabbit-pr-gate.mjs, .cursor/commands/push.md, .cursor/commands/ready-merge-release.md]
- test_paths: [.cursor/checks/coderabbit-gate.test.mjs, .cursor/checks/coderabbit-pr-policy.test.mjs, .cursor/checks/coderabbit-review-policy.test.mjs, tests/unit/dev-toolchain/push-gate-evidence.test.ts, tests/unit/dev-toolchain/coderabbit-gcr2-empty-reviewed-files.test.ts]
- architecture_touch: none
- uat_flows_to_stamp: none
- patterns_to_promote: none
- traceability_log: docs/verifier-reports/tdd/pr200_cr_push_rounds_567e.md
- drift_flagged: none
- skip_reason: none

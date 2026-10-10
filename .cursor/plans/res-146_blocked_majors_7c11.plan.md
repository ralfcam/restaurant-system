# RES-146 — Critical and Major CLI findings block the push

Work-order for the managed-Cloud one-shot. No second START or CLOSE-OUT.

## Criterion

C6 (P0). A Critical, Major, or unknown CodeRabbit CLI finding blocks `git push`.
It is fixed through `/sdd-to-tdd` and is never a leftover and never a ledger
line. After two fix rounds, `decidePushCliAction` returns `action: stop` and
`record: blocked_major_findings`. Only Minor and Trivial may be captured and
pushed.

C6a (P0). `hasCleanCliEvidence` does not treat author-editable PR body text as
a clean CLI pass. `ready_cli_evidence` requires the ignored gate receipt
(`head` equals the pull-request head and `attemptStatus` is `clean`).

C6b (P0). `commentMentionsHead` does not match a head when the notice has no
SHA. A notice matches only when its commit id is that head or its body
contains that head SHA.

## Permissions

- `docs/specs/dev-toolchain.md`
- `docs/runbooks/coderabbit.md`
- `docs/testing/Design-And-Patterns.md`
- `docs/findings/runs/res-146_cli_leftovers.md` (delete the two open major lines)
- `.cursor/commands/push.md`
- `.cursor/commands/ready-merge-release.md`
- `.cursor/rules/coderabbit-integration.mdc`
- `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
- `.cursor/hooks/lib/coderabbit-review-policy.mjs`
- `.cursor/checks/coderabbit-pr-gate.mjs`
- `.cursor/checks/coderabbit-pr-policy.test.mjs`
- `.cursor/checks/coderabbit-gate.test.mjs`
- `.cursor/checks/coderabbit-review-policy.test.mjs`
- `.cursor/checks/fixtures/coderabbit/remote-skip-*.json`
- `tests/unit/dev-toolchain/coderabbit-res146-guards.test.ts`

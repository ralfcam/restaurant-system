# /sdd-to-tdd bug: CodeRabbit findings on PR #199

Managed Cloud in-loop fix. `agent/runtime` = `managed`. Stay on
`cursor/res-145-1771`. Skip START and CLOSE-OUT. Local refs
`cr-comment:v1:a7520cb73930395d134253e2` and
`cr-comment:v1:bb7047a623565e1fe12bb659`.

## Execution Protocol (MANDATORY — read first when executing this plan)

You are the **orchestrator**, not an implementer. Direct writes are the spec
edit in `docs/specs/dev-toolchain.md`, this plan, and the close-out sections
in `docs/verifier-reports/tdd/res-145_loop_finding_slice_c2e1.md`. Every test
change comes from `tdd-red`. Every source change comes from `tdd-green`.
Cleanup comes from `tdd-refactor`. Do not pass `model` on Task. Do not edit
`tests/**`, `lib/**`, `app/**`, `components/**`, `hooks/**`, `src/**`, or
`supabase/**`. The owning suite is `.cursor/checks/`, which is not a
protected prefix; Red is pre-authorized to add one test there and must not
modify existing tests. Arm the guard before the spec edit. Phase stays null
for the spec edit. Set `phase red` before Red and `phase green` before
Green. Clear the phase after Refactor. In-loop: no START, no CLOSE-OUT.
Then docs sync, ledger notes, format, STEP 4G, `/commit`, `/push`. Never
`gh pr ready`. Never `gh pr merge`.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot, in-loop)
- Workflow mode: FIX
- Branch: `cursor/res-145-1771` (do not switch)

## Project & Milestone Route

- Team RES, project restaurant-system V-0.5, milestone M4 already set.
- No Linear state write. No START comment.

## Issue & Root Cause (FIX mode only)

- Invocation: `bug: CodeRabbit finding cr-comment:v1:a7520cb73930395d134253e2 and cr-comment:v1:bb7047a623565e1fe12bb659 on PR #199`.
- Observed: PR 199 review `5469144388` on head `f8a65dde58a99be3d36feaca115ff3fea0efaa9e` is `CHANGES_REQUESTED` with two unresolved threads on `.cursor/hooks/lib/coderabbit-pr-policy.mjs`. The adapter reports `unresolved_threads`, severity `unknown`, `roundsUsed` 1, `roundCap` 3.
- Evidence in current code: `collectChangesRequestedBodyFindings` returns `[]` when `isQuietModeWalkthroughBody` is true, so a tagged `cr-comment` outside the walkthrough is dropped and the verdict stays `changes_requested_meta_only`. `detailsBlockFrom` returns the whole file block, and `parseLoopSeverity` then keeps the first severity and the first backtick line for every id in that block.
- Expected: each tagged finding outside the walkthrough is collected, and its severity and line come only from the text after the previous `cr-comment:v1` tag in that file block through its own tag.
- Hypothesis: G-CR4 names the tokens and the walkthrough exclusion, and does not require a per-finding slice or a finding that survives a quiet-walkthrough marker. One confirmed cause. No second hypothesis.

## Spec

- `docs/specs/dev-toolchain.md` G-CR4. Add the per-finding slice and the outside-walkthrough collection rule. Do not change non-loop verdicts.

## Acceptance Criteria → Tests

### C2 — per-finding slice outside a walkthrough (P0)

- Behavior: under `--loop`, a `CHANGES_REQUESTED` body that is a quiet-mode walkthrough (`Actionable comments posted: 0`) and then one file block containing a Minor finding followed by a Critical finding returns `changes_requested_body_findings`. The Minor keeps line 10, severity `minor`, and `/capture`. The Critical keeps line 20, severity `critical`, and `/sdd-to-tdd`. Without `--loop` the same snapshot stays `changes_requested`.
- Test: `.cursor/checks/coderabbit-pr-policy.test.mjs` :: `walkthrough plus mixed severities in one file block keeps each finding`
- Build the snapshot with the existing `commentedBodySnapshot` helper. Do not edit existing tests. Do not add a fixture file.
- Command: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs`

Body to embed:

```
<!-- This is an auto-generated comment: summarize by coderabbit.ai -->
## Walkthrough
Meta only.
Actionable comments posted: 0

<details>
<summary>app/actions/guest-profiles.ts (2)</summary>
<blockquote>

`10-10`: **Stability** | **🟡 Minor** | **Quick win**

**First finding.**

<!-- cr-comment:v1:mixed-minor -->

`20-20`: **Stability** | **🔴 Critical** | **Quick win**

**Second finding.**

<!-- cr-comment:v1:mixed-critical -->

</blockquote></details>
```

## Traceability Matrix

| Criterion | Spec                   | Test                                                                                                  | Source                                     | Risk |
| --------- | ---------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---- |
| C2        | dev-toolchain.md G-CR4 | coderabbit-pr-policy.test.mjs::walkthrough plus mixed severities in one file block keeps each finding | .cursor/hooks/lib/coderabbit-pr-policy.mjs | P0   |

## Execution Preconditions

- Guard armed, phase null for the spec edit.
- Existing C1 tests stay unchanged and green.

## Permissions Requested (before execution)

- `docs/specs/dev-toolchain.md`
- `.cursor/checks/coderabbit-pr-policy.test.mjs` (add one test only)
- `.cursor/hooks/lib/coderabbit-pr-policy.mjs`
- Close-out docs the updater already owns: `docs/dev-journal.md`, `docs/findings/security.md`, `docs/verifier-reports/tdd/res-145_loop_finding_slice_c2e1.md`

## TDD Execution Loop

1. Spec edit (orchestrator, phase null).
2. Red C2. Exit: the new test fails because the reason is `changes_requested_meta_only` or the Critical is classified as `minor`. Existing tests still pass.
3. Green C2. Exit: the new test and the existing policy tests pass. No test edits.
4. Refactor. Exit: same tests pass; no behavior change.

Verification: `node --test .cursor/checks/coderabbit-pr-policy.test.mjs .cursor/checks/coderabbit-gate.test.mjs && pnpm test:unit tests/unit/dev-toolchain/coderabbit-gcr3-mustfixes.test.ts tests/unit/dev-toolchain/conduct-command.test.ts`

## Manual-UAT

None.

## Docs Sync

Packet after Refactor. In-loop skips START and CLOSE-OUT. Ledger: the two open security lines for this file are the defects C2 fixes; mark them done only if the suite proves the fix. Do not file new Linear issues.

## Out-of-Scope Findings

- Inline thread headers of the form `**🟠 Major**` are parsed as `unknown` by `parseCodeRabbitSeverity`, which only reads `| _Major_ |` on the first line. That mis-route is not C2. Leave it unless a later criterion names it.

## Linear Close-out

Skipped. In-loop fix from `/conduct`.

---
name: pr246_cr_depth_capture_07df
overview: Capture CodeRabbit r4282829823 (PR #246) to the security ledger
todos:
  - id: security-phase5
    content: docs-updater appends one line to docs/findings/security.md
    status: pending
isProject: false
---

## Execution Protocol (MANDATORY — read first when executing this plan)

You are a **capture orchestrator, not an implementer**. When this plan is executed:

- The **only** write you may cause is one `docs-updater` Task call that appends to `docs/findings/security.md`.
- You MUST NOT edit `docs/specs/**`, `app/**`, `components/**`, `hooks/**`, `lib/**`, `src/**`, `supabase/**`, or `tests/**` yourself, and MUST NOT delegate a subagent to do so.
- "Implement the plan" means only the PHASE 5 Execution Todo below.
- If you cannot delegate (the Task tool is unavailable) or a required subagent is missing, STOP and report.

## Mode Check

- Plan Mode: CLOUD-MANAGED (one-shot)
- Cloud runtime: `agent/runtime` = managed
- Work-order: `.cursor/plans/pr246_cr_depth_capture_07df.plan.md`
- Input source: operator instruction (PR #246 fix round 2) quoting CodeRabbit comment r4282829823

## Input Summary

- Items parsed: 1
- By class (operator tags): other 1 (Security, Major per CodeRabbit)

## Validation Summary

**[shared-depth-shell-write] Do not authorize parent Shell writes from shared depth** — verdict: capture

- Evidence: `.cursor/hooks/git-stage-guard.mjs:73-77` passes shared `getDepth()` / `getPhase()` to `checkProtectedShellWrite`; `.cursor/hooks.json` bumps depth on every `subagentStart`; `.cursor/checks/task-availability-policy.test.mjs` pins `echo ok > lib/foo.ts` as allowed at depth 1 in green.
- Refined: Functional · med · spec silent · `docs/specs/dev-toolchain.md` criterion 34 (G-SH1) names depth/phase as a best-effort stand-in and the caller bind as a separate ledgered finding.
- Note: the first validator pass returned `route-away:clarify` against the draft G-SH1 wording, which had implied shared depth was delegation proof. G-SH1 was reworded to state the limitation and the validator re-issued `capture`.

## Capture Plan

**[shared-depth-shell-write] Do not authorize parent Shell writes from shared depth** — class: Functional · `docs/findings/security.md`

- Validation: capture · evidence: `.cursor/hooks/git-stage-guard.mjs:74`
- Proposed: see the planned delegation below.
- Labels (for triage/resolver): `feedback`
- Reconcile: new

Reason for capturing instead of fixing: no hook payload field that identifies the calling subagent has been observed (see `.cursor/rules/hook-authoring.mdc`), so binding protected writes to a proven `tdd-*` caller cannot be done minimally. The same shared-depth model is what `tdd-delegation-guard` uses for Write on staging, and on Cloud depth stays 0 because no subagent hook events fire.

### Planned delegations (grouped by target file)

**`docs/findings/security.md`** — `docs-updater` applies in order:

- `append [shared-depth-shell-write]` · `- [ ] Do not authorize parent Shell writes from shared depth · `.cursor/hooks/git-stage-guard.mjs:74` `checkProtectedShellWrite`· spec: docs/specs/dev-toolchain.md · every subagentStart bumps one shared depth (including the background linear-resolver START), so the parent can Shell-write`lib/foo.ts` at depth 1 during Green; binding the allow to a proven tdd-* caller needs a hook payload field that identifies the subagent and none has been observed; the same shared-depth model is what tdd-delegation-guard uses for Write on staging, and on Cloud depth stays 0 · med · (found: coderabbit/PR/126fb8cccf76467aaf586f902cd09ffafc91a2d0/cr-comment:v1:f280666afb93f3a91bf027f2)`

## PHASE 5 Execution Todos

| Todo id           | Delegation                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `security-phase5` | Invoke `docs-updater`: apply 1 write to `docs/findings/security.md` (`append [shared-depth-shell-write]`), line stamped as proposed above |

## Clarifications Needed

none

## Routed Elsewhere

none

## Next in the Cycle

→ /triage

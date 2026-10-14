#!/usr/bin/env node
/**
 * CLI control for the sdd-to-tdd delegation guard. Run via the Shell tool:
 *   node .cursor/hooks/tdd-guard.mjs on              → arm (orchestrator's first exec action)
 *   node .cursor/hooks/tdd-guard.mjs off             → disarm (orchestrator's last exec action)
 *   node .cursor/hooks/tdd-guard.mjs phase <name>    → set the active phase (red|green|refactor|clear)
 *   node .cursor/hooks/tdd-guard.mjs gate open       → clear loopRan so /commit can proceed
 *   node .cursor/hooks/tdd-guard.mjs evidence …      → record/check START + R/G/R evidence
 *   node .cursor/hooks/tdd-guard.mjs fingerprint …   → append tool-surface line to the run file
 *   node .cursor/hooks/tdd-guard.mjs status          → print current state
 *
 * While armed, .cursor/hooks/tdd-delegation-guard.mjs (preToolUse) blocks the
 * parent orchestrator from editing tests/source directly; subagent edits pass.
 * When a phase is set, the same hook also enforces phase-scoped write scope on
 * the currently-running subagent: red → tests/ only; green/refactor → no tests/.
 */
import {
  arm,
  disarm,
  status,
  setPhase,
  clearPhase,
  openCommitGate,
  recordStartEvidence,
  recordPhaseEvidence,
  setRequiredCriteria,
  evaluatePhaseEvidence,
  appendRunFileFingerprint,
  defaultFingerprintTools,
  isTaskAvailable,
} from "./lib/tdd-guard-policy.mjs"

const cmd = (process.argv[2] || "status").toLowerCase()

switch (cmd) {
  case "on":
    arm()
    console.log(
      "tdd-guard: ARMED — orchestrator direct edits to tests/source are now blocked; delegate to tdd-* subagents.",
    )
    break
  case "off":
    disarm()
    console.log("tdd-guard: DISARMED — direct edits allowed again.")
    break
  case "phase": {
    const phase = (process.argv[3] || "").toLowerCase()
    if (phase === "clear" || phase === "") {
      clearPhase()
      console.log("tdd-guard: phase cleared.")
    } else if (["red", "green", "refactor"].includes(phase)) {
      setPhase(phase)
      console.log(
        `tdd-guard: phase set to "${phase}" — ${phase === "red" ? "subagent writes restricted to tests/" : "subagent writes to tests/ blocked"}.`,
      )
    } else {
      console.error(
        `tdd-guard: unknown phase "${phase}" — expected red|green|refactor|clear.`,
      )
      process.exitCode = 1
    }
    break
  }
  case "gate": {
    const action = (process.argv[3] || "").toLowerCase()
    if (action === "open") {
      const exemptIdx = process.argv.indexOf("--exempt")
      const exemption =
        exemptIdx === -1
          ? null
          : (process.argv[exemptIdx + 1] || "").toLowerCase()
      if (
        exemption &&
        exemption !== "docs-artifact" &&
        exemption !== "gate-remediation"
      ) {
        console.error(
          `tdd-guard: unknown --exempt "${exemption}" — expected docs-artifact|gate-remediation.`,
        )
        process.exitCode = 1
        break
      }
      openCommitGate(exemption)
      console.log(
        exemption
          ? `tdd-guard: commit gate open (exempt ${exemption}) — git commit is allowed until the next TDD loop.`
          : "tdd-guard: commit gate open — git commit is allowed until the next TDD loop.",
      )
    } else {
      console.error(
        `tdd-guard: unknown gate action "${action}" — expected open.`,
      )
      process.exitCode = 1
    }
    break
  }
  case "fingerprint": {
    const planIdx = process.argv.indexOf("--plan")
    const toolsIdx = process.argv.indexOf("--tools")
    const planSlug = planIdx === -1 ? "" : process.argv[planIdx + 1] || ""
    const tools =
      toolsIdx === -1
        ? defaultFingerprintTools()
        : (process.argv[toolsIdx + 1] || "")
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
    const result = appendRunFileFingerprint({
      planSlug,
      tools,
      taskAvailable: isTaskAvailable(),
    })
    if (!result.ok) {
      console.error(
        `tdd-guard: cannot write tool-surface fingerprint — ${result.reason}. Expected: fingerprint --plan <slug> [--tools Task,Write,...].`,
      )
      process.exitCode = 1
      break
    }
    console.log(result.line)
    break
  }
  case "evidence": {
    const sub = process.argv[3] || ""
    if (sub === "start") {
      recordStartEvidence()
      console.log("tdd-guard: recorded START evidence.")
      break
    }
    if (sub === "require") {
      const ids = (process.argv[4] || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
      const requireStart = process.argv.includes("--start")
      setRequiredCriteria(ids, requireStart)
      console.log(
        `tdd-guard: required criteria ${ids.join(", ") || "(none)"}` +
          `${requireStart ? " (START required)" : ""}.`,
      )
      break
    }
    if (sub === "check") {
      const s = status()
      const criteriaIdx = process.argv.indexOf("--criteria")
      const ids =
        criteriaIdx === -1
          ? s.requiredCriteria
          : (process.argv[criteriaIdx + 1] || "")
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
      const requireStart =
        process.argv.includes("--require-start") || s.requireStart
      const result = evaluatePhaseEvidence({
        criteria: ids,
        evidence: s.phaseEvidence,
        requireStart,
      })
      if (!result.ok) {
        const detail =
          result.reason === "missing_phase"
            ? `${result.reason} ${result.criterion}/${result.phase}`
            : result.reason
        console.error(
          `tdd-guard: CHANGES-REQUESTED — skipped phase evidence (${detail}).`,
        )
        process.exitCode = 1
        break
      }
      console.log("tdd-guard: phase evidence complete.")
      break
    }
    const criterion = sub
    const phase = (process.argv[4] || "").toLowerCase()
    const agentIdx = process.argv.indexOf("--agent-id")
    const agentId = agentIdx === -1 ? "" : process.argv[agentIdx + 1] || ""
    const recorded = recordPhaseEvidence(criterion, phase, agentId)
    if (!recorded.ok) {
      console.error(
        `tdd-guard: cannot record evidence — ${recorded.reason}. Expected: evidence <criterion> red|green|refactor --agent-id <Task agentId>.`,
      )
      process.exitCode = 1
      break
    }
    console.log(`tdd-guard: recorded ${phase} evidence for ${criterion}.`)
    break
  }
  case "status":
  default: {
    const s = status()
    console.log(
      `tdd-guard: ${s.armed ? "ARMED" : "disarmed"} (subagent depth=${s.depth}, phase=${s.phase || "none"})`,
    )
    break
  }
}

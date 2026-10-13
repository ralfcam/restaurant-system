#!/usr/bin/env node
/**
 * CLI control for the sdd-to-tdd delegation guard. Run via the Shell tool:
 *   node .cursor/hooks/tdd-guard.mjs on              → arm (orchestrator's first exec action)
 *   node .cursor/hooks/tdd-guard.mjs off             → disarm (orchestrator's last exec action)
 *   node .cursor/hooks/tdd-guard.mjs phase <name>    → set the active phase (red|green|refactor|clear)
 *   node .cursor/hooks/tdd-guard.mjs gate open       → clear loopRan so /commit can proceed
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
  markTaskSucceeded,
  markTaskUnavailable,
  recordStartEvidence,
  setRequiredCriteria,
  recordPhaseEvidence,
  evaluatePhaseEvidence,
  appendRunFileFingerprint,
  recordDisarm,
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
    recordDisarm("off")
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
  case "task": {
    const sub = (process.argv[3] || "").toLowerCase()
    if (sub === "succeeded") {
      markTaskSucceeded()
      console.log("tdd-guard: Task success latched for this armed run.")
    } else if (sub === "unavailable") {
      markTaskUnavailable()
      console.log(
        "tdd-guard: Task marked unavailable (latch preserved if already succeeded).",
      )
    } else {
      console.error(
        `tdd-guard: unknown task action "${sub}" — expected succeeded|unavailable.`,
      )
      process.exitCode = 1
    }
    break
  }
  case "start":
    recordStartEvidence()
    console.log("tdd-guard: START evidence recorded.")
    break
  case "criteria": {
    const ids = process.argv.slice(3).filter((a) => a && a !== "--")
    setRequiredCriteria(ids)
    console.log(`tdd-guard: required criteria set (${ids.length}).`)
    break
  }
  case "evidence": {
    const sub = (process.argv[3] || "").toLowerCase()
    if (sub === "check") {
      const requireStart = process.argv.includes("--require-start")
      const s = status()
      const verdict = evaluatePhaseEvidence({
        requireStart,
        startRecorded: s.startRecorded,
        requiredCriteria: s.requiredCriteria,
        phaseEvidence: s.phaseEvidence,
        tddRun: s.tddRun || requireStart,
      })
      if (!verdict.ok) {
        console.error(`tdd-guard: evidence check failed (${verdict.reason}).`)
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
      console.error(`tdd-guard: evidence not recorded (${recorded.reason}).`)
      process.exitCode = 1
      break
    }
    console.log(`tdd-guard: recorded ${phase} for ${criterion} (${agentId}).`)
    break
  }
  case "fingerprint": {
    const runIdx = process.argv.indexOf("--run-file")
    const runFile = runIdx === -1 ? "" : process.argv[runIdx + 1] || ""
    const toolsIdx = process.argv.indexOf("--tools")
    const tools =
      toolsIdx === -1
        ? []
        : process.argv
            .slice(toolsIdx + 1)
            .filter((a) => a && !a.startsWith("--"))
    const fingerprint = appendRunFileFingerprint(runFile, tools)
    console.log(`tdd-guard: fingerprint ${fingerprint || "missing"}.`)
    if (!fingerprint) process.exitCode = 1
    break
  }
  case "status":
  default: {
    const s = status()
    console.log(
      `tdd-guard: ${s.armed ? "ARMED" : "disarmed"} (subagent depth=${s.depth}, phase=${s.phase || "none"}, task=${s.taskAvailable ? "available" : "down"})`,
    )
    break
  }
}

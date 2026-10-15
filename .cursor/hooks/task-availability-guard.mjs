#!/usr/bin/env node
/**
 * DISABLED — not registered in .cursor/hooks.json (RES decision 2026-10-15,
 * to match Syntex-V0). Cursor fires no hook events (preToolUse, postToolUse,
 * subagentStart, subagentStop) for subagent calls made through
 * CallDynamicTool { namespace: "cursor", toolName: "Task" } on cloud VMs, so
 * `--success` never ran and `taskAvailable` stayed false, denying every armed
 * Write. QA's transcript check covers the gap until a v0.3.3 ticket restores
 * the guard. Re-enable only after a live Cloud run proves the success hook
 * fires.
 *
 * Fail-closed Write interlock: while /sdd-to-tdd is ARMED, deny edits until
 * a Task (subagent) invocation has succeeded in this run. If Task is
 * unavailable, the orchestrator cannot self-implement — STOP with
 * BLOCKED (infra).
 *
 * preToolUse (matcher Write, failClosed: true):
 *   node .cursor/hooks/task-availability-guard.mjs
 * postToolUse (matcher Task):
 *   node .cursor/hooks/task-availability-guard.mjs --success
 * postToolUseFailure (matcher Task):
 *   node .cursor/hooks/task-availability-guard.mjs --failure
 *
 * Escape: only the armed-state file (tdd-guard.json, including TDD_GUARD_STATE)
 * stays allowed so the window can be disarmed without Task. Parent writes to
 * linear-writer.json are denied at all times (unarmed, after Task, always);
 * only linear-resolver subagentStart may write that file. Shell writes are
 * matched in git-stage-guard.mjs.
 */
import {
  readStdinJson,
  writeStdoutJson,
  isArmed,
  isArmedStateFile,
  isTaskAvailable,
  markTaskAvailable,
  markTaskUnavailable,
  isWriteTool,
  extractPath,
  checkLinearWriterParentWrite,
  checkTaskAvailabilityWrite,
  recordDisarm,
} from "./lib/tdd-guard-policy.mjs"

function main() {
  try {
    const flag = process.argv[2]
    if (flag === "--success") {
      const input = readStdinJson()
      if (input.tool_name === "Task") markTaskAvailable()
      writeStdoutJson({})
      return
    }
    if (flag === "--failure") {
      const input = readStdinJson()
      if (input.tool_name === "Task") markTaskUnavailable()
      writeStdoutJson({})
      return
    }

    const input = readStdinJson()
    if (!isWriteTool(input.tool_name)) {
      writeStdoutJson({})
      return
    }
    const path = extractPath(input.tool_input)
    const writerHit = checkLinearWriterParentWrite(path)
    if (writerHit) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked a parent write to linear-writer.json — only linear-resolver subagentStart may set that flag.",
        agent_message:
          "linear-writer guard: the parent must not Write `.cursor/hooks/state/linear-writer.json`. " +
          "Only the linear-resolver subagentStart hook path may set the allow flag. " +
          "This deny is unconditional (armed or not, Task succeeded or not).",
      })
      return
    }
    if (isArmed() && isArmedStateFile(path)) {
      recordDisarm({ source: `parent Write ${path}` })
    }
    const hit = checkTaskAvailabilityWrite(path, {
      armed: isArmed(),
      taskAvailable: isTaskAvailable(),
    })
    if (!hit) {
      writeStdoutJson({})
      return
    }
    writeStdoutJson({
      permission: "deny",
      user_message:
        "Blocked an edit — Task is unavailable. STOP and report BLOCKED (infra).",
      agent_message:
        "task-availability guard: the Task (subagent) tool has not succeeded " +
        "in this armed /sdd-to-tdd run. Do not edit tests or source inline. " +
        "STOP and report BLOCKED (infra). Re-run when Task is available.",
    })
  } catch (err) {
    console.error("[task-availability-guard]", err)
    process.exit(1)
  }
}

main()

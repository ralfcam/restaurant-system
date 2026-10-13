#!/usr/bin/env node
/**
 * preToolUse fail-closed Write guard: deny parent edits and tracker-state
 * writes when Task has not succeeded in an armed /sdd-to-tdd run.
 *
 * linear-writer.json is denied for the parent at all times. The only Write
 * escape while Task is down is the armed-state file (tdd-guard.json).
 */
import {
  readStdinJson,
  writeStdoutJson,
  isWriteTool,
  extractPath,
  isArmed,
  isTaskAvailable,
  checkTaskUnavailableWrite,
  markTaskSucceeded,
} from "./lib/tdd-guard-policy.mjs"

function main() {
  try {
    if (process.argv[2] === "succeeded") {
      markTaskSucceeded()
      writeStdoutJson({})
      return
    }
    const input = readStdinJson()
    if (!isWriteTool(input.tool_name)) {
      writeStdoutJson({})
      return
    }
    const path = extractPath(input.tool_input)
    const hit = checkTaskUnavailableWrite(path, {
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
        hit.kind === "linear-writer-parent"
          ? `Blocked a parent write to "${path}" — linear-writer.json is linear-resolver-only.`
          : `BLOCKED (infra): no Task tool — refused write to "${path}".`,
      agent_message:
        hit.kind === "linear-writer-parent"
          ? `task-availability guard: parent writes to linear-writer.json are denied at all times.`
          : `task-availability guard: Task has not succeeded in this armed run. ` +
            `End BLOCKED (infra): no Task tool. Do not edit code, tests, or tracker state.`,
    })
  } catch (err) {
    console.error("[task-availability-guard]", err)
    process.exit(1)
  }
}

main()

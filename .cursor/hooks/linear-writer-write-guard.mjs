#!/usr/bin/env node
/**
 * preToolUse (matcher Write, failClosed: true): the parent must never Write
 * `.cursor/hooks/state/linear-writer.json`. Only the linear-resolver
 * subagentStart hook path may set that allow flag. Unconditional: not gated
 * on armed state, depth, or any Task event. StrReplace arrives as
 * tool_name "Write" (see .cursor/rules/hook-authoring.mdc). The Shell-side
 * deny lives in git-stage-guard.mjs.
 */
import {
  readStdinJson,
  writeStdoutJson,
  isWriteTool,
  extractPath,
  checkLinearWriterParentWrite,
} from "./lib/tdd-guard-policy.mjs"

function main() {
  try {
    const input = readStdinJson()
    if (!isWriteTool(input.tool_name)) {
      writeStdoutJson({})
      return
    }
    if (!checkLinearWriterParentWrite(extractPath(input.tool_input))) {
      writeStdoutJson({})
      return
    }
    writeStdoutJson({
      permission: "deny",
      user_message:
        "Blocked a parent write to linear-writer.json — only linear-resolver subagentStart may set that flag.",
      agent_message:
        "linear-writer guard: the parent must not Write `.cursor/hooks/state/linear-writer.json`. " +
        "Only the linear-resolver subagentStart hook path may set the allow flag. " +
        "This deny is unconditional (armed or not).",
    })
  } catch (err) {
    console.error("[linear-writer-write-guard]", err)
    process.exit(1)
  }
}

main()

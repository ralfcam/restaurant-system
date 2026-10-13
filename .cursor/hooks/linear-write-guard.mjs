#!/usr/bin/env node
/**
 * beforeMCPExecution and Cloud preToolUse (CallDynamicTool):
 * deny parent Linear mutating writes unless linear-writer.json is
 * { "allowed": true }. On the Cloud preToolUse path, unknown server + a
 * guarded write name is also deny.
 *
 * subagentStart (matcher linear-resolver): set the allow flag.
 *   node .cursor/hooks/linear-write-guard.mjs start
 * subagentStop (matcher linear-resolver): clear the allow flag.
 *   node .cursor/hooks/linear-write-guard.mjs stop
 *
 * list_* / get_* / search_* reads stay unrestricted (triage PHASE 0).
 * docs-updater and feedback-validator must not set this flag (hooks.json
 * matcher is linear-resolver only).
 *
 * Fails CLOSED (failClosed: true in hooks.json): an internal error exits 1
 * instead of allowing. Payload shapes and the liveness standard:
 * .cursor/rules/hook-authoring.mdc.
 *
 * New beforeMCPExecution entries do not hot-reload mid-session — live
 * denial needs a Cursor window reload. Spawn-level tests are the logic
 * proof until then.
 */
import { readFileSync } from "node:fs"
import { writeStdoutJson, extractMcpCall } from "./lib/mcp-payload.mjs"
import {
  checkLinearWrite,
  isAllowed,
  setAllowed,
} from "./lib/linear-write-policy.mjs"

function readPayload() {
  const text = readFileSync(0, "utf8").replace(/^\uFEFF/, "")
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function main() {
  try {
    const input = readPayload()
    const action = process.argv[2]
    if (action === "start") {
      setAllowed(true)
      writeStdoutJson({})
      return
    }
    if (action === "stop") {
      setAllowed(false)
      writeStdoutJson({})
      return
    }

    const extracted = extractMcpCall(input)
    if (!extracted) {
      writeStdoutJson({})
      return
    }

    const cloudPath =
      input.hook_event_name === "preToolUse" ||
      (typeof input.tool_name === "string" &&
        input.tool_name.startsWith("MCP:"))
    const hit = checkLinearWrite(
      extracted.server,
      extracted.toolName,
      isAllowed(),
      { denyUnknownServer: cloudPath },
    )
    if (!hit) {
      writeStdoutJson({})
      return
    }

    writeStdoutJson({
      permission: "deny",
      user_message: `Blocked a parent Linear ${extracted.toolName} — writes are linear-resolver-only.`,
      agent_message:
        `linear-write guard: ${extracted.toolName} mutates Linear. The parent orchestrator ` +
        "must not call save_*, create_*, delete_*, or update_* Linear tools. Delegate via " +
        "the Task tool to linear-resolver (which sets the allow flag on " +
        "subagentStart). Reads (list_*, get_*, search_*) stay unrestricted. See " +
        ".cursor/agents/linear-resolver.md.",
    })
  } catch (err) {
    console.error("[linear-write-guard]", err)
    process.exit(1)
  }
}

main()

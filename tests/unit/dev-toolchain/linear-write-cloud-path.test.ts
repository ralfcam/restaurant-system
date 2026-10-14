import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import {
  checkLinearWrite,
  setAllowed,
} from "../../../.cursor/hooks/lib/linear-write-policy.mjs"

const repoRoot = process.cwd()
const LINEAR_STATE = path.join(
  repoRoot,
  ".cursor",
  "hooks",
  "state",
  "linear-writer.json",
)
const LINEAR_STATE_PRIOR = existsSync(LINEAR_STATE)
  ? readFileSync(LINEAR_STATE, "utf8")
  : null

function restoreLinearState() {
  if (LINEAR_STATE_PRIOR === null) {
    if (existsSync(LINEAR_STATE)) unlinkSync(LINEAR_STATE)
  } else {
    writeFileSync(LINEAR_STATE, LINEAR_STATE_PRIOR, "utf8")
  }
}

function runGuard(payload: string) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", "linear-write-guard.mjs")],
    { encoding: "utf8", input: payload },
  )
}

function parseHookStdout(stdout: string) {
  return JSON.parse(stdout) as { permission?: string }
}

describe("G-LG1 Cloud Linear write lock", () => {
  afterAll(restoreLinearState)

  it("preToolUse MCP save_issue denies when flag off and when server unknown", () => {
    const hooks = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: Array<{ command: string; matcher?: string }>
      }
    }
    const pre = hooks.hooks.preToolUse.find((h) =>
      h.command.includes("linear-write-guard.mjs"),
    )
    expect(pre).toBeDefined()
    expect(pre?.matcher).toBe("CallDynamicTool")

    setAllowed(false)

    const unknownServer = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "MCP:save_issue",
          tool_input: { title: "probe" },
          hook_event_name: "preToolUse",
        }),
    )
    expect({
      status: unknownServer.status,
      permission: parseHookStdout(unknownServer.stdout).permission,
    }).toEqual({ status: 0, permission: "deny" })

    const unknownComment = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "MCP:save_comment",
          tool_input: { issue: "RES-151", body: "probe" },
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(unknownComment.stdout).permission).toBe("deny")

    const unknownStatus = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "MCP:save_status_update",
          tool_input: { type: "project", body: "probe" },
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(unknownStatus.stdout).permission).toBe("deny")

    const linearDenied = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "MCP:save_issue",
          tool_input: { title: "probe" },
          mcp_server_name: "plugin-linear-linear",
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(linearDenied.stdout).permission).toBe("deny")

    // Observed Cloud preToolUse: CallDynamicTool + namespace Linear.
    const cloudCallDynamic = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "CallDynamicTool",
          tool_input: {
            namespace: "Linear",
            toolName: "save_issue",
            arguments: { title: "probe" },
          },
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(cloudCallDynamic.stdout).permission).toBe("deny")

    const cloudCallDynamicComment = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "CallDynamicTool",
          tool_input: JSON.stringify({
            namespace: "Linear",
            toolName: "save_comment",
            arguments: { issueId: "RES-151", body: "probe" },
          }),
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(cloudCallDynamicComment.stdout).permission).toBe(
      "deny",
    )

    const cloudCallDynamicStatus = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "CallDynamicTool",
          tool_input: {
            namespace: "Linear",
            toolName: "save_status_update",
            arguments: { type: "project", body: "probe" },
          },
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(cloudCallDynamicStatus.stdout).permission).toBe(
      "deny",
    )

    const cloudCallDynamicUnknown = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "CallDynamicTool",
          tool_input: {
            toolName: "save_issue",
            arguments: { title: "probe" },
          },
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(cloudCallDynamicUnknown.stdout).permission).toBe(
      "deny",
    )

    // hook-authoring observed MCP shape, delivered on Cloud preToolUse.
    const beforeShapeOnPre = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "save_issue",
          tool_input: JSON.stringify({ title: "probe" }),
          mcp_server_name: "plugin-linear-linear",
          hook_event_name: "preToolUse",
        }),
    )
    expect(parseHookStdout(beforeShapeOnPre.stdout).permission).toBe("deny")

    const listAllowed = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "MCP:list_issues",
          tool_input: { limit: 1 },
          hook_event_name: "preToolUse",
        }),
    )
    expect(listAllowed.status).toBe(0)
    expect(parseHookStdout(listAllowed.stdout)).toEqual({})

    const cloudListAllowed = runGuard(
      "\uFEFF" +
        JSON.stringify({
          tool_name: "CallDynamicTool",
          tool_input: {
            namespace: "Linear",
            toolName: "list_issues",
            arguments: { limit: 1 },
          },
          hook_event_name: "preToolUse",
        }),
    )
    expect(cloudListAllowed.status).toBe(0)
    expect(parseHookStdout(cloudListAllowed.stdout)).toEqual({})

    expect(checkLinearWrite(undefined, "save_issue", false)?.deny).toBe(true)
    expect(checkLinearWrite("", "save_comment", false)?.deny).toBe(true)
  })
})

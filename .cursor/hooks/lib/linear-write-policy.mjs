/**
 * Allow-flag for Linear MCP writes. Parent save_issue / save_comment /
 * save_status_update calls are denied unless a linear-resolver subagent is
 * in flight.
 *
 * Reads (list_*, get_*) stay unrestricted. Residual: a concurrent parent
 * write while linear-resolver is in flight also passes. Cloud agents do
 * not run beforeMCPExecution hooks; Cloud mutations arrive as
 * CallDynamicTool on preToolUse (tool_input.namespace / toolName /
 * arguments / mcpDetails).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { isLinearServer } from "./mcp-payload.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = join(__dirname, "..", "state", "linear-writer.json")

export const LINEAR_WRITE_TOOLS = new Set([
  "save_issue",
  "save_comment",
  "save_status_update",
  "create_attachment",
  "create_attachment_from_upload",
  "delete_comment",
  "delete_attachment",
  "delete_issue",
  "delete_status_update",
  "delete_task",
])

const LINEAR_READ_RE = /^(?:list_|get_|search_|whoami|extract_)/
const LINEAR_MUTATION_RE =
  /^(?:save_|create_|delete_|update_|remove_|retire_|restore_|merge_|submit_)/

export function isLinearWriteTool(toolName) {
  if (typeof toolName !== "string" || !toolName) return false
  if (LINEAR_WRITE_TOOLS.has(toolName)) return true
  if (LINEAR_READ_RE.test(toolName)) return false
  return LINEAR_MUTATION_RE.test(toolName)
}

function loadState() {
  try {
    if (!existsSync(STATE_PATH)) return { allowed: false }
    const s = JSON.parse(readFileSync(STATE_PATH, "utf8"))
    return { allowed: s.allowed === true }
  } catch {
    return { allowed: false }
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true })
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8")
}

export function isAllowed() {
  return loadState().allowed
}

export function setAllowed(allowed) {
  saveState({ allowed: Boolean(allowed) })
}

/** `{ deny: true }` when a guarded Linear writer runs with the flag off.
 *  Unknown server (HP-002b): deny guarded mutations instead of failing open. */
export function checkLinearWrite(server, toolName, allowed = isAllowed()) {
  if (!isLinearWriteTool(toolName)) return null
  if (isLinearServer(server)) {
    if (allowed) return null
    return { deny: true }
  }
  if (typeof server === "string" && server.trim()) return null
  return { deny: true }
}

/**
 * Allow-flag for Linear MCP writes. Parent save_issue / save_comment /
 * save_status_update calls are denied unless a linear-resolver subagent is
 * in flight.
 *
 * Reads (list_*, get_*) stay unrestricted. Residual: a concurrent parent
 * write while linear-resolver is in flight also passes. Cloud agents run
 * preToolUse (MCP: matcher), not beforeMCPExecution. On that path,
 * denyUnknownServer rejects guarded write names when the server is missing.
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
])

export function isLinearWriteTool(toolName) {
  return typeof toolName === "string" && LINEAR_WRITE_TOOLS.has(toolName)
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

function isUnknownServer(server) {
  return typeof server !== "string" || !server.trim()
}

/** `{ deny: true }` when a guarded Linear writer runs with the flag off. */
export function checkLinearWrite(
  server,
  toolName,
  allowed = isAllowed(),
  options = {},
) {
  if (!isLinearWriteTool(toolName)) return null
  if (isLinearServer(server)) {
    if (allowed) return null
    return { deny: true }
  }
  if (options.denyUnknownServer && isUnknownServer(server)) {
    return { deny: true }
  }
  return null
}

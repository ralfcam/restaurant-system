/**
 * Shared /conduct next transcript check. Parses Cursor conversation JSONL
 * (`role` / `message.content` `tool_use` blocks) and verifies every required
 * criterion has Task phases to tdd-red / tdd-green / tdd-refactor, tracker
 * writes come from linear-resolver, and the conductor does not Write a
 * protected path or call Linear mutations inline.
 */
import { extractMcpCall, isLinearServer } from "./mcp-payload.mjs"
import { isLinearWriteTool } from "./linear-write-policy.mjs"
import { isProtected } from "./tdd-guard-policy.mjs"

export const PHASE_AGENTS = Object.freeze({
  "tdd-red": "red",
  "tdd-green": "green",
  "tdd-refactor": "refactor",
})

const AC_RE = /\b(AC-\d+)\b/g
const WRITE_TOOLS = new Set(["Write", "StrReplace", "SearchReplace"])

function emptyPhases() {
  return { red: false, green: false, refactor: false }
}

export function extractCriterionIds(text, requiredCriteria = []) {
  const ids = []
  const seen = new Set()
  const source = String(text || "")
  AC_RE.lastIndex = 0
  let match
  while ((match = AC_RE.exec(source))) {
    if (seen.has(match[1])) continue
    seen.add(match[1])
    ids.push(match[1])
  }
  for (const id of requiredCriteria) {
    if (typeof id !== "string" || !id || seen.has(id)) continue
    if (!source.includes(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function contentBlocks(record) {
  const content = record?.message?.content ?? record?.content
  return Array.isArray(content) ? content : []
}

function toolUsesFromRecord(record) {
  return contentBlocks(record).filter(
    (block) =>
      block &&
      (block.type === "tool_use" || block.type === "tool-use") &&
      typeof (block.name || block.tool_name) === "string",
  )
}

export function parseConductorTranscript(text) {
  const events = []
  const raw = String(text || "")
  if (!raw.trim()) return events
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let record
    try {
      record = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (record?.type === "turn_ended") continue
    for (const block of toolUsesFromRecord(record)) {
      const name = block.name || block.tool_name
      const input = block.input || block.tool_input || {}
      events.push({
        line: index + 1,
        tool: name,
        input: input && typeof input === "object" ? input : {},
      })
    }
  }
  return events
}

function writePath(input) {
  return String(input?.path || input?.file_path || input?.filePath || "")
}

function isInlineLinearWrite(event) {
  if (isLinearWriteTool(event.tool)) return true
  const mcp = extractMcpCall({
    tool_name: event.tool,
    tool_input: event.input,
  })
  if (!mcp) return false
  return isLinearServer(mcp.server) && isLinearWriteTool(mcp.toolName)
}

export function evaluateConductorTranscript(jsonl, { requiredCriteria = [] } = {}) {
  const events = parseConductorTranscript(jsonl)
  const criteria = {}
  for (const id of requiredCriteria) criteria[id] = emptyPhases()
  let linearResolverTasks = 0
  const inlineLinearWrites = []
  const inlineProtectedWrites = []

  for (const event of events) {
    if (event.tool === "Task") {
      const subagent = String(event.input.subagent_type || "")
      const blob = `${event.input.description || ""}\n${event.input.prompt || ""}`
      const ids = extractCriterionIds(blob, requiredCriteria)
      if (subagent === "linear-resolver") linearResolverTasks += 1
      const phase = PHASE_AGENTS[subagent]
      if (phase) {
        for (const id of ids) {
          if (!criteria[id]) criteria[id] = emptyPhases()
          criteria[id][phase] = true
        }
      }
      continue
    }
    if (WRITE_TOOLS.has(event.tool)) {
      const path = writePath(event.input)
      if (path && isProtected(path)) {
        inlineProtectedWrites.push({ tool: event.tool, path, line: event.line })
      }
      continue
    }
    if (isInlineLinearWrite(event)) {
      inlineLinearWrites.push({ tool: event.tool, line: event.line })
    }
  }

  const missingPhases = []
  for (const id of requiredCriteria) {
    const row = criteria[id] || emptyPhases()
    for (const phase of ["red", "green", "refactor"]) {
      if (!row[phase]) missingPhases.push({ criterion: id, phase })
    }
  }

  const everyPhaseIsTask = requiredCriteria.length > 0 && missingPhases.length === 0
  const trackerWritesDelegated =
    linearResolverTasks > 0 && inlineLinearWrites.length === 0

  return {
    ok: everyPhaseIsTask && trackerWritesDelegated && inlineProtectedWrites.length === 0,
    everyPhaseIsTask,
    trackerWritesDelegated,
    inlineProtectedWrites,
    inlineLinearWrites,
    missingPhases,
    criteria,
    linearResolverTasks,
  }
}

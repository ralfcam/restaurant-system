/**
 * Shared state + path policy for the /sdd-to-tdd delegation guard.
 *
 * Goal: while an sdd-to-tdd execution is ARMED, the top-level orchestrator must
 * not edit implementation/test files directly — those edits must come from the
 * tdd-red / tdd-green / tdd-refactor subagents. We allow the write when a
 * subagent is currently running (depth > 0) and block it when the parent is the
 * one editing (depth === 0).
 *
 * State is a single JSON file so the CLI control (`tdd-guard.mjs on/off`), the
 * subagent depth tracker, and the preToolUse guard all share it.
 */
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function statePath() {
  return (
    process.env.TDD_GUARD_STATE ||
    join(__dirname, "..", "state", "tdd-guard.json")
  )
}

/** Paths the orchestrator may NOT edit directly while armed (delegate instead). */
export const PROTECTED_PREFIXES = [
  "tests/",
  "lib/",
  "app/",
  "components/",
  "hooks/",
  "src/",
  "supabase/",
]

/**
 * The one direct write the orchestrator is allowed to make while armed: the
 * approved spec edit. Everything outside PROTECTED_PREFIXES is allowed anyway;
 * this list documents the intended carve-out.
 */
export const ALLOWED_FOR_PARENT = ["docs/"]

/** Specs are read-only while a TDD phase is set. Parent spec edits run with phase null (including during background START). */
export const SPEC_PREFIX = "docs/specs/"

/** ADRs are likewise read-only for subagents (normative decision records). */
export const ADR_PREFIX = "docs/ADR/"

/** The Red phase's exclusive write scope. */
export const TESTS_PREFIX = "tests/"
export const DOCS_ARTIFACT_PREFIXES = [
  "docs/findings/",
  "docs/verifier-reports/",
  ".cursor/plans/",
]
export const TDD_VERIFIER_PREFIX = "docs/verifier-reports/tdd/"

/** Tools that write to disk (best-effort; tighten once real names are confirmed). */
const WRITE_TOOL_RE = /(write|edit|replace|patch|create|apply)/i

export function readStdinJson() {
  try {
    // Cursor prefixes hook stdin with a UTF-8 BOM on Windows; JSON.parse rejects it.
    const text = readFileSync(0, "utf8").replace(/^\uFEFF/, "")
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export function writeStdoutJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`)
}

const VALID_PHASES = ["red", "green", "refactor"]

const VALID_EXEMPTIONS = ["docs-artifact", "gate-remediation", "design-spec"]

const ARMED_STATE_REL = ".cursor/hooks/state/tdd-guard.json"
const LINEAR_WRITER_BASENAME = "linear-writer.json"
const GUARD_STATE_MARKERS = [".cursor/hooks/state/", "hooks/state/"]
const DEFAULT_FINGERPRINT_TOOLS = [
  "Task",
  "Write",
  "Shell",
  "CallDynamicTool",
]

export function emptyPhaseEvidence() {
  return { start: false, criteria: {} }
}

function normalizeCriteria(ids) {
  if (!Array.isArray(ids)) return []
  return ids
    .filter((id) => typeof id === "string" && id.trim())
    .map((id) => id.trim())
}

function readPhaseEvidence(raw) {
  const src = raw && typeof raw === "object" ? raw : {}
  const criteria = {}
  const incoming =
    src.criteria && typeof src.criteria === "object" ? src.criteria : {}
  for (const [id, row] of Object.entries(incoming)) {
    if (!id || !row || typeof row !== "object") continue
    criteria[id] = {
      red: row.red === true,
      green: row.green === true,
      refactor: row.refactor === true,
      redAgentId: typeof row.redAgentId === "string" ? row.redAgentId.trim() : "",
      greenAgentId:
        typeof row.greenAgentId === "string" ? row.greenAgentId.trim() : "",
      refactorAgentId:
        typeof row.refactorAgentId === "string"
          ? row.refactorAgentId.trim()
          : "",
    }
  }
  return { start: src.start === true, criteria }
}

function defaultState() {
  return {
    armed: false,
    depth: 0,
    phase: null,
    loopRan: false,
    commitExempt: null,
    taskAvailable: false,
    phaseEvidence: emptyPhaseEvidence(),
    requiredCriteria: [],
    requireStart: false,
    tddRun: false,
  }
}

function loadState() {
  try {
    const path = statePath()
    if (!existsSync(path)) return defaultState()
    const s = JSON.parse(readFileSync(path, "utf8"))
    return {
      armed: Boolean(s.armed),
      depth: Number(s.depth) || 0,
      phase: VALID_PHASES.includes(s.phase) ? s.phase : null,
      loopRan: Boolean(s.loopRan),
      commitExempt: VALID_EXEMPTIONS.includes(s.commitExempt)
        ? s.commitExempt
        : null,
      taskAvailable: s.taskAvailable === true,
      phaseEvidence: readPhaseEvidence(s.phaseEvidence),
      requiredCriteria: normalizeCriteria(s.requiredCriteria),
      requireStart: s.requireStart === true,
      tddRun: s.tddRun === true,
    }
  } catch {
    return defaultState()
  }
}

function saveState(state) {
  const path = statePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(state, null, 2), "utf8")
}

export function arm() {
  saveState({
    armed: true,
    depth: 0,
    phase: null,
    loopRan: false,
    commitExempt: null,
    taskAvailable: false,
    phaseEvidence: emptyPhaseEvidence(),
    requiredCriteria: [],
    requireStart: false,
    tddRun: true,
  })
}

export function disarm() {
  const s = loadState()
  saveState({
    armed: false,
    depth: 0,
    phase: null,
    loopRan: s.loopRan,
    commitExempt: s.commitExempt,
    taskAvailable: false,
    phaseEvidence: s.phaseEvidence,
    requiredCriteria: s.requiredCriteria,
    requireStart: s.requireStart,
    tddRun: s.tddRun,
  })
  recordDisarm({ source: "tdd-guard.mjs off" })
}

export function isArmed() {
  return loadState().armed
}

export function getDepth() {
  return loadState().depth
}

export function incDepth() {
  const s = loadState()
  if (!s.armed) return
  saveState({ ...s, depth: s.depth + 1 })
}

export function decDepth() {
  const s = loadState()
  if (!s.armed) return
  saveState({ ...s, depth: Math.max(0, s.depth - 1) })
}

/** Set the active TDD phase (red/green/refactor) so the delegation guard can
 * enforce phase-scoped write boundaries on the subagent currently running. */
export function setPhase(phase) {
  const s = loadState()
  if (!s.armed) return
  if (!VALID_PHASES.includes(phase)) return
  saveState({ ...s, phase, loopRan: true })
}

export function clearPhase() {
  const s = loadState()
  if (!s.armed) return
  saveState({ ...s, phase: null })
}

export function getPhase() {
  return loadState().phase
}

export function status() {
  return loadState()
}

/** Clear loopRan so /commit can proceed after the TDD loop. */
export function openCommitGate(exempt = null) {
  const s = loadState()
  saveState({
    ...s,
    loopRan: false,
    commitExempt: VALID_EXEMPTIONS.includes(exempt) ? exempt : null,
  })
}

export function getCommitExempt() {
  return loadState().commitExempt
}

export function isLoopRan() {
  return loadState().loopRan
}

export function markTaskAvailable() {
  const s = loadState()
  saveState({ ...s, taskAvailable: true })
}

export function markTaskUnavailable() {
  const s = loadState()
  saveState({ ...s, taskAvailable: false })
}

export function isTaskAvailable() {
  return loadState().taskAvailable === true
}

function sameOrSegmentPrefixed(full, part) {
  if (!full || !part) return false
  if (full === part) return true
  return full.endsWith(`/${part}`)
}

/** True only for the exact resolved statePath() or the repo-relative armed file. */
export function isArmedStateFile(relPath) {
  const slash = String(relPath || "").replace(/\\/g, "/")
  if (!slash) return false
  const armed = statePath().replace(/\\/g, "/")
  return (
    sameOrSegmentPrefixed(slash, armed) || slash === ARMED_STATE_REL
  )
}

/** Guard state files under `.cursor/hooks/state/` (or a normalized `hooks/state/`). */
export function isGuardStatePath(relPath) {
  const slash = String(relPath || "").replace(/\\/g, "/")
  return GUARD_STATE_MARKERS.some((marker) => slash.includes(marker))
}

/** The Linear allow-flag file. Only linear-resolver subagentStart may write it. */
export function isLinearWriterStateFile(relPath) {
  const slash = String(relPath || "").replace(/\\/g, "/")
  return new RegExp(
    `(?:^|/)(?:\\.cursor/)?hooks/state/${LINEAR_WRITER_BASENAME}$`,
  ).test(slash)
}

/** Deny parent Write/StrReplace of linear-writer.json at all times. */
export function checkLinearWriterParentWrite(relPath) {
  if (!isLinearWriterStateFile(relPath)) return null
  return { deny: true, kind: "linear-writer-parent" }
}

/** Deny parent Shell writes of linear-writer.json at all times. */
export function checkLinearWriterParentShell(command) {
  for (const target of extractShellWriteTargets(command)) {
    const rel = normalize(target)
    if (isLinearWriterStateFile(rel) || isLinearWriterStateFile(target)) {
      return { deny: true, kind: "linear-writer-parent-shell", target: rel }
    }
  }
  return null
}

export function formatDisarmLogLine({ source, at = new Date() } = {}) {
  const day = (at instanceof Date ? at : new Date()).toISOString().slice(0, 10)
  const detail = String(source || "disarm").trim() || "disarm"
  return {
    day,
    bullet: `* **tdd-guard disarm:** ${detail}`,
    stderr: `[tdd-guard] DISARM ${detail}`,
  }
}

function disarmLogPath() {
  if (process.env.DISARM_LOG_PATH) return process.env.DISARM_LOG_PATH
  if (process.env.TDD_GUARD_STATE) return null
  return join(process.cwd(), "docs", "log.md")
}

function appendDisarmBullet(file, day, bullet) {
  mkdirSync(dirname(file), { recursive: true })
  const heading = `## ${day}`
  const existing = existsSync(file) ? readFileSync(file, "utf8") : ""
  if (!existing) {
    writeFileSync(
      file,
      `# Project Knowledge Update Log\n\n${heading}\n\n${bullet}\n`,
      "utf8",
    )
    return
  }
  const headingAt = existing.indexOf(heading)
  if (headingAt === -1) {
    const title = "# Project Knowledge Update Log"
    const titleAt = existing.indexOf(title)
    if (titleAt !== -1) {
      const afterTitle = existing.indexOf("\n", titleAt)
      const insertAt = afterTitle === -1 ? existing.length : afterTitle + 1
      writeFileSync(
        file,
        `${existing.slice(0, insertAt)}\n${heading}\n\n${bullet}\n${existing.slice(insertAt)}`,
        "utf8",
      )
      return
    }
    writeFileSync(
      file,
      `${existing.trimEnd()}\n\n${heading}\n\n${bullet}\n`,
      "utf8",
    )
    return
  }
  const lineEnd = existing.indexOf("\n", headingAt)
  const insertAt = lineEnd === -1 ? existing.length : lineEnd + 1
  writeFileSync(
    file,
    `${existing.slice(0, insertAt)}\n${bullet}\n${existing.slice(insertAt)}`,
    "utf8",
  )
}

/** Visible disarm: stderr always; docs/log.md unless tests isolated the state. */
export function recordDisarm({
  source,
  at,
  logPath,
  stderr = console.error,
} = {}) {
  const { day, bullet, stderr: line } = formatDisarmLogLine({ source, at })
  stderr(line)
  const path = logPath === undefined ? disarmLogPath() : logPath
  if (!path) return { ok: true, logged: false, line, bullet }
  appendDisarmBullet(path, day, bullet)
  return { ok: true, logged: true, line, bullet, path }
}

/** Deny parent writes while armed until a Task invocation has succeeded.
 *  Escape is the armed-state file only — not linear-writer.json or other state. */
export function checkTaskAvailabilityWrite(relPath, { armed, taskAvailable }) {
  if (!armed) return null
  if (taskAvailable) return null
  if (isArmedStateFile(relPath)) return null
  return { deny: true, kind: "task-unavailable" }
}

/** Redirect / tee / sed -i / cp / mv destinations in a Shell command. Residual
 *  gaps (python/node writers, PowerShell, editors, git checkout, `$FILE`) are
 *  documented in docs/specs/generic-harness-upstream.md. */
export function extractShellWriteTargets(command) {
  if (typeof command !== "string" || !command.trim()) return []
  const targets = []
  for (const rawSeg of command.split(/&&|\|\||;|\|/)) {
    const seg = rawSeg.trim()
    if (!seg) continue
    for (const match of seg.matchAll(
      /(?:^|[\s])(?:\d*)>>?\s*(?!&)(['"]?)([^'\s;|&]+)\1/g,
    )) {
      targets.push(match[2])
    }
    const tokens = seg.split(/\s+/).filter(Boolean)
    const teeIdx = tokens.indexOf("tee")
    if (teeIdx !== -1) {
      for (const token of tokens.slice(teeIdx + 1)) {
        if (!token.startsWith("-")) targets.push(token)
      }
    }
    const copyIdx = tokens.findIndex((token) => token === "cp" || token === "mv")
    if (copyIdx !== -1) {
      const dest = tokens.slice(copyIdx).filter((token) => !token.startsWith("-")).at(-1)
      if (dest && dest !== "cp" && dest !== "mv") targets.push(dest)
    }
    const sedIdx = tokens.indexOf("sed")
    if (
      sedIdx !== -1 &&
      tokens.some((token) => token === "-i" || /^-[a-zA-Z]*i/.test(token))
    ) {
      const dest = tokens
        .slice(sedIdx)
        .filter((token) => token !== "sed" && !token.startsWith("-"))
        .at(-1)
      if (dest) targets.push(dest)
    }
  }
  return targets.map((target) => target.replace(/^['"]|['"]$/g, ""))
}

/** Deny Shell writes to protected source and guard-state paths while Task is down. */
export function checkTaskAvailabilityShell(
  command,
  { armed, taskAvailable } = {},
) {
  if (!armed || taskAvailable) return null
  for (const target of extractShellWriteTargets(command)) {
    const rel = normalize(target)
    if (isArmedStateFile(rel) || isArmedStateFile(target)) continue
    if (isProtected(rel) || isGuardStatePath(rel) || isGuardStatePath(target)) {
      return { deny: true, kind: "task-unavailable-shell", target: rel }
    }
  }
  return null
}

/** START comment stays required on a tracked issue. "Do not change status"
 *  forbids save_issue, not the Work started: comment. */
export function shouldPostStartComment({
  hasTrackedIssue,
  prompt = "",
} = {}) {
  if (!hasTrackedIssue) return false
  void prompt
  return true
}

export function defaultFingerprintTools() {
  return [...DEFAULT_FINGERPRINT_TOOLS]
}

export function toolSurfaceFingerprint(toolNames) {
  const names = [...new Set((toolNames || []).filter(Boolean))].sort()
  return createHash("sha256").update(names.join("\n")).digest("hex").slice(0, 16)
}

export function runFileFingerprintLine({
  planSlug,
  tools = DEFAULT_FINGERPRINT_TOOLS,
  taskAvailable = false,
} = {}) {
  const fp = toolSurfaceFingerprint(tools)
  return `- [ ] tool-surface · plan ${planSlug} · taskAvailable=${taskAvailable} · fingerprint ${fp}`
}

export function appendRunFileFingerprint({
  cwd = process.cwd(),
  planSlug,
  tools = DEFAULT_FINGERPRINT_TOOLS,
  taskAvailable = false,
} = {}) {
  if (!planSlug) return { ok: false, reason: "missing_plan" }
  const line = runFileFingerprintLine({ planSlug, tools, taskAvailable })
  const runDir = join(cwd, "docs", "findings", "runs")
  mkdirSync(runDir, { recursive: true })
  const path = join(runDir, `${planSlug}.md`)
  const existing = existsSync(path) ? readFileSync(path, "utf8") : ""
  if (!existing.includes(`fingerprint ${toolSurfaceFingerprint(tools)}`)) {
    writeFileSync(
      path,
      existing ? `${existing.trimEnd()}\n${line}\n` : `${line}\n`,
      "utf8",
    )
  }
  return { ok: true, path, line }
}

export function recordStartEvidence() {
  const s = loadState()
  saveState({
    ...s,
    phaseEvidence: { ...s.phaseEvidence, start: true },
  })
}

export function recordPhaseEvidence(criterionId, phase, agentId) {
  if (typeof criterionId !== "string" || !criterionId.trim()) {
    return { ok: false, reason: "missing_criterion" }
  }
  if (!VALID_PHASES.includes(phase)) {
    return { ok: false, reason: "invalid_phase" }
  }
  if (typeof agentId !== "string" || !agentId.trim()) {
    return { ok: false, reason: "missing_agent_id" }
  }
  const s = loadState()
  const id = criterionId.trim()
  const criteria = { ...s.phaseEvidence.criteria }
  criteria[id] = {
    ...(criteria[id] || {}),
    [phase]: true,
    [`${phase}AgentId`]: agentId.trim(),
  }
  saveState({
    ...s,
    phaseEvidence: { ...s.phaseEvidence, criteria },
  })
  return { ok: true }
}

export function setRequiredCriteria(ids, requireStart = false) {
  const s = loadState()
  saveState({
    ...s,
    requiredCriteria: normalizeCriteria(ids),
    requireStart: Boolean(requireStart),
  })
}

export function evaluatePhaseEvidence({
  criteria = [],
  evidence = emptyPhaseEvidence(),
  requireStart = false,
} = {}) {
  const ids = normalizeCriteria(criteria)
  if (ids.length === 0) {
    return { ok: false, reason: "missing_required_criteria" }
  }
  if (requireStart && !evidence?.start) {
    return { ok: false, reason: "missing_start" }
  }
  for (const id of ids) {
    const row = evidence?.criteria?.[id]
    for (const phase of VALID_PHASES) {
      if (!row?.[phase]) {
        return { ok: false, reason: "missing_phase", criterion: id, phase }
      }
      const agentId = row?.[`${phase}AgentId`]
      if (typeof agentId !== "string" || !agentId.trim()) {
        return { ok: false, reason: "missing_agent_id", criterion: id, phase }
      }
    }
  }
  return { ok: true }
}

export function isDocsArtifactPath(relPath) {
  const path = normalize(relPath)
  if (path.startsWith(TDD_VERIFIER_PREFIX)) return false
  if (path.startsWith(".cursor/plans/")) return path.endsWith(".plan.md")
  return DOCS_ARTIFACT_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/** design-spec lane: exactly one docs/specs markdown file, plus optional gaps and plans. */
export function isDesignSpecLanePath(relPath) {
  const path = normalize(relPath)
  if (path === "docs/specs/README.md") return null
  if (path.startsWith("docs/specs/") && path.endsWith(".md")) return "spec"
  if (path === "docs/findings/product-gaps.md") return "gaps"
  if (path.startsWith(".cursor/plans/") && path.endsWith(".plan.md"))
    return "plan"
  return null
}

export function isDesignSpecLaneSet(paths) {
  if (!paths?.length) return false
  let specs = 0
  for (const relPath of paths) {
    const kind = isDesignSpecLanePath(relPath)
    if (!kind) return false
    if (kind === "spec") specs += 1
  }
  return specs === 1
}

export function stagedPathsFromGit(cwd = process.cwd()) {
  const result = spawnSync("git", ["diff", "--cached", "--name-only", "-z"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  })
  if (result.status !== 0 || !result.stdout) return []
  return result.stdout.split("\0").map(normalize).filter(Boolean)
}

export function addedPathsFromGit(cwd = process.cwd()) {
  const result = spawnSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=A", "-z"],
    {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  )
  if (result.status !== 0 || !result.stdout) return []
  return result.stdout.split("\0").map(normalize).filter(Boolean)
}

export function evaluateGateOpen({ exemption, dirtyPaths }) {
  if (exemption === "docs-artifact") {
    if (dirtyPaths?.length && dirtyPaths.every(isDocsArtifactPath)) {
      return { ok: true, exempt: "docs-artifact" }
    }
    return { ok: false, reason: "exempt_path_mismatch" }
  }
  if (exemption === "gate-remediation") {
    return { ok: true, exempt: "gate-remediation" }
  }
  if (exemption === "design-spec") {
    if (isDesignSpecLaneSet(dirtyPaths)) {
      return { ok: true, exempt: "design-spec" }
    }
    return { ok: false, reason: "exempt_path_mismatch" }
  }
  return { ok: true, exempt: null, receiptIndependent: true }
}

function designSpecCommitOk(stagedPaths, addedPaths) {
  if (!isDesignSpecLaneSet(stagedPaths)) return false
  const spec = stagedPaths.find(
    (relPath) => isDesignSpecLanePath(relPath) === "spec",
  )
  return Boolean(spec) && (addedPaths || []).includes(spec)
}

function hasRecordedPhaseEvidence(evidence) {
  if (!evidence || typeof evidence !== "object") return false
  if (evidence.start === true) return true
  const rows = evidence.criteria
  return Boolean(rows && typeof rows === "object" && Object.keys(rows).length)
}

export function evaluateGitCommitPermission({
  loopRan,
  exemption,
  stagedPaths,
  addedPaths,
  requiredCriteria = [],
  phaseEvidence,
  requireStart = false,
  tddRun = false,
}) {
  if (loopRan) return { ok: false, reason: "loopRan", deny: "tdd" }
  if (!exemption) {
    const ids = normalizeCriteria(requiredCriteria)
    const inTdd =
      tddRun ||
      requireStart ||
      hasRecordedPhaseEvidence(phaseEvidence) ||
      ids.length > 0
    if (inTdd) {
      const evidence = evaluatePhaseEvidence({
        criteria: ids,
        evidence: phaseEvidence ?? emptyPhaseEvidence(),
        requireStart,
      })
      if (!evidence.ok) {
        return { ok: false, reason: evidence.reason, deny: "phase-evidence" }
      }
    }
  }
  if (exemption === "docs-artifact") {
    if (!stagedPaths?.length || !stagedPaths.every(isDocsArtifactPath)) {
      return { ok: false, reason: "exempt_path_mismatch", deny: "tdd" }
    }
    return { ok: true, exempt: "docs-artifact" }
  }
  if (exemption === "gate-remediation") {
    return { ok: true, exempt: "gate-remediation" }
  }
  if (exemption === "design-spec") {
    if (!designSpecCommitOk(stagedPaths, addedPaths)) {
      return { ok: false, reason: "exempt_path_mismatch", deny: "tdd" }
    }
    return { ok: true, exempt: "design-spec" }
  }
  return { ok: true, exempt: null }
}

export function isWriteTool(toolName) {
  return typeof toolName === "string" && WRITE_TOOL_RE.test(toolName)
}

/** Pull the target file path from common tool-input shapes. */
export function extractPath(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null
  const direct =
    toolInput.path ||
    toolInput.file_path ||
    toolInput.target_file ||
    toolInput.filePath
  if (typeof direct === "string") return normalize(direct)
  // MultiEdit-style: edits[].file_path
  if (Array.isArray(toolInput.edits) && toolInput.edits[0]) {
    const p = toolInput.edits[0].file_path || toolInput.edits[0].path
    if (typeof p === "string") return normalize(p)
  }
  return null
}

function normalize(p) {
  // Strip a leading absolute repo path and normalize slashes to forward slashes.
  // Prefer the leftmost repo root so a nested spoof (lib/.cursor/...) stays
  // under that prefix instead of collapsing onto .cursor/hooks/state/.
  let s = String(p).replace(/\\/g, "/")
  const roots = [
    ".cursor/",
    "docs/",
    "tests/",
    "app/",
    "src/",
    "lib/",
    "components/",
    "hooks/",
    "supabase/",
  ]
  for (const root of roots) {
    if (s.startsWith(root)) return s.replace(/^\.?\//, "")
  }
  let best = -1
  for (const root of roots) {
    const idx = s.indexOf(`/${root}`)
    if (idx !== -1 && (best === -1 || idx < best)) best = idx
  }
  if (best !== -1) s = s.slice(best + 1)
  return s.replace(/^\.?\//, "")
}

export function isProtected(relPath) {
  if (!relPath) return false
  return PROTECTED_PREFIXES.some((p) => relPath.startsWith(p))
}

export function isSpecPath(relPath) {
  if (!relPath) return false
  return relPath.startsWith(SPEC_PREFIX) || relPath.startsWith(ADR_PREFIX)
}

export function isTestsPath(relPath) {
  if (!relPath) return false
  return relPath.startsWith(TESTS_PREFIX)
}

/**
 * Pure write-scope policy used by the delegation hook. Returns
 * `{ deny: true, kind }` or `null` (allowed / not in scope).
 *
 * `kind`:
 *   spec        — docs/specs/** or docs/ADR/** while a TDD phase is set
 *   phase-red   — red phase writing outside tests/
 *   phase-tests — green/refactor writing under tests/
 *   delegation  — parent orchestrator (depth 0) writing a protected path
 *
 * Spec deny keys off `phase`, not `depth`. Background START increments depth
 * while phase is still null; the parent must still apply the approved spec
 * edit. Depth-only deny treated that parent write as a subagent edit.
 */
export function checkTddWrite(relPath, { depth, phase }) {
  if (isSpecPath(relPath) && VALID_PHASES.includes(phase)) {
    return { deny: true, kind: "spec" }
  }
  if (!isProtected(relPath)) return null
  if (depth > 0) {
    if (phase === "red" && !isTestsPath(relPath))
      return { deny: true, kind: "phase-red" }
    if ((phase === "green" || phase === "refactor") && isTestsPath(relPath)) {
      return { deny: true, kind: "phase-tests" }
    }
    return null
  }
  return { deny: true, kind: "delegation" }
}

/** Detect a blanket `git add -A|--all|.` or `git commit -a|--all` in a shell
 * command string. Segments the command on &&/;/|/|| so it also catches
 * chained invocations. Returns null when nothing matches. */
export function detectBlanketGitStage(command) {
  if (typeof command !== "string" || !command.trim()) return null
  const segments = command.split(/&&|\|\||;|\|/)
  for (const rawSeg of segments) {
    const tokens = rawSeg.trim().split(/\s+/).filter(Boolean)
    const gitIdx = tokens.indexOf("git")
    if (gitIdx === -1) continue
    const sub = tokens[gitIdx + 1]
    const rest = tokens.slice(gitIdx + 2)
    if (sub === "add") {
      if (rest.some((t) => t === "-A" || t === "--all" || t === ".")) {
        return { kind: "add", segment: rawSeg.trim() }
      }
    }
    if (sub === "commit") {
      const hasBlanketFlag = rest.some(
        (t) =>
          t === "--all" ||
          (/^-[a-zA-Z]+$/.test(t) && !t.startsWith("--") && t.includes("a")),
      )
      if (hasBlanketFlag) {
        return { kind: "commit", segment: rawSeg.trim() }
      }
    }
  }
  return null
}

/** Detect `gh pr merge` in a shell command string. Segments on &&/;/|/||
 * so it also catches chained invocations. Returns null when nothing matches. */
export function detectGhPrMerge(command) {
  if (typeof command !== "string" || !command.trim()) return null
  const segments = command.split(/&&|\|\||;|\|/)
  for (const rawSeg of segments) {
    const tokens = rawSeg.trim().split(/\s+/).filter(Boolean)
    const ghIdx = tokens.indexOf("gh")
    if (ghIdx === -1) continue
    if (tokens[ghIdx + 1] === "pr" && tokens[ghIdx + 2] === "merge") {
      return { kind: "pr-merge", segment: rawSeg.trim() }
    }
  }
  return null
}

/** Detect any `git commit` in a shell command string. Segments on &&/;/|/||
 * so it also catches chained invocations. Returns null when nothing matches. */
export function detectGitCommit(command) {
  if (typeof command !== "string" || !command.trim()) return null
  const segments = command.split(/&&|\|\||;|\|/)
  for (const rawSeg of segments) {
    const tokens = rawSeg.trim().split(/\s+/).filter(Boolean)
    const gitIdx = tokens.indexOf("git")
    if (gitIdx === -1) continue
    if (tokens[gitIdx + 1] === "commit") {
      return { kind: "commit", segment: rawSeg.trim() }
    }
  }
  return null
}

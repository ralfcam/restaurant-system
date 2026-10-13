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
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join, posix as pathPosix } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = join(__dirname, "..", "state", "tdd-guard.json")

/** Paths the orchestrator may NOT edit directly while armed (delegate instead). */
export const PROTECTED_PREFIXES = [
  "tests/",
  "lib/",
  "app/",
  "components/",
  "hooks/",
  "src/",
  "supabase/",
  ".cursor/hooks/",
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

const ARMED_STATE_BASENAME = "tdd-guard.json"
const LINEAR_WRITER_BASENAME = "linear-writer.json"
const PHASE_KEYS = ["red", "green", "refactor"]

function defaultState() {
  return {
    armed: false,
    depth: 0,
    phase: null,
    loopRan: false,
    commitExempt: null,
    taskAvailable: false,
    tddRun: false,
    startRecorded: false,
    requiredCriteria: [],
    phaseEvidence: {},
    evidenceVerified: false,
    toolSurface: null,
  }
}

function loadPhaseEvidence(raw) {
  if (!raw || typeof raw !== "object") return {}
  const out = {}
  for (const [criterion, row] of Object.entries(raw)) {
    if (!row || typeof row !== "object") continue
    out[criterion] = {}
    for (const phase of PHASE_KEYS) {
      const cell = row[phase]
      if (
        cell &&
        typeof cell === "object" &&
        typeof cell.agentId === "string"
      ) {
        out[criterion][phase] = { agentId: cell.agentId }
      }
    }
  }
  return out
}

function loadState() {
  try {
    if (!existsSync(statePath())) return defaultState()
    const s = JSON.parse(readFileSync(statePath(), "utf8"))
    return {
      armed: Boolean(s.armed),
      depth: Number(s.depth) || 0,
      phase: VALID_PHASES.includes(s.phase) ? s.phase : null,
      loopRan: Boolean(s.loopRan),
      commitExempt: VALID_EXEMPTIONS.includes(s.commitExempt)
        ? s.commitExempt
        : null,
      taskAvailable: Boolean(s.taskAvailable),
      tddRun: Boolean(s.tddRun),
      startRecorded: Boolean(s.startRecorded),
      requiredCriteria: Array.isArray(s.requiredCriteria)
        ? s.requiredCriteria.map(String)
        : [],
      phaseEvidence: loadPhaseEvidence(s.phaseEvidence),
      evidenceVerified: Boolean(s.evidenceVerified),
      toolSurface: typeof s.toolSurface === "string" ? s.toolSurface : null,
    }
  } catch {
    return defaultState()
  }
}

function saveState(state) {
  const dest = statePath()
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify(state, null, 2), "utf8")
}

export function statePath() {
  return process.env.TDD_GUARD_STATE || STATE_PATH
}

export function sameOrSegmentPrefixed(value, prefix) {
  const v = String(value || "").replace(/\\/g, "/")
  const p = String(prefix || "").replace(/\\/g, "/")
  if (!v || !p) return false
  return v === p || v.startsWith(p.endsWith("/") ? p : `${p}/`)
}

/** True only for the armed-state file (`tdd-guard.json`), including TDD_GUARD_STATE. */
export function isArmedStateFile(relPath) {
  const slash = String(relPath || "").replace(/\\/g, "/")
  const armed = statePath().replace(/\\/g, "/")
  if (slash === armed || sameOrSegmentPrefixed(slash, armed)) return true
  return slash === `.cursor/hooks/state/${ARMED_STATE_BASENAME}`
}

export function isLinearWriterStateFile(relPath) {
  const slash = String(relPath || "").replace(/\\/g, "/")
  return (
    slash === `.cursor/hooks/state/${LINEAR_WRITER_BASENAME}` ||
    slash.endsWith(`/.cursor/hooks/state/${LINEAR_WRITER_BASENAME}`)
  )
}

export function arm() {
  saveState({
    ...defaultState(),
    armed: true,
    tddRun: true,
  })
}

export function disarm() {
  const s = loadState()
  if (s.armed) {
    console.error(
      `[tdd-guard] DISARM armed=${s.armed} taskAvailable=${s.taskAvailable}`,
    )
  }
  saveState({
    ...s,
    armed: false,
    depth: 0,
    phase: null,
  })
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
    evidenceVerified: true,
    commitExempt: VALID_EXEMPTIONS.includes(exempt) ? exempt : null,
  })
}

export function getCommitExempt() {
  return loadState().commitExempt
}

export function isLoopRan() {
  return loadState().loopRan
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

export function evaluateGitCommitPermission({
  loopRan,
  exemption,
  stagedPaths,
  addedPaths,
  tddRun,
  requireStart,
  evidenceVerified,
  startRecorded,
  requiredCriteria,
  phaseEvidence,
} = {}) {
  if (loopRan) return { ok: false, reason: "loopRan", deny: "tdd" }
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
  const evidence = phaseEvidence || {}
  const recorded = Object.keys(evidence).length > 0
  const isTdd = Boolean(tddRun) || Boolean(requireStart) || recorded
  if (isTdd && !evidenceVerified) {
    const verdict = evaluatePhaseEvidence({
      requireStart: Boolean(requireStart) || Boolean(tddRun) || recorded,
      startRecorded: Boolean(startRecorded),
      requiredCriteria: requiredCriteria || [],
      phaseEvidence: evidence,
      tddRun: true,
    })
    if (!verdict.ok) return { ...verdict, deny: "tdd" }
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
  // Relativize a path inside this checkout (root from this module, same join
  // pattern as STATE_PATH), then collapse . / .. on forward slashes.
  let s = String(p).replace(/\\/g, "/")
  const root = join(__dirname, "..", "..", "..").replace(/\\/g, "/")
  if (s === root || s.startsWith(`${root}/`)) {
    s = s.slice(root.length).replace(/^\/+/, "")
  } else {
    s = s.replace(/^\.?\//, "")
  }
  s = pathPosix.normalize(s)
  if (s === ".") return ""
  if (s === ".." || s.startsWith("../")) return s
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
  const path = normalize(relPath)
  if (isSpecPath(path) && VALID_PHASES.includes(phase)) {
    return { deny: true, kind: "spec" }
  }
  // Named disarm file only — not the rest of .cursor/hooks/state/.
  if (path === ".cursor/hooks/state/tdd-guard.json") return null
  if (!isProtected(path)) return null
  if (depth > 0) {
    if (phase === "red" && !isTestsPath(path))
      return { deny: true, kind: "phase-red" }
    if ((phase === "green" || phase === "refactor") && isTestsPath(path)) {
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
  const segments = splitShellSegments(command)
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

function basenameToken(token) {
  return token
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\.exe$/i, "")
}

export function unwrapShellWrappers(command) {
  let current = String(command).trim()
  for (let i = 0; i < 5; i++) {
    const m = current.match(
      /^(?:(?:\S*\/)?(?:ba)?sh(?:\.exe)?)\s+-c\s+(?:(['"])([\s\S]*)\1|(\S+))$/i,
    )
    if (!m) break
    current = (m[2] ?? m[3] ?? "").trim()
  }
  return current
}

function skipFlagTokens(tokens, valueFlags) {
  const out = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.startsWith("-")) {
      const flag = t.split("=")[0]
      if (
        !t.includes("=") &&
        valueFlags.has(flag) &&
        tokens[i + 1] &&
        !tokens[i + 1].startsWith("-")
      ) {
        i += 1
      }
      continue
    }
    out.push(t)
  }
  return out
}

function splitShellSegments(command) {
  return String(command).split(/&&|\|\||;|\||(?<!&)&(?!&)|\r?\n/)
}

function expandCommandSegments(command) {
  const top = unwrapShellWrappers(String(command).trim())
  return splitShellSegments(top).flatMap((s) => {
    const trimmed = s.trim()
    if (!trimmed) return []
    const inner = unwrapShellWrappers(trimmed)
    return inner !== trimmed ? splitShellSegments(inner) : [trimmed]
  })
}

function firstPositionalIndex(tokens, valueFlags) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t.startsWith("-")) return i
    const flag = t.split("=")[0]
    if (
      !t.includes("=") &&
      valueFlags.has(flag) &&
      tokens[i + 1] &&
      !tokens[i + 1].startsWith("-")
    ) {
      i += 1
    }
  }
  return -1
}

const GH_VALUE_FLAGS = new Set([
  "-R",
  "--repo",
  "-X",
  "--method",
  "-f",
  "-F",
  "-H",
  "--header",
  "--input",
  "-t",
  "--hostname",
])

const GIT_GLOBAL_VALUE_FLAGS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--config-env",
])

const GIT_PUSH_VALUE_FLAGS = new Set([
  "-o",
  "--push-option",
  "--repo",
  "--exec",
  "--receive-pack",
])

const GITHUB_MCP_MERGE_TOOLS = new Set([
  "merge_pull_request",
  "mergePullRequest",
  "merge_pr",
])

function detectGhPrMergeSegment(segment) {
  const raw = unwrapShellWrappers(segment)
  if (!raw) return null
  const haystack = raw.replace(/\\/g, "/")
  if (/\bmergePullRequest\b/.test(haystack)) {
    return { kind: "pr-merge", segment: raw }
  }
  if (
    /(?:^|[\s;|&])(?:\S*\/)?curl(?:\.exe)?\b[\s\S]*https?:\/\/api\.github\.com\/repos\/[^/\s]+\/[^/\s]+\/pulls\/\d+\/merge\b/i.test(
      haystack,
    )
  ) {
    return { kind: "pr-merge", segment: raw }
  }
  const tokens = haystack.split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    if (basenameToken(tokens[i]) !== "gh") continue
    const pos = skipFlagTokens(tokens.slice(i + 1), GH_VALUE_FLAGS)
    if (pos[0] === "pr" && pos[1] === "merge") {
      return { kind: "pr-merge", segment: raw }
    }
    if (
      pos[0] === "api" &&
      pos.some((t) => /\/pulls\/\d+\/merge(?:\b|$|\?)/.test(t))
    ) {
      return { kind: "pr-merge", segment: raw }
    }
  }
  return null
}

/** Detect a GitHub PR merge in a shell command. Tolerant of bash -c,
 * full-path `gh`, `gh -R`, `gh api …/merge`, GraphQL mergePullRequest,
 * and curl to the pulls merge endpoint. */
export function detectGhPrMerge(command) {
  if (typeof command !== "string" || !command.trim()) return null
  const segments = expandCommandSegments(command)
  for (const rawSeg of segments) {
    const hit = detectGhPrMergeSegment(rawSeg.trim())
    if (hit) return hit
  }
  return null
}

export function detectGithubMcpMerge(input) {
  if (!input || typeof input !== "object") return null
  const raw = typeof input.tool_name === "string" ? input.tool_name : ""
  const name = raw.startsWith("MCP:") ? raw.slice(4) : raw
  if (GITHUB_MCP_MERGE_TOOLS.has(name)) {
    return { kind: "pr-merge", segment: raw }
  }
  const ti = input.tool_input
  const nested =
    ti && typeof ti === "object" ? ti.toolName || ti.tool_name : null
  if (raw === "CallMcpTool" && GITHUB_MCP_MERGE_TOOLS.has(nested)) {
    return { kind: "pr-merge", segment: String(nested) }
  }
  return null
}

function isProtectedBranch(name) {
  return name === "main" || name === "staging"
}

function resolveCurrentBranch(cwd = process.cwd()) {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  })
  if (result.status !== 0) return null
  const name = (result.stdout || "").trim()
  if (!name || name === "HEAD") return null
  return name
}

function destFromRefspec(refspec, currentBranch) {
  const dest = String(refspec)
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^\+/, "")
    .split(":")
    .pop()
    .replace(/^refs\/heads\//, "")
    .replace(/^['"]+|['"]+$/g, "")
  if (dest === "HEAD" || dest === "@") return currentBranch
  return dest
}

function implicitDestDenied(currentBranch) {
  if (currentBranch == null || currentBranch === "") return true
  return isProtectedBranch(currentBranch)
}

function gitMinusCwd(afterGitTokens) {
  for (let i = 0; i < afterGitTokens.length; i++) {
    if (
      (afterGitTokens[i] === "-C" ||
        afterGitTokens[i] === "--git-dir" ||
        afterGitTokens[i] === "--work-tree") &&
      afterGitTokens[i + 1]
    ) {
      return afterGitTokens[i + 1]
    }
  }
  return null
}

function detectProtectedPushSegment(segment, currentBranch) {
  const raw = unwrapShellWrappers(segment)
  if (!raw) return null
  const tokens = raw.replace(/\\/g, "/").split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    if (basenameToken(tokens[i]) !== "git") continue
    const afterGitTokens = tokens.slice(i + 1)
    const targetCwd = gitMinusCwd(afterGitTokens)
    const branch = targetCwd ? resolveCurrentBranch(targetCwd) : currentBranch
    const subIdx = firstPositionalIndex(afterGitTokens, GIT_GLOBAL_VALUE_FLAGS)
    if (subIdx === -1 || afterGitTokens[subIdx] !== "push") return null
    const afterPush = afterGitTokens.slice(subIdx + 1)
    if (afterPush.some((t) => t === "--all" || t === "--mirror")) {
      return { kind: "protected-push", segment: raw }
    }
    const positionals = skipFlagTokens(afterPush, GIT_PUSH_VALUE_FLAGS)
    const hit = { kind: "protected-push", segment: raw }
    if (positionals.length <= 1) {
      return implicitDestDenied(branch) ? hit : null
    }
    const refspecs = positionals.slice(1)
    if (
      refspecs.some((r) => {
        const dest = destFromRefspec(r, branch)
        if (dest == null || dest === "") return implicitDestDenied(branch)
        return isProtectedBranch(dest)
      })
    ) {
      return hit
    }
  }
  return null
}

/** Detect `git push` whose destination ref is main or staging. */
export function detectProtectedBranchPush(command, options = {}) {
  if (typeof command !== "string" || !command.trim()) return null
  const currentBranch = Object.hasOwn(options, "currentBranch")
    ? options.currentBranch
    : resolveCurrentBranch(options.cwd)
  const segments = expandCommandSegments(command)
  for (const rawSeg of segments) {
    const hit = detectProtectedPushSegment(rawSeg.trim(), currentBranch)
    if (hit) return hit
  }
  return null
}

export function isTaskAvailable() {
  return loadState().taskAvailable
}

/** Latch Task success for the armed run. A later failure does not clear it. */
export function markTaskSucceeded() {
  const s = loadState()
  if (!s.armed) return
  saveState({ ...s, taskAvailable: true })
}

export function markTaskUnavailable() {
  const s = loadState()
  if (s.taskAvailable) return
  saveState({ ...s, taskAvailable: false })
}

export function recordStartEvidence() {
  const s = loadState()
  saveState({ ...s, startRecorded: true, tddRun: true })
}

export function setRequiredCriteria(ids) {
  const s = loadState()
  saveState({
    ...s,
    requiredCriteria: Array.isArray(ids) ? ids.map(String) : [],
    tddRun: true,
  })
}

export function recordPhaseEvidence(criterion, phase, agentId) {
  if (!criterion || !PHASE_KEYS.includes(phase)) {
    return { ok: false, reason: "invalid_phase" }
  }
  const id = String(agentId || "").trim()
  if (!id) return { ok: false, reason: "missing_agent_id" }
  const s = loadState()
  const phaseEvidence = { ...s.phaseEvidence }
  const row = { ...(phaseEvidence[criterion] || {}) }
  row[phase] = { agentId: id }
  phaseEvidence[criterion] = row
  saveState({ ...s, phaseEvidence, tddRun: true })
  return { ok: true, criterion, phase, agentId: id }
}

export function evaluatePhaseEvidence({
  requireStart = false,
  startRecorded = false,
  requiredCriteria = [],
  phaseEvidence = {},
  tddRun = false,
} = {}) {
  if (!tddRun && !requireStart && !Object.keys(phaseEvidence || {}).length) {
    return { ok: true }
  }
  if (requireStart && !startRecorded) {
    return { ok: false, reason: "missing_start" }
  }
  const ids = Array.isArray(requiredCriteria)
    ? requiredCriteria.map(String)
    : []
  if (tddRun && ids.length === 0) {
    return { ok: false, reason: "empty_required_criteria" }
  }
  for (const criterion of ids) {
    const row = phaseEvidence?.[criterion]
    if (!row) return { ok: false, reason: "missing_phase", criterion }
    for (const phase of PHASE_KEYS) {
      const cell = row[phase]
      if (!cell) return { ok: false, reason: "missing_phase", criterion, phase }
      if (!String(cell.agentId || "").trim()) {
        return { ok: false, reason: "missing_agent_id", criterion, phase }
      }
    }
  }
  return { ok: true }
}

export function shouldPostStartComment({ hasTrackedIssue, prompt } = {}) {
  if (!hasTrackedIssue) return false
  void prompt
  return true
}

export function extractShellWriteTargets(command) {
  if (typeof command !== "string" || !command.trim()) return []
  const text = unwrapShellWrappers(command)
  const targets = []
  const add = (value) => {
    const t = String(value || "")
      .trim()
      .replace(/^['"]|['"]$/g, "")
    if (t) targets.push(t)
  }
  for (const m of text.matchAll(/(?:\d*)>>?\s*(?:(['"])([^'"]+)\1|(\S+))/g)) {
    add(m[2] || m[3])
  }
  for (const m of text.matchAll(
    /\btee\b(?:\s+-a)?\s+(?:(['"])([^'"]+)\1|(\S+))/g,
  )) {
    add(m[2] || m[3])
  }
  for (const m of text.matchAll(
    /\b(?:cp|mv)\b(?:\s+-[a-zA-Z]+)*\s+(\S+(?:\s+\S+)*)/g,
  )) {
    const args = m[1]
      .trim()
      .split(/\s+/)
      .filter((t) => !t.startsWith("-"))
    if (args.length >= 2) add(args[args.length - 1])
  }
  for (const m of text.matchAll(/\bsed\b[^\n;&|]*?-i[^\s]*\s+([^\n;&|]+)/g)) {
    const args = m[1]
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/^['"]|['"]$/g, ""))
      .filter((t) => t && !t.startsWith("-") && !t.startsWith("s/"))
    if (args.length) add(args[args.length - 1])
  }
  return targets
}

export function checkLinearWriterParentShell(command) {
  for (const target of extractShellWriteTargets(command)) {
    const rel = normalize(target)
    if (isLinearWriterStateFile(rel) || isLinearWriterStateFile(target)) {
      return { deny: true, kind: "linear-writer-parent-shell", target: rel }
    }
  }
  return null
}

export function checkTaskUnavailableWrite(
  relPath,
  { armed, taskAvailable } = {},
) {
  const slash = normalize(relPath)
  if (isLinearWriterStateFile(slash) || isLinearWriterStateFile(relPath)) {
    return { deny: true, kind: "linear-writer-parent", target: slash }
  }
  if (!armed) return null
  if (taskAvailable) return null
  if (isArmedStateFile(slash) || isArmedStateFile(relPath)) return null
  if (
    isProtected(slash) ||
    slash.startsWith(".cursor/hooks/state/") ||
    slash.startsWith("docs/specs/")
  ) {
    return { deny: true, kind: "task-unavailable", target: slash }
  }
  return null
}

export function checkTaskUnavailableShell(
  command,
  { armed, taskAvailable } = {},
) {
  const writer = checkLinearWriterParentShell(command)
  if (writer) return writer
  if (!armed || taskAvailable) return null
  for (const target of extractShellWriteTargets(command)) {
    const rel = normalize(target)
    if (isArmedStateFile(rel) || isArmedStateFile(target)) continue
    if (
      isProtected(rel) ||
      rel.startsWith(".cursor/hooks/state/") ||
      rel.startsWith("docs/specs/")
    ) {
      return { deny: true, kind: "task-unavailable-shell", target: rel }
    }
  }
  return null
}

export function hashToolSurface(tools) {
  const list = (Array.isArray(tools) ? tools : [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .sort()
  return `sha256:${list.join("|") || "empty"}`
}

export function setToolSurface(tools) {
  const s = loadState()
  const toolSurface = hashToolSurface(tools)
  saveState({ ...s, toolSurface })
  return toolSurface
}

export function appendRunFileFingerprint(runFile, tools) {
  const fingerprint = tools ? setToolSurface(tools) : loadState().toolSurface
  if (!runFile || !fingerprint) return null
  mkdirSync(dirname(runFile), { recursive: true })
  const line = `- tool-surface fingerprint: \`${fingerprint}\`\n`
  const prev = existsSync(runFile) ? readFileSync(runFile, "utf8") : ""
  writeFileSync(runFile, prev + line, "utf8")
  return fingerprint
}

/** Detect any `git commit` in a shell command string. Segments on &&/;/|/||
 * so it also catches chained invocations. Returns null when nothing matches. */
export function detectGitCommit(command) {
  if (typeof command !== "string" || !command.trim()) return null
  const segments = splitShellSegments(command)
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

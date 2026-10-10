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

function defaultState() {
  return {
    armed: false,
    depth: 0,
    phase: null,
    loopRan: false,
    commitExempt: null,
  }
}

function loadState() {
  try {
    if (!existsSync(STATE_PATH)) return defaultState()
    const s = JSON.parse(readFileSync(STATE_PATH, "utf8"))
    return {
      armed: Boolean(s.armed),
      depth: Number(s.depth) || 0,
      phase: VALID_PHASES.includes(s.phase) ? s.phase : null,
      loopRan: Boolean(s.loopRan),
      commitExempt: VALID_EXEMPTIONS.includes(s.commitExempt)
        ? s.commitExempt
        : null,
    }
  } catch {
    return defaultState()
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true })
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8")
}

export function arm() {
  saveState({
    armed: true,
    depth: 0,
    phase: null,
    loopRan: false,
    commitExempt: null,
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
}) {
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
  const segments = command.split(/&&|\|\||;|\|/)
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
    .replace(/^\+/, "")
    .split(":")
    .pop()
    .replace(/^refs\/heads\//, "")
  if (dest === "HEAD" || dest === "@") return currentBranch
  return dest
}

function implicitDestDenied(currentBranch) {
  if (currentBranch == null || currentBranch === "") return true
  return isProtectedBranch(currentBranch)
}

function detectProtectedPushSegment(segment, currentBranch) {
  const raw = unwrapShellWrappers(segment)
  if (!raw) return null
  const tokens = raw.replace(/\\/g, "/").split(/\s+/).filter(Boolean)
  for (let i = 0; i < tokens.length; i++) {
    if (basenameToken(tokens[i]) !== "git") continue
    const afterGitTokens = tokens.slice(i + 1)
    const subIdx = firstPositionalIndex(afterGitTokens, GIT_GLOBAL_VALUE_FLAGS)
    if (subIdx === -1 || afterGitTokens[subIdx] !== "push") return null
    const afterPush = afterGitTokens.slice(subIdx + 1)
    if (afterPush.some((t) => t === "--all" || t === "--mirror")) {
      return { kind: "protected-push", segment: raw }
    }
    const positionals = skipFlagTokens(afterPush, GIT_PUSH_VALUE_FLAGS)
    const hit = { kind: "protected-push", segment: raw }
    if (positionals.length <= 1) {
      return implicitDestDenied(currentBranch) ? hit : null
    }
    const refspecs = positionals.slice(1)
    if (
      refspecs.some((r) => {
        const dest = destFromRefspec(r, currentBranch)
        if (dest == null || dest === "")
          return implicitDestDenied(currentBranch)
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
  const segments = command.split(/&&|\|\||;|\|/)
  for (const rawSeg of segments) {
    const hit = detectProtectedPushSegment(rawSeg.trim(), currentBranch)
    if (hit) return hit
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

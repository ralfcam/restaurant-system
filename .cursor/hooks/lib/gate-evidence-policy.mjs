/**
 * Gate-evidence block shared by push.md (writer) and intake.md (skip).
 */

export const GATE_EVIDENCE_HEADING = "## Gate evidence"

export const ANCESTRY_COMMANDS = [
  "git merge-base --is-ancestor origin/staging",
  "git rev-list --count origin/staging..origin/main",
  "git merge-base --is-ancestor origin/main",
]

export function renderGateEvidence({ head, result }) {
  return [
    GATE_EVIDENCE_HEADING,
    `Head: ${head}`,
    "Commands: `git merge-base --is-ancestor origin/staging <head>`; `git rev-list --count origin/staging..origin/main`; `git merge-base --is-ancestor origin/main <head>`",
    `Result: ${result}`,
    "Gates: pnpm lint; pnpm typecheck; pnpm test:unit - pass",
  ].join("\n")
}

export function gateEvidenceHead(body) {
  const match = String(body || "").match(
    /^## Gate evidence\r?\nHead: ([0-9a-f]{40})\s*$/m,
  )
  return match ? match[1] : null
}

export function selectOpenHeadPr(prs) {
  if (prs.length === 0) return { ok: false, reason: "none" }
  if (prs.length === 1) return { ok: true, pr: prs[0] }
  return { ok: false, reason: "duplicate_open_prs" }
}

const WIP_START_COMMIT = /^wip\([^)]+\): start run\b/

export function shouldIgnoreWipBuild({ title, commitMessage }) {
  return title.startsWith("[WIP]") || WIP_START_COMMIT.test(commitMessage)
}

export function formatWipStart({ key, runUrl }) {
  return {
    commitMessage: `wip(${key}): start run ${runUrl}`,
    title: `[WIP] ${key}`,
    body: `Closes ${key}\n${runUrl}`,
    label: "agent-running",
  }
}

export function shouldCloseNoopWip({ commits, furtherTrackedChange }) {
  if (furtherTrackedChange) return false
  if (commits.length !== 1) return false
  const commit = commits[0]
  return commit.empty === true && WIP_START_COMMIT.test(commit.message)
}

export function replaceGateEvidence(body, block) {
  const text = String(body || "")
  const rendered = `${block.trim()}\n`
  const start = text.indexOf(GATE_EVIDENCE_HEADING)
  if (start === -1) {
    const base = text.trimEnd()
    return base ? `${base}\n\n${rendered}` : rendered
  }
  const rest = text.slice(start + GATE_EVIDENCE_HEADING.length)
  const next = rest.search(/\n## [^#]/)
  const end =
    next === -1 ? text.length : start + GATE_EVIDENCE_HEADING.length + next
  return `${text.slice(0, start)}${rendered}${text.slice(end).replace(/^\n/, "")}`
}

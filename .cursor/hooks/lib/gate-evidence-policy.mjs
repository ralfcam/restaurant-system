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
  const kept = cliEvidenceKeptFromSpan(text.slice(start, end))
  return `${text.slice(0, start)}${rendered}${kept}${text.slice(end).replace(/^\n/, "")}`
}

function cliEvidenceKeptFromSpan(span) {
  const heading = "## CodeRabbit CLI evidence"
  const sectionAt = span.indexOf(heading)
  const before = sectionAt === -1 ? span : span.slice(0, sectionAt)
  const markers = before.match(/<!-- coderabbit-cli-evidence:[^>]*-->/g) || []
  const section = sectionAt === -1 ? "" : span.slice(sectionAt).trimEnd()
  const chunks = []
  if (markers.length > 0) chunks.push(markers.join("\n"))
  if (section) chunks.push(section)
  return chunks.length === 0 ? "" : `${chunks.join("\n")}\n`
}

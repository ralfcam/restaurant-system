/**
 * Pure Ready-brief parser shared by /dispatch and /conduct.
 * Live Linear I/O stays in the commands. Completeness is this module.
 */

export const DESIGN_ANSWER_KEYS = [
  "purpose and users",
  "mvp",
  "domain placement",
  "constraints",
  "out of scope",
]

const BRIEF_HEADING = "## Ready brief"

function field(section, label) {
  const match = section.match(new RegExp(`^${label}:[ \\t]*(.*)$`, "im"))
  return match ? match[1].trim() : ""
}

function briefSection(markdown) {
  const text = String(markdown || "").replace(/^\uFEFF/, "")
  const start = text.search(new RegExp(`^${BRIEF_HEADING}$`, "m"))
  if (start === -1) return ""
  const rest = text.slice(start + BRIEF_HEADING.length)
  const next = rest.search(/\n## [^#]/)
  return next === -1 ? rest : rest.slice(0, next)
}

function decisionLines(section) {
  const start = section.search(/^Decisions:\s*$/im)
  if (start === -1) return []
  const lines = []
  for (const line of section.slice(start).split("\n").slice(1)) {
    if (/^[A-Za-z].*:/.test(line)) break
    if (/^\s*[-*]\s+[^:]+:\s+\S/.test(line)) lines.push(line.trim())
  }
  return lines
}

function designAnswers(section) {
  const answers = {}
  for (const key of DESIGN_ANSWER_KEYS) {
    const match = section.match(
      new RegExp(`^\\s*[-*]\\s*${key}:\\s*(.+)$`, "im"),
    )
    answers[key] = match ? match[1].trim() : ""
  }
  return answers
}

export function parseReadyBrief(markdown) {
  const section = briefSection(markdown)
  const route = field(section, "Route")
  const spec = field(section, "Spec")
  const specMatch = spec.match(/^(docs\/specs\/\S+\.md)\s*:\s*(\S.*)$/)
  const verification = field(section, "Verification")
  const queue = field(section, "Queue")
  const allowedEdits = field(section, "Allowed edits")
  const answers = designAnswers(section)
  return {
    present: section.trim().length > 0,
    route: route === "/sdd-to-tdd" || route === "/design" ? route : "",
    queue,
    specPath: specMatch ? specMatch[1] : "",
    criteria: specMatch ? specMatch[2].trim() : "",
    designAnswers: answers,
    decisions: decisionLines(section),
    allowedEdits,
    verification,
    outOfScope: field(section, "Out of scope"),
  }
}

export function missingBriefParts(brief) {
  const missing = []
  if (!brief.present) missing.push("section")
  if (!brief.route) missing.push("route")
  if (!brief.verification) missing.push("verification")
  if (brief.route === "/sdd-to-tdd") {
    if (!brief.specPath || !brief.criteria) missing.push("spec")
  }
  if (brief.route === "/design") {
    for (const key of DESIGN_ANSWER_KEYS) {
      if (!brief.designAnswers[key]) missing.push(key)
    }
  }
  return missing
}

export function isCompleteBrief(markdown) {
  const brief =
    typeof markdown === "string" ? parseReadyBrief(markdown) : markdown
  return missingBriefParts(brief).length === 0
}

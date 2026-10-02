import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("conduct command", () => {
  it("pins morning, next, stops, hard limits, and never-ask", () => {
    const text = readFileSync(
      path.join(process.cwd(), ".cursor", "commands", "conduct.md"),
      "utf8",
    )
    expect(text).toContain("managed Cloud only")
    expect(text).toContain("`morning`")
    expect(text).toContain("`next`")
    expect(text).toContain("On Mondays")
    expect(text).toContain("Work started:")
    expect(text).toContain("cursor/res-")
    expect(text).toContain("Clarification required")
    expect(text).toContain("gh auth status")
    expect(text).toContain("Never ask the operator a question")
    expect(text).toContain("gh pr merge")
    expect(text).toContain("roundCap: 3")
    expect(text).toContain("APPROVED FOR OPERATOR MERGE")
    expect(text).toContain("In Progress")
    expect(text).toContain("@Cursor")
    expect(text).not.toContain("AskQuestion")
    expect(text).not.toContain("cloud-running")
    expect(text).not.toContain("git merge-base --is-ancestor")
  })
})

function isolateCloudLane(markdown: string): string {
  const heading = "## Cloud lane"
  const start = markdown.indexOf(heading)
  if (start === -1) return ""
  const rest = markdown.slice(start + heading.length)
  const nextHeading = rest.search(/\n## /)
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading)
}

function cloudLaneSentences(section: string): string[] {
  return section
    .replace(/\s+/g, " ")
    .split(/\.\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

function plain(sentence: string): string {
  return sentence.replace(/`/g, "")
}

function bansBranchCreationAndAgentInvocation(sentence: string): boolean {
  const text = plain(sentence)
  return (
    /\bcreates? a branch\b/.test(text) && /\binvokes? an agent\b/.test(text)
  )
}

/** Exclusion, not a mention. "including /conduct" stays an absolute ban. */
function carvesConductOutOfBranchAndAgentBan(sentence: string): boolean {
  if (!bansBranchCreationAndAgentInvocation(sentence)) return false
  const text = plain(sentence)
  return (
    /\bno other command\b/i.test(text) ||
    /\bexcept\s+\/conduct\b/.test(text) ||
    /\bother than\s+\/conduct\b/.test(text)
  )
}

function isAbsoluteBranchOrAgentBan(sentence: string): boolean {
  if (!bansBranchCreationAndAgentInvocation(sentence)) return false
  if (carvesConductOutOfBranchAndAgentBan(sentence)) return false
  return /\bNo command\b/.test(plain(sentence))
}

function sentencePermitsConduct(sentence: string): boolean {
  const text = plain(sentence)
  return (
    /\/conduct\s+(?:may|can|creates|runs)\b/.test(text) ||
    /\bexcept\s+\/conduct(?:,\s*which)?\s+(?:may|can|creates|runs)\b/.test(text)
  )
}

describe("G-CON1 Cloud-lane ban", () => {
  it("excludes /conduct branch creation and route commands from the absolute ban", () => {
    const rule = readFileSync(
      path.join(process.cwd(), ".cursor", "rules", "staging-accumulator.mdc"),
      "utf8",
    )
    const sentences = cloudLaneSentences(isolateCloudLane(rule))
    const absoluteBranchOrAgentBans = sentences.filter(
      isAbsoluteBranchOrAgentBan,
    )
    const permissionText = sentences
      .filter(sentencePermitsConduct)
      .map(plain)
      .join(" ")

    expect(absoluteBranchOrAgentBans).toEqual([])
    expect({
      banExcludesConduct: sentences.some(carvesConductOutOfBranchAndAgentBan),
      conductMayCreateMorningAndResBranches:
        permissionText.includes("cursor/morning-") &&
        permissionText.includes("cursor/res-"),
      conductMayRunRouteCommands:
        permissionText.includes("/sdd-to-tdd") &&
        /\/design\b/.test(permissionText),
    }).toEqual({
      banExcludesConduct: true,
      conductMayCreateMorningAndResBranches: true,
      conductMayRunRouteCommands: true,
    })
  })
})

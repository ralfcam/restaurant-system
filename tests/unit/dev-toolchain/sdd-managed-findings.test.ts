import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8")
}

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const nextHeading = rest.slice(heading.length).search(/\n## /)
  return nextHeading === -1 ? rest : rest.slice(0, heading.length + nextHeading)
}

function plain(text: string): string {
  return text.replace(/[`*]/g, "").replace(/\s+/g, " ").trim()
}

function sentencesOf(block: string): string[] {
  return plain(block)
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

/**
 * Local Plan Mode may still stop for confirmation before net-new work.
 * A sentence that also names Managed Cloud is not that carve-out.
 */
function isLocalPlanModeConfirmation(sentence: string): boolean {
  return (
    /\bLocal Plan Mode\b/.test(sentence) && !/\bManaged Cloud\b/.test(sentence)
  )
}

function affirmed(sentence: string, phrase: string): boolean {
  const at = sentence.indexOf(phrase)
  if (at === -1) return false
  const prefix = sentence.slice(Math.max(0, at - 24), at)
  return !/\b(?:not|never|without|no)\b/.test(prefix)
}

/**
 * Unscoped handoff that still tells managed close-out to file net-new issues.
 * A Local Plan Mode confirmation sentence is excluded.
 */
function proposesManagedNetNewFiling(sentence: string): boolean {
  if (isLocalPlanModeConfirmation(sentence)) return false
  return (
    affirmed(sentence, "proposes the new issues") ||
    affirmed(sentence, "cap of 3 net-new issues")
  )
}

describe("G-CR4 managed STEP 4C", () => {
  it("keeps managed close-out attach-only and leaves new issues on the ledger", () => {
    const step4c = section(
      read(".cursor/commands/sdd-to-tdd.md"),
      "## STEP 4C — MERGE + REGISTER OUT-OF-SCOPE FINDINGS (any mode)",
    )
    const sentences = sentencesOf(step4c)
    const managedText = sentences
      .filter((sentence) => /\bManaged Cloud\b/.test(sentence))
      .join(" ")

    expect(step4c).toContain("## STEP 4C")
    expect(sentences.filter(proposesManagedNetNewFiling)).toEqual([])
    expect(managedText).toMatch(/attach-only/)
    expect(managedText).toMatch(/\bledger\b/)
    expect(managedText).toMatch(/\b(?:continue|keeps?)\b/)
  })
})

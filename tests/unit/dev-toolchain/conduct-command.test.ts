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

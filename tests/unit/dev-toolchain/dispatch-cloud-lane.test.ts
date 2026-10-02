import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { isCompleteBrief } from "../../../.cursor/hooks/lib/ready-brief-policy.mjs"

const repoRoot = process.cwd()

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8")
}

function fencedBrief(text: string, heading: string): string {
  const start = text.indexOf(heading)
  const fence = text.indexOf("```text", start)
  const end = text.indexOf("```", fence + "```text".length)
  return text.slice(fence + "```text".length, end).trim()
}

describe("dispatch Cloud lane", () => {
  it("replaces parallelization advice with Ready briefs and a dispatch digest", () => {
    const dispatch = read(".cursor/commands/dispatch.md")
    const resolver = read(".cursor/agents/linear-resolver.md")
    expect(dispatch).toContain("## STEP 0B — MANAGED CLOUD ONE-SHOT")
    expect(dispatch).toContain("Cloud lane: Ready briefs")
    expect(dispatch).not.toContain("Cloud parallelization recommendations")
    expect(dispatch).not.toContain("cloud-ready")
    expect(dispatch).toContain("node .cursor/checks/ready-brief.mjs")
    expect(dispatch).toContain("at most 3 new issues")
    expect(dispatch).toContain("Dispatch run key:")
    expect(dispatch).toContain("`offTrack`")
    expect(dispatch).toContain("`atRisk`")
    expect(dispatch).toContain("`onTrack`")
    expect(isCompleteBrief(fencedBrief(dispatch, "Example code brief:"))).toBe(
      true,
    )
    expect(
      isCompleteBrief(fencedBrief(dispatch, "Example design brief:")),
    ).toBe(true)
    expect(resolver).toContain("## Workflow — READY")
    expect(resolver).toContain("Dispatch run key:")
    expect(resolver).toContain("Seven duties: CLARIFY comment")
    expect(resolver).toContain("the caller read")
  })
})

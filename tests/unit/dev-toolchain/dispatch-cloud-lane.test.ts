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

/**
 * When-invoked Project update bullet only. Stop before the next bullet so
 * the workflow section's `Dispatch run key:` cannot satisfy this pin.
 */
function whenInvokedProjectUpdateHandoff(markdown: string): string {
  const heading = "## When invoked"
  const start = markdown.indexOf(heading)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const nextHeading = rest.slice(heading.length).search(/\n## /)
  const whenInvoked =
    nextHeading === -1 ? rest : rest.slice(0, heading.length + nextHeading)
  const marker = "- **Project update:**"
  const bullet = whenInvoked.indexOf(marker)
  if (bullet === -1) return ""
  const fromBullet = whenInvoked.slice(bullet)
  const nextBullet = fromBullet.indexOf("\n- **")
  return nextBullet === -1 ? "" : fromBullet.slice(0, nextBullet)
}

/** Report template Project update fields, through that fence's close. */
function projectUpdateReportBlock(markdown: string): string {
  const heading = "## Project update"
  const start = markdown.indexOf(heading)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const fenceEnd = rest.indexOf("\n```")
  return fenceEnd === -1 ? "" : rest.slice(0, fenceEnd)
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

  it("accepts a Dispatch run key in the PROJECT-UPDATE handoff and report block", () => {
    const resolver = read(".cursor/agents/linear-resolver.md")
    const handoff = whenInvokedProjectUpdateHandoff(resolver)
    const report = projectUpdateReportBlock(resolver)

    expect(handoff).toContain("- **Project update:**")
    expect(handoff).toContain("`audit:")
    expect(handoff).not.toContain("## Workflow — PROJECT-UPDATE")
    expect(report).toContain("Audit run key:")
    expect(report).not.toContain("## Workflow — PROJECT-UPDATE")
    expect({ handoff, report }).toEqual({
      handoff: expect.stringContaining("Dispatch run key:"),
      report: expect.stringContaining("Dispatch run key:"),
    })
  })
})

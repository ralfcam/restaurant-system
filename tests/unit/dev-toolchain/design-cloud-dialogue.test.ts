import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading)
  if (start === -1) return ""
  const rest = markdown.slice(start)
  const nextHeading = rest.slice(heading.length).search(/\n## /)
  return nextHeading === -1 ? rest : rest.slice(0, heading.length + nextHeading)
}

describe("design managed Cloud dialogue", () => {
  it("bypasses only the mode gate and preserves approval before writes", () => {
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const commandReadme = readFileSync(
      path.join(repoRoot, ".cursor", "README.md"),
      "utf8",
    )
    const step0 = section(design, "## STEP 0 — PLAN MODE GATE")
    const step0b = section(
      design,
      "## STEP 0B — MANAGED CLOUD INTERACTIVE (narrow exception)",
    )
    const step4 = section(design, "## STEP 4 — PRESENT FOR APPROVAL")
    const execution = section(
      design,
      "## Execution Protocol (PHASE 5 — after plan approval)",
    )

    expect(step0).toContain("/v1/meta-data/agent/runtime")
    expect(step0).toContain("Exactly `managed`")
    expect(step0).toContain("no repo or spec reads")
    expect(step0).toContain("retry the connection once")

    expect(step0b).toContain("waives only the Plan Mode requirement")
    expect(step0b).toMatch(/one-question-at-a-time\s+dialogue/)
    expect(step0b).toContain("`AskQuestion` wait")
    expect(step0b).toMatch(
      /does not\s+turn `\/design` into an unattended one-shot/,
    )
    expect(step0b).toContain(".cursor/plans/<plan-slug>.plan.md")
    expect(step0b).toContain(
      "required after approval and before any PHASE 5 write",
    )

    expect(step4).toMatch(
      /managed Cloud[\s\S]*stop and wait[\s\S]*explicit [`"]Go ahead/,
    )
    expect(execution).toContain("managed-Cloud work-order")
    expect(design).toContain(
      "Plan Mode: YES (proceeding) | CLOUD-MANAGED (interactive) | NO (stopped)",
    )

    const planOnlyParagraph = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Plan Mode only:**"))
    expect(planOnlyParagraph).not.toContain("[`/design`]")
    expect(commandReadme).toContain("[`/design`](commands/design.md)")
  })
})

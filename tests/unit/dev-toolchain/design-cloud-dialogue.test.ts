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

  it("uses PowerShell syntax for the managed runtime probe", () => {
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const step0 = section(design, "## STEP 0 — PLAN MODE GATE")

    expect(step0).toContain("```powershell")
    expect(step0).toContain("$env:CURSOR_AGENT_SOCKET")
    expect(step0).toContain("/run/cursor/api.sock")
    expect(step0).toMatch(/&\s+curl(?:\.exe)?\s+-fsS\b/)
    expect(step0).not.toContain("```bash")
    expect(step0).not.toMatch(/\$\{[^}]+\}/)
  })

  it("denies unsupported runtimes before STEP 0B", () => {
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const step0 = section(design, "## STEP 0 — PLAN MODE GATE")

    expect(step0).toContain("self-hosted")
    expect(step0).toContain("`unknown`")
    expect(step0).toContain("empty body")
    expect(step0).toContain("value other than exactly `managed`")
    expect(step0).toMatch(/fail[- ]closed/)
    expect(step0).toContain("MUST NOT enter STEP 0B")
  })

  it("indexes design under managed Cloud-capable commands", () => {
    const commandReadme = readFileSync(
      path.join(repoRoot, ".cursor", "README.md"),
      "utf8",
    )
    const managedCloudParagraph = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Managed Cloud-capable:**"))

    expect(managedCloudParagraph).toBeDefined()
    expect(managedCloudParagraph).toContain("[`/design`](commands/design.md)")
    expect(managedCloudParagraph).toContain(
      "retains its interactive dialogue and approval stops",
    )
  })

  it("indexes one-shot commands beside interactive design", () => {
    const commandReadme = readFileSync(
      path.join(repoRoot, ".cursor", "README.md"),
      "utf8",
    )
    const managedCloudParagraph = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Managed Cloud-capable:**"))

    expect(managedCloudParagraph).toBeDefined()
    expect(managedCloudParagraph).toContain(
      "[`/sdd-to-tdd`](commands/sdd-to-tdd.md)",
    )
    expect(managedCloudParagraph).toContain("[`/capture`](commands/capture.md)")
    expect(managedCloudParagraph).toContain("[`/triage`](commands/triage.md)")
    expect(managedCloudParagraph).toContain("one-shot commands")
    expect(managedCloudParagraph).toContain("[`/design`](commands/design.md)")
    expect(managedCloudParagraph).toContain(
      "retains its interactive dialogue and approval stops",
    )
  })
})

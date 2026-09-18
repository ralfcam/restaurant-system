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

describe("triage managed Cloud one-shot", () => {
  it("probes managed runtime and executes only a durable authorized plan", () => {
    const triage = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "triage.md"),
      "utf8",
    )
    const commandReadme = readFileSync(
      path.join(repoRoot, ".cursor", "README.md"),
      "utf8",
    )
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const step0 = section(triage, "## STEP 0 — PLAN MODE GATE")
    const step0b = section(
      triage,
      "## STEP 0B — MANAGED CLOUD ONE-SHOT (narrow exception)",
    )
    const phase4 = section(triage, "## PHASE 4 — Approved execution")

    expect(step0).toContain("/v1/meta-data/agent/runtime")
    expect(step0).toContain("Exactly `managed`")
    expect(step0).toContain("no ledger reads")
    expect(step0).toContain("retry the connection once")

    expect(step0b).toContain("before any Linear or ledger mutation")
    expect(step0b).toContain(".cursor/plans/<plan-slug>.plan.md")
    expect(step0b).toMatch(
      /do not\s+auto-confirm net-new Linear finding issues/,
    )

    expect(phase4).toContain(
      "execute every authorized execution todo sequentially in this same turn",
    )
    expect(phase4).toContain("linear-resolver")

    expect(triage).toContain("Plan Mode: YES | CLOUD-MANAGED (one-shot) | NO")
    expect(triage).toContain("## Execution Todos")
    expect(triage).toContain(
      "`authorized` | `deferred — <confirmation/safety reason>`",
    )

    const planOnlyParagraph = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Plan Mode only:**"))
    expect(planOnlyParagraph).not.toContain("[`/triage`]")
    expect(commandReadme).toContain("[`/triage`](commands/triage.md)")
    expect(design).not.toContain("like `/triage` and `/audit`")
  })
})

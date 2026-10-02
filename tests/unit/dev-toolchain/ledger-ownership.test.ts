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

describe("findings ledger ownership", () => {
  it("keeps category and archive writes on docs-updater ledger-apply", () => {
    const updater = read(".cursor/agents/docs-updater.md")
    const ledger = section(updater, "## Ledger-apply delegation")
    expect(ledger).toContain("append")
    expect(ledger).toContain("sharpen")
    expect(ledger).toContain("stamp")
    expect(ledger).toContain("archive")
    expect(ledger).toContain("remove")
    expect(ledger).toContain("delete a run file")
    expect(ledger).toContain("The docs-sync workflow does not run in this mode")
    expect(ledger).toContain("pnpm exec prettier --check")

    const policy = read(".cursor/hooks/lib/findings-write-policy.mjs")
    expect(policy).toContain("docs/findings/runs/")
    expect(policy).toContain("isRunScratchPath")

    const sdd = read(".cursor/commands/sdd-to-tdd.md")
    const step4c = section(
      sdd,
      "## STEP 4C — MERGE + REGISTER OUT-OF-SCOPE FINDINGS (any mode)",
    )
    expect(step4c).toContain("ledger-apply")
    expect(step4c).toContain("Never truncate")
    expect(step4c).toContain("/curate` owns their eventual fate")
    expect(step4c).not.toContain("truncate/delete")

    const audit = section(
      read(".cursor/commands/audit.md"),
      "PART 8 — FINDINGS LEDGER HANDOFF",
    )
    expect(audit).toContain("ledger-apply")
    expect(audit).toContain("Do not Write a category file")

    const triage = read(".cursor/commands/triage.md")
    expect(triage).toContain("docs-updater` ledger-apply")
    expect(triage).toContain("pnpm exec prettier --check")
    expect(triage).not.toContain("second sighting")

    const findings = read("docs/findings/README.md")
    expect(findings).toContain("`/curate` owns keep-or-drop")
    expect(findings).toMatch(/Prunable class[\s\S]{0,120}\/curate/)
    expect(findings).toContain("`→ resolved (<evidence>)`")
    expect(findings).toContain("`→ duplicate`")
    expect(findings).not.toContain("second sighting")
  })
})

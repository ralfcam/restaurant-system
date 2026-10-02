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

describe("curate weekly keep-or-drop", () => {
  it("pins Plan Mode reads, guards, scopes, memory, and the digest cap", () => {
    const curate = read(".cursor/commands/curate.md")
    const step0 = section(curate, "## STEP 0 — PLAN MODE GATE")
    const reads = section(curate, "## PHASE 1 — Read")
    const propose = section(curate, "## PHASE 2 — Propose")
    const execute = section(curate, "## PHASE 4 — Approved execution")
    const digest = section(curate, "## Digest")

    expect(step0).toContain("/curate runs in Plan Mode only.")
    expect(step0).toContain("before any Linear read, ledger read")
    expect(curate).toContain("## STEP 0B — MANAGED CLOUD ONE-SHOT")
    expect(curate).toContain("Held for you")
    expect(curate).not.toContain("no managed-Cloud one-shot")
    expect(curate).toContain("no subagent fan-out")

    expect(reads).toContain("list_projects")
    expect(reads).toContain("canonical version key")
    expect(reads).toContain("includeRelations: true")
    expect(reads).toContain("gh pr list")
    expect(reads).toContain('updatedAt: "-P7D"')
    expect(reads).toContain("Backlog")
    expect(reads).toContain("Todo")

    expect(curate).toContain(
      "Grep ledger before MCP: Grep `docs/findings/archive.md` and open `docs/findings/*.md` for `RES-###` before the first `list_issues` / `get_issue`.",
    )
    expect(propose).toContain("duplicateOf")
    expect(propose).toContain("Prunable")
    expect(propose).toContain("(seen: /curate YYYY-MM-DD)")
    expect(propose).toContain("wont-file (stale)")
    expect(propose).toContain("security.md")
    expect(propose).toContain("open PR")
    expect(curate).toContain(
      "Do not set project, milestone, priority, estimate, or cycle.",
    )
    expect(curate).toContain("Do not write In Progress, In Review, or Done.")
    expect(curate).toContain("Do not file ledger entries into Linear.")

    for (const scope of [
      "curate-terminal",
      "curate-structure",
      "curate-attach",
      "curate-ledger",
      "curate-digest",
    ]) {
      expect(execute).toContain(scope)
    }
    expect(execute).toContain("linear-resolver")
    expect(execute).toContain("ledger-apply")
    expect(execute).toContain("kept by /curate")
    expect(execute).toContain("relatedTo")
    expect(curate).toContain("at most 5")

    expect(digest).toContain("7-day flow")
    expect(digest).toContain("WIP filing gate")
    expect(digest).toContain("Expiring within 7 days")

    const commandReadme = read(".cursor/README.md")
    const planOnly = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Plan Mode only:**"))
    expect(planOnly).not.toContain("[`/curate`]")
    const managed = commandReadme
      .split("\n\n")
      .find((paragraph) => paragraph.startsWith("**Managed Cloud-capable:**"))
    expect(managed).toContain("[`/curate`](commands/curate.md)")
    expect(commandReadme).toContain(
      "`/triage` → `Backlog` → `/curate` → `/dispatch`",
    )

    const resolver = read(".cursor/agents/linear-resolver.md")
    expect(resolver).toContain("`duplicateOf`")
    expect(resolver).toContain("`curate-terminal`")
    expect(resolver).toContain("kept by /curate")
    expect(resolver).toContain("`Backlog` or `Todo`")
  })
})

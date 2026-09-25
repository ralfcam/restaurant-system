import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

function isolatePhase5Section(markdown: string): string {
  const heading = "## PHASE 5 — EXECUTION"
  const start = markdown.indexOf(heading)
  if (start === -1) {
    return ""
  }
  const rest = markdown.slice(start)
  const nextHeading = rest.search(/\n## /)
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading)
}

function lineQualifiesLocalTurnRule(line: string): boolean {
  return /\blocal\b/i.test(line) || /unless\s+STEP\s+0B/i.test(line)
}

describe("capture PHASE 5 Cloud turn rule", () => {
  it("Capture PHASE 5 qualifies the Cloud same-turn execution rule", () => {
    const captureMd = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "capture.md"),
      "utf8",
    )
    const phase5 = isolatePhase5Section(captureMd)

    expect(phase5).toContain(
      "execute every listed PHASE 5 todo sequentially in this same turn",
    )

    const unqualifiedTurnStops = phase5
      .split("\n")
      .filter((line) => line.includes("one todo per turn"))
      .filter((line) => !lineQualifiesLocalTurnRule(line))

    expect(unqualifiedTurnStops).toEqual([])
  })
})

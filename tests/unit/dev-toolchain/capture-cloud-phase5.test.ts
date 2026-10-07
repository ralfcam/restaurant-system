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

function isolateExecutionProtocolBlock(markdown: string): string {
  const heading =
    "## Execution Protocol (MANDATORY — read first when executing this plan)"
  const start = markdown.indexOf(heading)
  if (start === -1) {
    return ""
  }
  const rest = markdown.slice(start)
  const nextHeading = rest.search(/\n## /)
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading)
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ")
}

function topLevelDashItems(block: string): string[] {
  const items: string[] = []
  let current: string[] | null = null
  for (const line of block.split("\n")) {
    if (line.startsWith("- ")) {
      if (current) {
        items.push(current.join(" "))
      }
      current = [line]
    } else if (current) {
      current.push(line)
    }
  }
  if (current) {
    items.push(current.join(" "))
  }
  return items
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

  it("Capture work-order Execution Protocol qualifies the Cloud same-turn execution rule", () => {
    const captureMd = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "capture.md"),
      "utf8",
    )
    const protocol = isolateExecutionProtocolBlock(captureMd)

    expect(protocol).not.toBe("")
    expect(collapseWhitespace(protocol)).toContain(
      "execute every listed PHASE 5 todo sequentially in this same turn",
    )

    const unqualifiedTurnStops = topLevelDashItems(protocol)
      .filter((item) => /one at a time|prior turn/i.test(item))
      .filter((item) => !lineQualifiesLocalTurnRule(item))

    expect(unqualifiedTurnStops).toEqual([])
  })
})

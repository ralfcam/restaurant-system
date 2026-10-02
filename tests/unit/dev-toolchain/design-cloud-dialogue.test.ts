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

function plain(text: string): string {
  return text.replace(/`/g, "").replace(/\s+/g, " ").trim()
}

function sentencesOf(block: string): string[] {
  return plain(block)
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

function taggedBlock(markdown: string, tag: string): string {
  const match = markdown.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match?.[1] ?? ""
}

function modeWorkOrderLine(markdown: string): string {
  const mode = section(taggedBlock(markdown, "output_format"), "## Mode Check")
  const start = mode.search(/^- Work-order:/m)
  if (start === -1) return ""
  const rest = mode.slice(start)
  const nextBullet = rest.slice(1).search(/\n- /)
  return (nextBullet === -1 ? rest : rest.slice(0, nextBullet + 1)).trim()
}

/**
 * Same-sentence carve-out only. A previous sentence's "except STEP 0C"
 * does not exempt this one.
 */
function carvesStep0cOutOfWorkOrderGate(sentence: string): boolean {
  return (
    /\bexcept STEP 0C\b/.test(sentence) || /\bSTEP 0C writes\b/.test(sentence)
  )
}

function isUnconditionalLaterApprovalWorkOrder(sentence: string): boolean {
  const onlyLaterTurnWrites =
    /\bonly that later approval turn writes\b/i.test(sentence) &&
    /\bwork-order\b/i.test(sentence)
  const doNotWriteUntilGoAhead =
    /\bdo not write a\b/i.test(sentence) &&
    /\bwork-order\b/i.test(sentence) &&
    /\buntil\b/i.test(sentence) &&
    /\bGo ahead\b/.test(sentence)
  if (!onlyLaterTurnWrites && !doNotWriteUntilGoAhead) return false
  return !carvesStep0cOutOfWorkOrderGate(sentence)
}

function sendsStep0cStraightThrough(block: string): boolean {
  return sentencesOf(block).some((sentence) => {
    const namesStep0c = /\bSTEP 0C\b/.test(sentence)
    const writesWorkOrder =
      /\bwrites?\b/.test(sentence) &&
      (/\bwork-order\b/.test(sentence) || /\.cursor\/plans\//.test(sentence))
    const postsStart = /\bSTART\b/.test(sentence)
    const noGoAheadGate =
      /\bwithout waiting\b/i.test(sentence) ||
      /\b(?:do|does) not wait\b/i.test(sentence) ||
      /\bwithout\b[^.]{0,80}\bGo ahead\b/.test(sentence) ||
      /\bno Go ahead\b/i.test(sentence)
    return namesStep0c && writesWorkOrder && postsStart && noGoAheadGate
  })
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

  it("pins the briefed STEP 0C one-shot without dropping interactive stops", () => {
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const step0c = section(design, "## STEP 0C — BRIEFED DESIGN ONE-SHOT")
    expect(step0c).toContain("complete design brief")
    expect(step0c).toContain("no open clarification")
    expect(step0c).toContain("spec-PR merge replaces")
    expect(step0c).toContain("conductor, not `/design`, runs commit and push")
    expect(step0c).toContain("STEP 0B (interactive) is unchanged")
    expect(step0c).toContain(".cursor/plans/<plan-slug>.plan.md")
    expect(step0c).toContain("the brief is the approval")
    expect(step0c).toContain(
      "Use the linear-resolver subagent to start work on <RES-###> (plan: <plan-slug>)",
    )
    expect(step0c).toContain("do not wait")
    expect(design).toContain("CLOUD-MANAGED (briefed one-shot)")
    expect(design).toContain("except STEP 0C")
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

  it("sends STEP 0C straight to the work-order and START without a Go ahead gate", () => {
    const design = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "design.md"),
      "utf8",
    )
    const step4 = section(design, "## STEP 4 — PRESENT FOR APPROVAL")
    const constraints = taggedBlock(design, "constraints")
    const modeLine = modeWorkOrderLine(design)
    const unconditionalLaterApprovalWorkOrderSentences = [
      step4,
      constraints,
      modeLine,
    ]
      .flatMap(sentencesOf)
      .filter(isUnconditionalLaterApprovalWorkOrder)

    expect(unconditionalLaterApprovalWorkOrderSentences).toEqual([])
    expect({
      step4: sendsStep0cStraightThrough(step4),
      constraints: sendsStep0cStraightThrough(constraints),
      modeLine: sendsStep0cStraightThrough(modeLine),
    }).toEqual({
      step4: true,
      constraints: true,
      modeLine: true,
    })
  })
})

import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  gateEvidenceHead,
  renderGateEvidence,
  replaceGateEvidence,
} from "../../../.cursor/hooks/lib/gate-evidence-policy.mjs"

const repoRoot = process.cwd()

function cli(args: string[], input: string) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "checks", "gate-evidence.mjs"), ...args],
    { input, encoding: "utf8" },
  )
}

describe("push gate evidence", () => {
  it("names ancestry commands, merge-on-drift, and the intake skip", () => {
    const push = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "push.md"),
      "utf8",
    )
    const intake = readFileSync(
      path.join(repoRoot, ".cursor", "commands", "intake.md"),
      "utf8",
    )
    expect(push).toContain("git merge-base --is-ancestor origin/staging")
    expect(push).toContain("git rev-list --count origin/staging..origin/main")
    expect(push).toContain("git merge-base --is-ancestor origin/main")
    expect(push).toContain("git merge origin/staging")
    expect(push).toMatch(/never rebase/i)
    expect(push).toContain("## Gate evidence")
    expect(push).toContain("gh pr edit <n> --body-file")
    expect(push).toContain("gate-evidence.mjs replace")
    expect(intake).toContain("gate evidence head matches headRefOid")
    expect(intake).toContain("gate-evidence.mjs head")
    expect(intake).toContain("Before counting, drop a PR")
  })

  it("renders the unit-gate line and replaces an existing block", () => {
    const head = "a".repeat(40)
    const block = renderGateEvidence({ head, result: "pass" })
    expect(block).toContain(
      "Gates: pnpm lint; pnpm typecheck; pnpm test:unit - pass",
    )
    const body = replaceGateEvidence("Summary\n", block)
    expect(gateEvidenceHead(body)).toBe(head)
    const next = "b".repeat(40)
    const replaced = replaceGateEvidence(
      body,
      renderGateEvidence({ head: next, result: "merged origin/staging" }),
    )
    expect(gateEvidenceHead(replaced)).toBe(next)
    expect(replaced.match(/## Gate evidence/g)).toHaveLength(1)
  })

  it("the CLI prints a head and replaces a body", () => {
    const head = "c".repeat(40)
    const missing = cli(["head"], "Summary\n")
    expect(missing.status).toBe(1)

    const replaced = cli(
      ["replace", "--head", head, "--result", "pass"],
      "Summary\n",
    )
    expect(replaced.status).toBe(0)
    expect(replaced.stdout).toContain(
      "Gates: pnpm lint; pnpm typecheck; pnpm test:unit - pass",
    )
    const read = cli(["head"], replaced.stdout)
    expect(read.status).toBe(0)
    expect(read.stdout.trim()).toBe(head)
  })
})

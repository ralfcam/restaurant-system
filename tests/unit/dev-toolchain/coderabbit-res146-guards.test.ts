import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(repoRoot, rel), "utf8")
}

describe("RES-146 CodeRabbit CLI evidence guards", () => {
  it("G-CR2 distinguishes a missing CLI from a version mismatch", () => {
    const spec = read("docs/specs/dev-toolchain.md")
    const gcr2 = spec
      .slice(spec.indexOf("8. **G-CR2"), spec.indexOf("9. **G-CR3"))
      .replace(/\s+/g, " ")
    expect(gcr2).toContain("cli_missing")
    expect(gcr2).toContain("not `version_mismatch`")
    expect(gcr2).toContain("cloud-install-coderabbit.sh")
    expect(gcr2).toContain("## CodeRabbit CLI evidence")
    expect(gcr2).toContain("/push` posts no pull-request comment")
    expect(gcr2).not.toContain("0.7.6")
  })

  it("G-CR2 makes /push the only agent CodeRabbit gate", () => {
    const spec = read("docs/specs/dev-toolchain.md")
    const gcr2 = spec
      .slice(spec.indexOf("8. **G-CR2"), spec.indexOf("9. **G-CR3"))
      .replace(/\s+/g, " ")
    expect(gcr2).toContain("agent's only CodeRabbit gate")
    expect(gcr2).toContain("capped at 2")
    expect(gcr2).toContain("three CLI passes")
    expect(gcr2).toContain("two fix rounds")
    expect(gcr2).toContain("blocked_major_findings")
    expect(gcr2).toContain("blocked_cli_unavailable")
    expect(gcr2).toContain("draft")
    expect(gcr2).toContain("MUST NOT call")
    expect(gcr2).toContain("`/ready-merge-release`")
    expect(gcr2).toContain("MUST NOT run `gh pr ready`")
    expect(gcr2).toContain("MUST NOT post")
    expect(gcr2).toContain("`@coderabbitai review`")
  })

  it("G-CR3 leaves readiness with the QA bot ralfcam", () => {
    const spec = read("docs/specs/dev-toolchain.md")
    const gcr3 = spec
      .slice(spec.indexOf("9. **G-CR3"), spec.indexOf("10. **G-TD1"))
      .replace(/\s+/g, " ")
    expect(gcr3).toContain("coderabbit_review_skipped")
    expect(gcr3).toContain("ready_cli_evidence")
    expect(gcr3).toContain("Bot user detected")
    expect(gcr3).toContain("operator/QA-owned")
    expect(gcr3).toContain("ralfcam")
    expect(gcr3).toContain("runs UAT")
    expect(gcr3).toContain("digests the agent transcript")
    expect(gcr3).toContain("findings")
    expect(gcr3).toContain("unavailable")
    expect(gcr3).not.toMatch(/posts `@coderabbitai review`/)
    expect(gcr3).toContain("MUST NOT poll")
  })

  it("documents the QA handoff and the evidence block", () => {
    const push = read(".cursor/commands/push.md")
    const conduct = read(".cursor/commands/conduct.md")
    const runbook = read("docs/runbooks/coderabbit.md")
    expect(push).toContain("## CodeRabbit CLI evidence")
    expect(push).toContain("gh pr ready --undo")
    expect(push).toContain(
      "Do not publish when the gate returns `action: block`",
    )
    expect(push).toMatch(
      /records `attemptStatus: unavailable` and exits zero/,
    )
    const rule = read(".cursor/rules/coderabbit-integration.mdc")
    expect(rule).toMatch(/recorded with exit zero/)
    expect(rule).toMatch(
      /does not publish or mark the PR ready when the\s+review was unavailable/,
    )
    expect(conduct).toContain("/ready-merge-release")
    expect(runbook).toContain("only CodeRabbit gate")
  })
})

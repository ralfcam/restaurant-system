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

  it("G-CR3 blocks a bot skip unless the same head has clean CLI evidence", () => {
    const spec = read("docs/specs/dev-toolchain.md")
    const gcr3 = spec
      .slice(spec.indexOf("9. **G-CR3"), spec.indexOf("10. **G-TD1"))
      .replace(/\s+/g, " ")
    expect(gcr3).toContain("coderabbit_review_skipped")
    expect(gcr3).toContain("ready_cli_evidence")
    expect(gcr3).toContain("Bot user detected")
    expect(gcr3).toContain("MUST NOT post a review trigger")
    expect(gcr3).toContain("ready_no_coderabbit_review")
  })

  it("documents the dropped trigger and the evidence block", () => {
    const release = read(".cursor/commands/ready-merge-release.md")
    const push = read(".cursor/commands/push.md")
    const runbook = read("docs/runbooks/coderabbit.md")
    expect(release).toContain("coderabbit_review_skipped")
    expect(release).toContain("ready_cli_evidence")
    expect(release).toContain("does not post a review trigger")
    expect(push).toContain("## CodeRabbit CLI evidence")
    expect(push).toContain("posts no pull-request comment")
    expect(push).toContain("cli_missing")
    expect(runbook).toContain("coderabbit_review_skipped")
    expect(runbook).toContain("ready_cli_evidence")
  })
})

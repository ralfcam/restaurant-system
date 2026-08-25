import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const packageJsonPath = path.join(repoRoot, "package.json")

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
}

describe("prettier toolchain", () => {
  it("prettier is installed with format and format:check scripts", () => {
    const pkg = readPackageJson()
    const devDependencies = pkg.devDependencies ?? {}

    expect(devDependencies).toHaveProperty("prettier")
    expect(
      existsSync(
        path.join(repoRoot, "node_modules", "prettier", "package.json"),
      ),
    ).toBe(true)

    expect(pkg.scripts?.format).toContain("prettier --write")
    expect(pkg.scripts?.["format:check"]).toContain("prettier --check")

    const prettierRc = readFileSync(
      path.join(repoRoot, ".prettierrc.json"),
      "utf8",
    )
    expect(prettierRc).toMatch(/"semi"\s*:\s*false/)
  })

  it("prettierignores snapshot trees that /sdd-to-tdd and /commit leave unformatted", () => {
    const ignore = readFileSync(path.join(repoRoot, ".prettierignore"), "utf8")

    expect(ignore).toMatch(/docs\/verifier-reports/)
    expect(ignore).toMatch(/docs\/findings\/runs/)
    expect(ignore).toMatch(/docs\/eval/)
  })
})

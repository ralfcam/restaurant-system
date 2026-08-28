import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const packageJsonPath = path.join(repoRoot, "package.json")
const lockfilePath = path.join(repoRoot, "pnpm-lock.yaml")

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>
  }
}

describe("typecheck toolchain", () => {
  it("swr is installed so TypeScript can resolve the module", () => {
    const pkg = readPackageJson()
    const dependencies = pkg.dependencies ?? {}
    const lockfile = readFileSync(lockfilePath, "utf8")

    expect(dependencies).toHaveProperty("swr")
    expect(lockfile).toMatch(/^\s+swr:/m)

    const swrPackageJsonPath = path.join(
      repoRoot,
      "node_modules",
      "swr",
      "package.json",
    )
    expect(existsSync(swrPackageJsonPath)).toBe(true)
  })

  it("next config does not ignore TypeScript build errors", () => {
    const nextConfig = readFileSync(
      path.join(repoRoot, "next.config.mjs"),
      "utf8",
    )

    expect(nextConfig).not.toMatch(
      /ignoreBuildErrors\s*:\s*(?!false\b|0\b)[^\s,}\n]+/,
    )
  })
})

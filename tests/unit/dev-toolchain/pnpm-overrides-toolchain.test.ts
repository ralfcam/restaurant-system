import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

function readPackageJson() {
  return JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
    packageManager?: string
    pnpm?: { overrides?: Record<string, string> }
  }
}

describe("pnpm override home", () => {
  it("pins packageManager and keeps the hono override in pnpm-workspace.yaml", () => {
    const pkg = readPackageJson()

    expect(pkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/)
    expect(pkg.pnpm?.overrides).toBeUndefined()

    const workspace = readFileSync(
      path.join(repoRoot, "pnpm-workspace.yaml"),
      "utf8",
    )
    expect(workspace).toMatch(/overrides:\s*\n\s*hono:\s*4\.12\.25/)

    const lockfile = readFileSync(path.join(repoRoot, "pnpm-lock.yaml"), "utf8")
    expect(lockfile).toMatch(/^overrides:\n\s+hono:\s+4\.12\.25/m)

    const environment = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "environment.json"), "utf8"),
    ) as { install?: string }
    expect(environment.install).toContain("corepack prepare --activate")
    expect(environment.install).toContain("pnpm install --frozen-lockfile")
    expect(environment.install).not.toMatch(/--no-frozen-lockfile/)
  })

  it("does not leave the dead package.json pnpm field as the override source", () => {
    expect(existsSync(path.join(repoRoot, "pnpm-workspace.yaml"))).toBe(true)
    expect(readPackageJson()).not.toHaveProperty("pnpm")
  })
})

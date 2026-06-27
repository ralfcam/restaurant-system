import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const packageJsonPath = path.join(repoRoot, "package.json")

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    devDependencies?: Record<string, string>
  }
}

describe("eslint toolchain", () => {
  it("eslint is installed and flat config exists", () => {
    const pkg = readPackageJson()
    const devDependencies = pkg.devDependencies ?? {}

    expect(devDependencies).toHaveProperty("eslint")
    expect(devDependencies).toHaveProperty("eslint-config-next")

    const flatConfigPaths = [
      path.join(repoRoot, "eslint.config.mjs"),
      path.join(repoRoot, "eslint.config.js"),
    ]
    const flatConfigExists = flatConfigPaths.some((configPath) =>
      existsSync(configPath),
    )

    expect(flatConfigExists).toBe(true)
  })
})

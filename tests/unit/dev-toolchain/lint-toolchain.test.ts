import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { ESLint } from "eslint"
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

  it("ignores gitignored supabase CLI temp and branches trees", async () => {
    const eslint = new ESLint({ cwd: repoRoot })

    expect(
      await eslint.isPathIgnored("supabase/.temp/start-secrets/main/index.ts"),
    ).toBe(true)
    expect(
      await eslint.isPathIgnored("supabase/.branches/_current_branch"),
    ).toBe(true)
    expect(await eslint.isPathIgnored("eslint.config.mjs")).toBe(false)
  })
})

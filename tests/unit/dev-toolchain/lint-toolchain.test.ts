import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const packageJsonPath = path.join(repoRoot, "package.json")

function readPackageJson() {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
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

  it("lint script passes --max-warnings 0 to eslint", () => {
    const pkg = readPackageJson()

    expect(pkg.scripts?.lint).toContain("--max-warnings 0")
  })

  it("errors (not warns) on an unused eslint-disable directive", async () => {
    const eslint = new ESLint({ cwd: repoRoot })
    const [result] = await eslint.lintText(
      [
        "const value = 1",
        "// eslint-disable-next-line no-unused-vars",
        "console.log(value)",
      ].join("\n"),
      { filePath: path.join(repoRoot, "unused-disable-probe.ts") },
    )

    const message = result.messages.find(
      (entry) =>
        entry.ruleId === null &&
        /Unused eslint-disable directive/.test(entry.message),
    )

    expect(message?.severity).toBe(2)
  })
})

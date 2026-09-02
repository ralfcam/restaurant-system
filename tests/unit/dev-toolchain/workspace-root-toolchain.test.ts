import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

describe("workspace root toolchain", () => {
  it("next config pins turbopack and output-tracing root to the project directory", () => {
    const nextConfig = readFileSync(
      path.join(repoRoot, "next.config.mjs"),
      "utf8",
    )

    const rootConstMatch = nextConfig.match(
      /(?:const|let)\s+(\w+)\s*=\s*(?:path\.)?dirname\(\s*fileURLToPath\(\s*import\.meta\.url\s*\)\s*\)/,
    )
    expect(rootConstMatch).not.toBeNull()
    const rootConst = rootConstMatch![1]

    expect(nextConfig).not.toMatch(
      /(?:turbopack\s*:[\s\S]*?\broot|outputFileTracingRoot)\s*:\s*process\.cwd\(/,
    )
    expect(nextConfig).toMatch(
      new RegExp(
        `turbopack\\s*:\\s*\\{[\\s\\S]*?\\broot\\s*:\\s*${rootConst}\\b`,
      ),
    )
    expect(nextConfig).toMatch(
      new RegExp(`\\boutputFileTracingRoot\\s*:\\s*${rootConst}\\b`),
    )
  })
})

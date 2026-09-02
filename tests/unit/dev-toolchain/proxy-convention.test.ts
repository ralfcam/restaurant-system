import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

describe("proxy convention", () => {
  it("root proxy.ts exists and middleware.ts does not", () => {
    expect(existsSync(path.join(repoRoot, "proxy.ts"))).toBe(true)
    expect(existsSync(path.join(repoRoot, "middleware.ts"))).toBe(false)
  })
})

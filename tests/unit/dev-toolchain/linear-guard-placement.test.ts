import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const LINEAR_GUARDS = [
  "linear-spawn-guard.mjs",
  "linear-comment-size-guard.mjs",
  "linear-write-guard.mjs",
]

describe("G-LG1 linear guard placement", () => {
  it("keeps Linear guards on beforeMCPExecution and off preToolUse", () => {
    const hooks = JSON.parse(
      readFileSync(path.join(process.cwd(), ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: { command: string; matcher?: string }[]
        beforeMCPExecution: { command: string }[]
      }
    }
    const pre = hooks.hooks.preToolUse.map((hook) => hook.command).join("\n")
    const before = hooks.hooks.beforeMCPExecution
      .map((hook) => hook.command)
      .join("\n")
    for (const guard of LINEAR_GUARDS) {
      expect(pre).not.toContain(guard)
      expect(before).toContain(guard)
    }
    expect(pre).not.toContain("MCP:")
    expect(
      hooks.hooks.preToolUse.some((hook) => hook.matcher === "Shell"),
    ).toBe(true)
  })
})

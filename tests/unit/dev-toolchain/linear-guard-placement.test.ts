import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const LINEAR_GUARDS = [
  "linear-spawn-guard.mjs",
  "linear-comment-size-guard.mjs",
  "linear-write-guard.mjs",
]

describe("G-LG1 linear guard placement", () => {
  it("wires Linear write lock to preToolUse MCP writers and keeps spawn/size off", () => {
    const hooks = JSON.parse(
      readFileSync(path.join(process.cwd(), ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: { command: string; matcher?: string }[]
        beforeMCPExecution: { command: string }[]
      }
    }
    const pre = hooks.hooks.preToolUse
    const before = hooks.hooks.beforeMCPExecution
      .map((hook) => hook.command)
      .join("\n")
    for (const guard of LINEAR_GUARDS) {
      expect(before).toContain(guard)
    }
    const writePre = pre.find((hook) =>
      hook.command.includes("linear-write-guard.mjs"),
    )
    expect(writePre?.matcher).toMatch(/MCP:save_issue/)
    expect(writePre?.matcher).toMatch(/save_comment/)
    expect(writePre?.matcher).toMatch(/save_status_update/)
    expect(
      pre.some((hook) => hook.command.includes("linear-spawn-guard.mjs")),
    ).toBe(false)
    expect(
      pre.some((hook) =>
        hook.command.includes("linear-comment-size-guard.mjs"),
      ),
    ).toBe(false)
    expect(pre.some((hook) => hook.matcher === "Shell")).toBe(true)
  })
})

import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { detectGhPrMerge } from "../../../.cursor/hooks/lib/tdd-guard-policy.mjs"

const repoRoot = process.cwd()

function runGitStageGuard(command: string) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", "git-stage-guard.mjs")],
    {
      encoding: "utf8",
      input:
        "\uFEFF" +
        JSON.stringify({
          tool_name: "Shell",
          tool_input: { command },
          hook_event_name: "preToolUse",
        }),
    },
  )
}

function permission(stdout: string) {
  return JSON.parse(stdout) as { permission?: string }
}

describe("v0.3.1 git-stage-guard push surface", () => {
  it("does not deny origin/main or origin/staging pushes (RES-151 leftover)", () => {
    expect(detectGhPrMerge("git push origin main")).toBeNull()
    const main = runGitStageGuard("git push origin main")
    expect(main.status).toBe(0)
    expect(permission(main.stdout)).toEqual({})

    const staging = runGitStageGuard("git push origin staging")
    expect(staging.status).toBe(0)
    expect(permission(staging.stdout)).toEqual({})
  })
})

import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { detectGhPrMerge } from "../../../.cursor/hooks/lib/tdd-guard-policy.mjs"

const repoRoot = process.cwd()

function runGitStageGuard(payload: Record<string, unknown>) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", "git-stage-guard.mjs")],
    {
      encoding: "utf8",
      input: "\uFEFF" + JSON.stringify(payload),
    },
  )
}

function permission(stdout: string) {
  return JSON.parse(stdout) as { permission?: string }
}

describe("v0.3.1 gh pr merge matching", () => {
  it("denies plain gh pr merge and leaves MCP merge matching to RES-151", () => {
    expect(detectGhPrMerge("gh pr merge")?.kind).toBe("pr-merge")
    expect(detectGhPrMerge("gh pr merge 12 --squash")?.kind).toBe("pr-merge")
    expect(detectGhPrMerge("echo x && gh pr merge 12")?.kind).toBe("pr-merge")

    const spawned = runGitStageGuard({
      tool_name: "Shell",
      tool_input: { command: "gh pr merge 12 --squash" },
      hook_event_name: "preToolUse",
    })
    expect(spawned.status).toBe(0)
    expect(permission(spawned.stdout).permission).toBe("deny")

    expect(detectGhPrMerge("gh pr create --base staging")).toBeNull()
    expect(detectGhPrMerge("gh pr view 1")).toBeNull()
    expect(detectGhPrMerge("gh pr ready 1")).toBeNull()
    expect(detectGhPrMerge("gh pr edit --add-reviewer foo")).toBeNull()
    expect(
      detectGhPrMerge("gh api repos/ralfcam/restaurant-system/pulls/12"),
    ).toBeNull()

    const hooks = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: Array<{
          command: string
          matcher?: string
          failClosed?: boolean
        }>
      }
    }
    const mcpMerge = hooks.hooks.preToolUse.find(
      (h) =>
        h.command.includes("git-stage-guard.mjs") &&
        typeof h.matcher === "string" &&
        /merge_pull_request|mergePullRequest|merge_pr/.test(h.matcher),
    )
    expect(mcpMerge).toBeUndefined()
    const shellFailClosed = hooks.hooks.preToolUse.filter(
      (h) => h.failClosed === true && h.matcher === "Shell",
    )
    expect(shellFailClosed).toHaveLength(1)
  })
})

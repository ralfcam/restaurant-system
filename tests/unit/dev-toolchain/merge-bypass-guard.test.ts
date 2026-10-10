import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  detectGhPrMerge,
  detectGithubMcpMerge,
} from "../../../.cursor/hooks/lib/tdd-guard-policy.mjs"

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

const BYPASSES: Array<[string, string]> = [
  ["bash -c wrap", "bash -c 'gh pr merge 12 --squash'"],
  ["full path gh", "/usr/bin/gh pr merge 12"],
  ["gh -R", "gh -R ralfcam/restaurant-system pr merge 12"],
  [
    "gh api merge",
    "gh api repos/ralfcam/restaurant-system/pulls/12/merge -X PUT",
  ],
  [
    "GraphQL mergePullRequest",
    "gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
  ],
  [
    "curl merge endpoint",
    "curl -X PUT https://api.github.com/repos/ralfcam/restaurant-system/pulls/12/merge",
  ],
  ["newline merge", "gh pr view 1\ngh pr merge 12"],
  ["background & merge", "gh pr view 1 & gh pr merge 12"],
  ["bash -c chained merge", "bash -c 'gh pr view 1; gh pr merge 12'"],
]

describe("G-MRG1 tolerant merge matching", () => {
  it("denies each listed merge bypass and GitHub MCP merge tools", () => {
    expect(detectGhPrMerge("gh pr merge")?.kind).toBe("pr-merge")

    for (const [label, command] of BYPASSES) {
      expect(detectGhPrMerge(command)?.kind, label).toBe("pr-merge")
      const spawned = runGitStageGuard({
        tool_name: "Shell",
        tool_input: { command },
        hook_event_name: "preToolUse",
      })
      expect(spawned.status, label).toBe(0)
      expect(permission(spawned.stdout).permission, label).toBe("deny")
    }

    expect(detectGhPrMerge("gh pr create --base staging")).toBeNull()
    expect(detectGhPrMerge("gh pr view 1")).toBeNull()
    expect(detectGhPrMerge("gh pr ready 1")).toBeNull()
    expect(detectGhPrMerge("gh pr edit --add-reviewer foo")).toBeNull()
    expect(
      detectGhPrMerge("gh api repos/ralfcam/restaurant-system/pulls/12"),
    ).toBeNull()

    for (const toolName of [
      "merge_pull_request",
      "MCP:merge_pull_request",
      "mergePullRequest",
      "merge_pr",
    ]) {
      expect(
        detectGithubMcpMerge({
          tool_name: toolName,
          tool_input: {},
          hook_event_name: "preToolUse",
        })?.kind,
        toolName,
      ).toBe("pr-merge")
      const spawned = runGitStageGuard({
        tool_name: toolName,
        tool_input: {},
        hook_event_name: "preToolUse",
      })
      expect(spawned.status, toolName).toBe(0)
      expect(permission(spawned.stdout).permission, toolName).toBe("deny")
    }

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
    expect(mcpMerge).toBeDefined()
    const shellFailClosed = hooks.hooks.preToolUse.filter(
      (h) => h.failClosed === true && h.matcher === "Shell",
    )
    expect(shellFailClosed).toHaveLength(1)
  })
})

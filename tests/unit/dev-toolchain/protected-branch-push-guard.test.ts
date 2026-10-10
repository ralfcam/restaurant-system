import { spawnSync } from "node:child_process"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { detectProtectedBranchPush } from "../../../.cursor/hooks/lib/tdd-guard-policy.mjs"

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

const DENIED: Array<[string, string]> = [
  ["push main", "git push origin main"],
  ["push staging", "git push origin staging"],
  ["force main", "git push --force origin main"],
  ["-f staging", "git push -f origin staging"],
  ["force-with-lease main", "git push --force-with-lease origin main"],
  ["HEAD:main", "git push origin HEAD:main"],
  ["HEAD:staging", "git push origin HEAD:staging"],
  ["+staging", "git push origin +staging"],
  ["refs/heads/main", "git push origin refs/heads/main"],
  ["full path git", "/usr/bin/git push origin main"],
  ["bash -c push staging", "bash -c 'git push origin staging'"],
]

const ALLOWED = [
  "git push origin HEAD",
  "git push -u origin cursor/res-151-cloud-harness-guards-14f7",
  "git push",
  "git status",
]

describe("G-PUSH1 no git push to main or staging", () => {
  it("denies force and ordinary pushes to main/staging", () => {
    for (const [label, command] of DENIED) {
      expect(detectProtectedBranchPush(command)?.kind, label).toBe(
        "protected-push",
      )
      const spawned = runGitStageGuard(command)
      expect(spawned.status, label).toBe(0)
      expect(permission(spawned.stdout).permission, label).toBe("deny")
    }

    for (const command of ALLOWED) {
      expect(detectProtectedBranchPush(command), command).toBeNull()
    }
    const feature = runGitStageGuard("git push origin HEAD")
    expect(feature.status).toBe(0)
    expect(permission(feature.stdout)).toEqual({})
  })
})

import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { detectProtectedBranchPush } from "../../../.cursor/hooks/lib/tdd-guard-policy.mjs"

const repoRoot = process.cwd()
const FEATURE = "cursor/res-151-cloud-harness-guards-14f7"

function runGitStageGuard(command: string, cwd = repoRoot) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", "git-stage-guard.mjs")],
    {
      cwd,
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
  ["--all", "git push --all"],
  ["--mirror", "git push --mirror origin"],
  ["-u origin main", "git push -u origin main"],
  ["--set-upstream origin staging", "git push --set-upstream origin staging"],
  ["newline push main", "git status\ngit push origin main"],
  ["background & staging", "git fetch & git push origin staging"],
  ["bash -c chained push", "bash -c 'git status; git push origin main'"],
]

const IMPLICIT_DENIED: Array<[string, string]> = [
  ["no dest", "git push"],
  ["remote only", "git push origin"],
  ["HEAD dest", "git push origin HEAD"],
  ["force no dest", "git push --force"],
  ["-f HEAD", "git push -f origin HEAD"],
  ["bash -c implicit HEAD", "bash -c 'git push origin HEAD'"],
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
      expect(
        detectProtectedBranchPush(command, { currentBranch: FEATURE })?.kind,
        label,
      ).toBe("protected-push")
      const spawned = runGitStageGuard(command)
      expect(spawned.status, label).toBe(0)
      expect(permission(spawned.stdout).permission, label).toBe("deny")
    }

    for (const command of ALLOWED) {
      expect(
        detectProtectedBranchPush(command, { currentBranch: FEATURE }),
        command,
      ).toBeNull()
    }
    const feature = runGitStageGuard("git push origin HEAD")
    expect(feature.status).toBe(0)
    expect(permission(feature.stdout)).toEqual({})
  })

  it("denies implicit dest when current branch is main or staging", () => {
    for (const branch of ["main", "staging"] as const) {
      for (const [label, command] of IMPLICIT_DENIED) {
        expect(
          detectProtectedBranchPush(command, { currentBranch: branch })?.kind,
          `${label} on ${branch}`,
        ).toBe("protected-push")
      }
    }
  })

  it("denies implicit dest when the current branch cannot be resolved", () => {
    expect(
      detectProtectedBranchPush("git push", { currentBranch: null })?.kind,
    ).toBe("protected-push")
    expect(
      detectProtectedBranchPush("git push origin HEAD", {
        currentBranch: null,
      })?.kind,
    ).toBe("protected-push")
  })

  it("does not treat git commit message text as a push", () => {
    const commitOnly =
      'git commit -m "fix(harness): deny implicit git push to main or staging"'
    expect(
      detectProtectedBranchPush(commitOnly, { currentBranch: FEATURE }),
    ).toBeNull()
    expect(
      detectProtectedBranchPush(
        "git add file && git commit -m 'git push origin main'",
        { currentBranch: FEATURE },
      ),
    ).toBeNull()
    expect(
      detectProtectedBranchPush("git commit -m x && git push origin main", {
        currentBranch: FEATURE,
      })?.kind,
    ).toBe("protected-push")
  })

  it("hook denies implicit push when cwd HEAD is main", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "g-push1-main-"))
    try {
      const init = spawnSync("git", ["init", "-b", "main"], {
        cwd: dir,
        encoding: "utf8",
      })
      expect(init.status).toBe(0)
      writeFileSync(path.join(dir, "README"), "x")
      spawnSync("git", ["add", "README"], { cwd: dir, encoding: "utf8" })
      spawnSync(
        "git",
        ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "t"],
        { cwd: dir, encoding: "utf8" },
      )
      const spawned = runGitStageGuard("git push origin HEAD", dir)
      expect(spawned.status).toBe(0)
      expect(permission(spawned.stdout).permission).toBe("deny")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

#!/usr/bin/env node
/**
 * preToolUse: always-on Shell guard (blanket git-stage + gh pr merge + commit gate).
 *
 * Blocks `git add -A|--all|.`, `git commit -a|--all`, tolerant GitHub merge
 * paths (including MCP merge tools), and `git push` to main/staging. After a
 * TDD loop sets loopRan, also blocks any `git commit` until /commit opens
 * the gate.
 *
 * failClosed: true in hooks.json — a crash or timeout of this script must not
 * fail-open into a blanket stage or a merge. Matcher is Shell-only so a crash
 * cannot brick Read/Grep/edits. Do not add a second failClosed Shell hook:
 * two scripts that can each brick every shell command would worsen a crash.
 * Contrast tdd-delegation-guard (failClosed: false): bricking editing is worse
 * than a missed TDD block. Payload shapes and the liveness standard:
 * .cursor/rules/hook-authoring.mdc.
 */
import {
  readStdinJson,
  writeStdoutJson,
  detectBlanketGitStage,
  detectGhPrMerge,
  detectGithubMcpMerge,
  detectGitCommit,
  detectProtectedBranchPush,
  addedPathsFromGit,
  evaluateGitCommitPermission,
  getCommitExempt,
  isLoopRan,
  stagedPathsFromGit,
} from "./lib/tdd-guard-policy.mjs"

function main() {
  try {
    const input = readStdinJson()
    const mcpMerge = detectGithubMcpMerge(input)
    if (mcpMerge) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked a GitHub MCP merge — merging is the operator's job in the GitHub UI.",
        agent_message:
          `git-stage guard: "${mcpMerge.segment}" is a GitHub merge tool, which is blocked ` +
          "repo-wide. Merge in the GitHub UI after /push; never merge from the agent. See " +
          ".cursor/rules/staging-accumulator.mdc and .cursor/commands/push.md.",
      })
      return
    }
    if (input.tool_name !== "Shell") {
      writeStdoutJson({})
      return
    }
    const command = input.tool_input?.command
    const mergeHit = detectGhPrMerge(command)
    if (mergeHit) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked a GitHub merge — merging is the operator's job in the GitHub UI.",
        agent_message:
          `git-stage guard: "${mergeHit.segment}" matches a GitHub merge, which is blocked ` +
          "repo-wide. Merge in the GitHub UI after /push; never merge from the agent. See " +
          ".cursor/rules/staging-accumulator.mdc and .cursor/commands/push.md.",
      })
      return
    }
    const pushHit = detectProtectedBranchPush(command)
    if (pushHit) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked `git push` to main or staging — publish a feature branch only.",
        agent_message:
          `git-stage guard: "${pushHit.segment}" pushes to main or staging, which is blocked ` +
          "repo-wide. Push the feature branch and open a draft PR into staging. See " +
          ".cursor/rules/staging-accumulator.mdc.",
      })
      return
    }
    const hit = detectBlanketGitStage(command)
    if (hit) {
      const verb =
        hit.kind === "add" ? "git add -A/--all/." : "git commit -a/--all"
      writeStdoutJson({
        permission: "deny",
        user_message: `Blocked a blanket "${verb}" — stage explicit paths only.`,
        agent_message:
          `git-stage guard: "${hit.segment}" matches a blanket ${verb} pattern, which is blocked ` +
          "repo-wide (it can stage secrets, build artifacts, or unrelated changes). List explicit " +
          'paths instead: `git add <path> <path> ...`, then `git commit -m "..."`. See the staging ' +
          "rule in .cursor/commands/commit.md Step 5.",
      })
      return
    }
    const commitHit = detectGitCommit(command)
    if (commitHit) {
      if (isLoopRan()) {
        writeStdoutJson({
          permission: "deny",
          user_message:
            "Blocked `git commit` after a TDD loop — run /commit to review and open the gate.",
          agent_message:
            `git-stage guard: "${commitHit.segment}" is a git commit after the TDD loop ran ` +
            "(loopRan). The plan-execution turn must not self-serve a commit. " +
            "`.cursor/commands/commit.md` opens the gate on PASS with " +
            "`node .cursor/hooks/tdd-guard.mjs gate open`; then retry the commit.",
        })
        return
      }
      const cwd = process.cwd()
      const staged = stagedPathsFromGit(cwd)
      const verdict = evaluateGitCommitPermission({
        loopRan: false,
        exemption: getCommitExempt(),
        stagedPaths: staged,
        addedPaths: addedPathsFromGit(cwd),
      })
      if (!verdict.ok) {
        writeStdoutJson({
          permission: "deny",
          user_message:
            "Blocked `git commit` — staged paths do not match the active commit exemption.",
          agent_message:
            `git-stage guard: "${commitHit.segment}" does not match the active ` +
            `commit exemption (${verdict.reason}). Stage only paths allowed by the ` +
            "documented /commit lane.",
        })
        return
      }
    }
    writeStdoutJson({})
  } catch (err) {
    console.error("[git-stage-guard]", err)
    process.exit(1)
  }
}

main()

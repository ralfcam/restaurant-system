#!/usr/bin/env node
/**
 * preToolUse: always-on Shell guard (blanket git-stage + gh pr merge + commit gate).
 *
 * Blocks `git add -A|--all|.`, `git commit -a|--all`, and `gh pr merge` in any
 * Shell command — /commit staging plus the "operator merges in GitHub" rule,
 * enforced deterministically instead of by prose discipline. After a TDD loop
 * sets loopRan, also blocks any `git commit` until /commit opens the gate.
 * While /sdd-to-tdd is armed and Task has not succeeded, also denies Shell
 * writes (redirect, tee, sed -i, cp, mv) to protected source paths and
 * `.cursor/hooks/state/**` except the armed-state file.
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
  checkLinearWriterParentShell,
  checkTaskAvailabilityShell,
  extractShellWriteTargets,
  isArmedStateFile,
  recordDisarm,
  detectBlanketGitStage,
  detectGhPrMerge,
  detectGitCommit,
  addedPathsFromGit,
  evaluateGitCommitPermission,
  getCommitExempt,
  isArmed,
  isLoopRan,
  isTaskAvailable,
  stagedPathsFromGit,
  status,
} from "./lib/tdd-guard-policy.mjs"

function main() {
  try {
    const input = readStdinJson()
    if (input.tool_name !== "Shell") {
      writeStdoutJson({})
      return
    }
    const command = input.tool_input?.command
    const writerHit = checkLinearWriterParentShell(command)
    if (writerHit) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked a parent Shell write to linear-writer.json — only linear-resolver subagentStart may set that flag.",
        agent_message:
          `git-stage guard: "${writerHit.target}" is linear-writer.json. The parent ` +
          "must not write that file via redirect, tee, sed -i, cp, or mv. Only the " +
          "linear-resolver subagentStart hook path may set the allow flag.",
      })
      return
    }
    if (isArmed()) {
      for (const target of extractShellWriteTargets(command)) {
        if (isArmedStateFile(target)) {
          recordDisarm({ source: `parent Shell ${target}` })
          break
        }
      }
    }
    const shellWrite = checkTaskAvailabilityShell(command, {
      armed: isArmed(),
      taskAvailable: isTaskAvailable(),
    })
    if (shellWrite) {
      writeStdoutJson({
        permission: "deny",
        user_message:
          "Blocked a Shell write — Task is unavailable. STOP and report BLOCKED (infra).",
        agent_message:
          `git-stage guard: "${shellWrite.target}" would write a protected or ` +
          "guard-state path while Task has not succeeded in this armed /sdd-to-tdd " +
          "run. Do not edit tests, source, or `.cursor/hooks/state/**` (except " +
          "tdd-guard.json) via redirect, tee, sed -i, cp, or mv. STOP and report " +
          "BLOCKED (infra).",
      })
      return
    }
    const mergeHit = detectGhPrMerge(command)
    if (mergeHit) {
      const what =
        mergeHit.reason === "expansion"
          ? "Blocked a Shell command that assembles gh, pr, or api merge via expansion ($ % backtick backslash)."
          : mergeHit.reason === "api-merge"
            ? "Blocked a Shell command that calls gh api on a pulls+merge path."
            : mergeHit.reason === "encoded"
              ? "Blocked a Shell command that uses an encoded PowerShell flag (can hide gh, pr, and merge)."
              : "Blocked a Shell command that contains the tokens gh, pr, and merge."
      const why =
        "Merging is the operator's job in the GitHub UI; Shell must not carry or assemble those operations."
      const alt =
        "Merge in the GitHub UI. To put those words in a commit message, Write a file and use `git commit -F <file>` — do not retry the Shell command."
      writeStdoutJson({
        permission: "deny",
        user_message: `${what} ${why} ${alt}`,
        agent_message:
          `git-stage guard: "${mergeHit.segment}" (${mergeHit.reason || "tokens"}). ` +
          `${what} ${why} ${alt}`,
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
      const guard = status()
      const verdict = evaluateGitCommitPermission({
        loopRan: false,
        exemption: getCommitExempt(),
        stagedPaths: staged,
        addedPaths: addedPathsFromGit(cwd),
        requiredCriteria: guard.requiredCriteria,
        phaseEvidence: guard.phaseEvidence,
        requireStart: guard.requireStart,
        tddRun: guard.tddRun,
      })
      if (!verdict.ok) {
        const phaseMiss = verdict.deny === "phase-evidence"
        writeStdoutJson({
          permission: "deny",
          user_message: phaseMiss
            ? "Blocked `git commit` — /commit found missing START or Red/Green/Refactor evidence."
            : "Blocked `git commit` — staged paths do not match the active commit exemption.",
          agent_message: phaseMiss
            ? `git-stage guard: "${commitHit.segment}" is missing required phase evidence ` +
              `(${verdict.reason}). START and Red/Green/Refactor per criterion are ` +
              "non-skippable. Re-run /sdd-to-tdd for the missing phase, then /commit."
            : `git-stage guard: "${commitHit.segment}" does not match the active ` +
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

import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, test } from "node:test"
import {
  evaluateGitCommitPermission,
  evaluatePhaseEvidence,
  shouldPostStartComment,
} from "../hooks/lib/tdd-guard-policy.mjs"

test("evaluatePhaseEvidence denies a skipped Red/Green/Refactor or missing START", () => {
  const missingRed = evaluatePhaseEvidence({
    criteria: ["AC-12"],
    evidence: {
      start: true,
      criteria: {
        "AC-12": {
          green: true,
          refactor: true,
          greenAgentId: "task-green",
          refactorAgentId: "task-refactor",
        },
      },
    },
    requireStart: true,
  })
  assert.equal(missingRed.ok, false)
  assert.equal(missingRed.reason, "missing_phase")
  assert.equal(missingRed.phase, "red")

  const missingStart = evaluatePhaseEvidence({
    criteria: ["AC-12"],
    evidence: {
      start: false,
      criteria: {
        "AC-12": {
          red: true,
          green: true,
          refactor: true,
          redAgentId: "task-red",
          greenAgentId: "task-green",
          refactorAgentId: "task-refactor",
        },
      },
    },
    requireStart: true,
  })
  assert.equal(missingStart.ok, false)
  assert.equal(missingStart.reason, "missing_start")
})

test("evaluatePhaseEvidence passes complete START + R/G/R evidence", () => {
  const ok = evaluatePhaseEvidence({
    criteria: ["AC-12", "AC-13"],
    evidence: {
      start: true,
      criteria: {
        "AC-12": {
          red: true,
          green: true,
          refactor: true,
          redAgentId: "task-red-12",
          greenAgentId: "task-green-12",
          refactorAgentId: "task-refactor-12",
        },
        "AC-13": {
          red: true,
          green: true,
          refactor: true,
          redAgentId: "task-red-13",
          greenAgentId: "task-green-13",
          refactorAgentId: "task-refactor-13",
        },
      },
    },
    requireStart: true,
  })
  assert.deepEqual(ok, { ok: true })
})

test("evaluatePhaseEvidence denies a phase row without a Task agentId", () => {
  const missingAgent = evaluatePhaseEvidence({
    criteria: ["AC-12"],
    evidence: {
      start: true,
      criteria: { "AC-12": { red: true, green: true, refactor: true } },
    },
    requireStart: true,
  })
  assert.equal(missingAgent.ok, false)
  assert.equal(missingAgent.reason, "missing_agent_id")
  assert.equal(missingAgent.phase, "red")
})

test("Do not change status still requires START through the tracker agent", () => {
  assert.equal(
    shouldPostStartComment({
      hasTrackedIssue: true,
      prompt: "Do not change status. Leave the issue in Todo.",
    }),
    true,
  )
  assert.equal(
    shouldPostStartComment({
      hasTrackedIssue: false,
      prompt: "Do not change status.",
    }),
    false,
  )
  const resolver = readFileSync(
    join(process.cwd(), ".cursor", "agents", "linear-resolver.md"),
    "utf8",
  )
  assert.match(resolver, /Do not\s+change status/)
  assert.match(resolver, /still posts the `Work started:` comment/)
})

test("post-TDD git commit refuses missing phase evidence and allows a complete set", () => {
  const denied = evaluateGitCommitPermission({
    loopRan: false,
    exemption: null,
    stagedPaths: ["lib/foo.ts"],
    requiredCriteria: ["AC-14"],
    phaseEvidence: {
      start: true,
      criteria: {
        "AC-14": {
          red: true,
          green: true,
          redAgentId: "task-red",
          greenAgentId: "task-green",
        },
      },
    },
    requireStart: true,
  })
  assert.equal(denied.ok, false)
  assert.equal(denied.deny, "phase-evidence")
  assert.equal(denied.reason, "missing_phase")

  const allowed = evaluateGitCommitPermission({
    loopRan: false,
    exemption: null,
    stagedPaths: ["lib/foo.ts"],
    requiredCriteria: ["AC-14"],
    phaseEvidence: {
      start: true,
      criteria: {
        "AC-14": {
          red: true,
          green: true,
          refactor: true,
          redAgentId: "task-red",
          greenAgentId: "task-green",
          refactorAgentId: "task-refactor",
        },
      },
    },
    requireStart: true,
  })
  assert.equal(allowed.ok, true)
})

test("evaluatePhaseEvidence denies an empty requiredCriteria list", () => {
  const empty = evaluatePhaseEvidence({
    criteria: [],
    evidence: { start: true, criteria: {} },
    requireStart: true,
  })
  assert.equal(empty.ok, false)
  assert.equal(empty.reason, "missing_required_criteria")
})

test("evaluateGitCommitPermission denies empty requiredCriteria on a TDD run", () => {
  const denied = evaluateGitCommitPermission({
    loopRan: false,
    exemption: null,
    stagedPaths: ["lib/foo.ts"],
    requiredCriteria: [],
    tddRun: true,
    phaseEvidence: { start: false, criteria: {} },
  })
  assert.equal(denied.ok, false)
  assert.equal(denied.reason, "missing_required_criteria")
  assert.equal(denied.deny, "phase-evidence")

  const recorded = evaluateGitCommitPermission({
    loopRan: false,
    exemption: null,
    stagedPaths: ["lib/foo.ts"],
    requiredCriteria: [],
    tddRun: false,
    phaseEvidence: { start: true, criteria: {} },
  })
  assert.equal(recorded.ok, false)
  assert.equal(recorded.reason, "missing_required_criteria")
  assert.equal(recorded.deny, "phase-evidence")

  const ordinary = evaluateGitCommitPermission({
    loopRan: false,
    exemption: null,
    stagedPaths: ["lib/foo.ts"],
    requiredCriteria: [],
    tddRun: false,
  })
  assert.equal(ordinary.ok, true)
})

test("docs-artifact commits skip phase evidence", () => {
  const allowed = evaluateGitCommitPermission({
    loopRan: false,
    exemption: "docs-artifact",
    stagedPaths: ["docs/findings/tech-debt.md"],
    requiredCriteria: ["AC-14"],
    phaseEvidence: { start: false, criteria: {} },
    requireStart: true,
  })
  assert.equal(allowed.ok, true)
})

function runCli(args, statePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), ".cursor", "hooks", "tdd-guard.mjs"), ...args],
      { env: { ...process.env, TDD_GUARD_STATE: statePath } },
    )
    let out = ""
    let err = ""
    child.stdout.on("data", (d) => {
      out += d
    })
    child.stderr.on("data", (d) => {
      err += d
    })
    child.on("close", (code) => resolve({ code, out, err }))
    child.on("error", reject)
    child.stdin.end("")
  })
}

describe("phase-evidence isolated CLI", { concurrency: 1 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "phase-ev-"))
  const statePath = join(dir, "tdd-guard.json")
  after(() => rmSync(dir, { recursive: true, force: true }))

  test("evidence check denies a skipped phase and passes the complete path", async () => {
    assert.equal((await runCli(["on"], statePath)).code, 0)
    assert.equal(
      (await runCli(["evidence", "require", "AC-12", "--start"], statePath))
        .code,
      0,
    )
    assert.equal((await runCli(["evidence", "start"], statePath)).code, 0)
    assert.equal(
      (await runCli(["evidence", "AC-12", "red", "--agent-id", "task-red"], statePath))
        .code,
      0,
    )
    assert.equal(
      (
        await runCli(
          ["evidence", "AC-12", "green", "--agent-id", "task-green"],
          statePath,
        )
      ).code,
      0,
    )
    const skipped = await runCli(
      ["evidence", "check", "--criteria", "AC-12", "--require-start"],
      statePath,
    )
    assert.equal(skipped.code, 1)
    assert.match(skipped.err, /skipped phase evidence/)
    assert.equal(
      (
        await runCli(
          ["evidence", "AC-12", "red"],
          statePath,
        )
      ).code,
      1,
    )
    assert.equal(
      (
        await runCli(
          ["evidence", "AC-12", "refactor", "--agent-id", "task-refactor"],
          statePath,
        )
      ).code,
      0,
    )
    const complete = await runCli(
      ["evidence", "check", "--criteria", "AC-12", "--require-start"],
      statePath,
    )
    assert.equal(complete.code, 0)
    assert.match(complete.out, /phase evidence complete/)
  })
})

import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, test } from "node:test"

const ISOLATED_STATE = join(
  mkdtempSync(join(tmpdir(), "phase-ev-state-")),
  "tdd-guard.json",
)
process.env.TDD_GUARD_STATE = ISOLATED_STATE
import {
  arm,
  disarm,
  evaluatePhaseEvidence,
  evaluateGitCommitPermission,
  recordPhaseEvidence,
  recordStartEvidence,
  setRequiredCriteria,
  shouldPostStartComment,
} from "../hooks/lib/tdd-guard-policy.mjs"

const TDD_STATE = join(
  process.cwd(),
  ".cursor",
  "hooks",
  "state",
  "tdd-guard.json",
)
let backup = null
try {
  backup = readFileSync(TDD_STATE, "utf8")
} catch {
  backup = null
}

after(() => {
  if (backup != null) writeFileSync(TDD_STATE, backup)
  else disarm()
})

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), ".cursor", "hooks", "tdd-guard.mjs"), ...args],
      { env: { ...process.env, TDD_GUARD_STATE: ISOLATED_STATE } },
    )
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d) => {
      stdout += d
    })
    child.stderr.on("data", (d) => {
      stderr += d
    })
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout, stderr }))
    child.stdin.end()
  })
}

describe("phase-evidence-policy", () => {
  test("missing START fails the evidence gate", () => {
    const verdict = evaluatePhaseEvidence({
      requireStart: true,
      startRecorded: false,
      requiredCriteria: ["C1"],
      phaseEvidence: {
        C1: {
          red: { agentId: "a" },
          green: { agentId: "b" },
          refactor: { agentId: "c" },
        },
      },
      tddRun: true,
    })
    assert.equal(verdict.ok, false)
    assert.equal(verdict.reason, "missing_start")
  })

  test("denies a phase row without a Task agentId", () => {
    assert.equal(
      recordPhaseEvidence("C1", "red", "").reason,
      "missing_agent_id",
    )
    const verdict = evaluatePhaseEvidence({
      requireStart: true,
      startRecorded: true,
      requiredCriteria: ["C1"],
      phaseEvidence: {
        C1: {
          red: { agentId: "" },
          green: { agentId: "b" },
          refactor: { agentId: "c" },
        },
      },
      tddRun: true,
    })
    assert.equal(verdict.ok, false)
    assert.equal(verdict.reason, "missing_agent_id")
  })

  test("empty requiredCriteria fails the gate on a TDD run", () => {
    const verdict = evaluateGitCommitPermission({
      loopRan: false,
      tddRun: true,
      requireStart: true,
      startRecorded: true,
      requiredCriteria: [],
      phaseEvidence: {},
    })
    assert.equal(verdict.ok, false)
    assert.equal(verdict.reason, "empty_required_criteria")
  })

  test("tddRun survives into evaluateGitCommitPermission", () => {
    const verdict = evaluateGitCommitPermission({
      loopRan: false,
      tddRun: true,
      requireStart: true,
      startRecorded: false,
      requiredCriteria: ["C1"],
      phaseEvidence: {},
    })
    assert.equal(verdict.ok, false)
    assert.equal(verdict.reason, "missing_start")
  })

  test("evidence check --require-start exits 1 when START is missing", async () => {
    arm()
    setRequiredCriteria(["C1"])
    const result = await runCli(["evidence", "check", "--require-start"])
    assert.equal(result.code, 1)
    assert.match(result.stderr, /missing_start/)
    disarm()
  })

  test("complete evidence plus START passes the CLI", async () => {
    arm()
    recordStartEvidence()
    setRequiredCriteria(["C1"])
    assert.equal(recordPhaseEvidence("C1", "red", "agent-red").ok, true)
    assert.equal(recordPhaseEvidence("C1", "green", "agent-green").ok, true)
    assert.equal(
      recordPhaseEvidence("C1", "refactor", "agent-refactor").ok,
      true,
    )
    const result = await runCli(["evidence", "check", "--require-start"])
    assert.equal(result.code, 0)
    disarm()
  })

  test("Do not change status still posts START via the tracker agent", () => {
    assert.equal(
      shouldPostStartComment({
        hasTrackedIssue: true,
        prompt: "Do not change status. Follow the harness flow.",
      }),
      true,
    )
    assert.equal(
      shouldPostStartComment({ hasTrackedIssue: false, prompt: "" }),
      false,
    )
    const resolver = readFileSync(
      join(process.cwd(), ".cursor", "agents", "linear-resolver.md"),
      "utf8",
    )
    assert.match(resolver, /Do not change status/)
    assert.match(resolver, /still posts this START/)
    assert.match(resolver, /Never call `save_issue`/)
  })
})

import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, test } from "node:test"

const ISOLATED_STATE = join(
  mkdtempSync(join(tmpdir(), "conduct-state-")),
  "tdd-guard.json",
)
process.env.TDD_GUARD_STATE = ISOLATED_STATE
import { evaluateConductorTranscript } from "../hooks/lib/conduct-transcript-policy.mjs"
import {
  arm,
  checkTddWrite,
  checkTaskUnavailableWrite,
  disarm,
} from "../hooks/lib/tdd-guard-policy.mjs"

const FIXTURE = join(
  process.cwd(),
  ".cursor",
  "checks",
  "fixtures",
  "conduct",
  "conductor-next-delegated.jsonl",
)

function runGuard(scriptName, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), ".cursor", "hooks", scriptName)],
      { env: { ...process.env, TDD_GUARD_STATE: ISOLATED_STATE } },
    )
    let stdout = ""
    child.stdout.on("data", (d) => {
      stdout += d
    })
    child.on("error", reject)
    child.on("close", (code) => resolve({ code, stdout }))
    child.stdin.end(payload)
  })
}

describe("conduct-delegation", () => {
  test("conduct.md next delegates via /sdd-to-tdd and never writes the tracker inline", () => {
    const text = readFileSync(
      join(process.cwd(), ".cursor", "commands", "conduct.md"),
      "utf8",
    )
    assert.match(text, /\/sdd-to-tdd/)
    assert.match(text, /never edits code or tests/i)
    assert.match(text, /linear-resolver/)
    assert.match(text, /BLOCKED \(infra\)/)
  })

  test("synthetic conductor fixture: every required criterion has tdd-red/green/refactor and tracker writes come from linear-resolver", () => {
    const policy = readFileSync(
      join(
        process.cwd(),
        ".cursor",
        "hooks",
        "lib",
        "conduct-transcript-policy.mjs",
      ),
      "utf8",
    )
    assert.doesNotMatch(policy, /REAZED/)
    const raw = readFileSync(FIXTURE, "utf8")
    assert.match(raw, /Synthetic fixture\. Hand-written/)
    const events = raw
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line))
    const verdict = evaluateConductorTranscript(events, {
      requiredCriteria: ["ISSUE-1"],
    })
    assert.equal(verdict.ok, true)
    assert.deepEqual(verdict.missing, [])
    assert.ok(verdict.linearResolverTasks >= 1)
    assert.equal(verdict.parentTrackerWrites, 0)
  })

  test("unlabelled Task credits no criteria", () => {
    const verdict = evaluateConductorTranscript(
      [{ type: "task", subagent: "tdd-red", text: "do the work" }],
      { requiredCriteria: ["ISSUE-1"] },
    )
    assert.equal(verdict.ok, false)
    assert.deepEqual(verdict.missing, [
      "ISSUE-1:red",
      "ISSUE-1:green",
      "ISSUE-1:refactor",
    ])
  })

  test("armed conductor Write to lib/ is denied before Task", async () => {
    arm()
    const hit = checkTaskUnavailableWrite("lib/example.ts", {
      armed: true,
      taskAvailable: false,
    })
    assert.equal(hit?.kind, "task-unavailable")
    const delegated = checkTddWrite("lib/example.ts", { depth: 0, phase: null })
    assert.equal(delegated?.kind, "delegation")
    const payload = JSON.stringify({
      tool_name: "Write",
      tool_input: { path: "lib/example.ts" },
    })
    const avail = await runGuard("task-availability-guard.mjs", payload)
    assert.match(avail.stdout, /"permission":"deny"/)
    const tdd = await runGuard("tdd-delegation-guard.mjs", payload)
    assert.match(tdd.stdout, /"permission":"deny"/)
    disarm()
  })
})

import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, test } from "node:test"
import { checkTddWrite } from "../hooks/lib/tdd-guard-policy.mjs"
import {
  evaluateConductorTranscript,
  extractCriterionIds,
} from "../hooks/lib/conduct-transcript-policy.mjs"

const ROOT = process.cwd()
const TRANSCRIPT_FIX = join(
  ROOT,
  ".cursor",
  "checks",
  "fixtures",
  "conduct",
)
const REQUIRED_CRITERIA = [
  "ISSUE-350",
  "ISSUE-351",
  "ISSUE-352",
  "ISSUE-353",
]

const conduct = readFileSync(join(ROOT, ".cursor", "commands", "conduct.md"), "utf8")
const sdd = readFileSync(join(ROOT, ".cursor", "commands", "sdd-to-tdd.md"), "utf8")

test("conduct next delegates implementation and tracker writes through /sdd-to-tdd", () => {
  assert.match(conduct, /## next/)
  assert.match(conduct, /\/sdd-to-tdd/)
  assert.match(
    conduct,
    /orchestrator never does phase\s+work or tracker writes inline/i,
  )
  assert.doesNotMatch(
    conduct,
    /The lane's only Linear writes are START/,
  )
  assert.match(conduct, /owns START, CLARIFY, and CLOSE-OUT/)
  assert.doesNotMatch(
    conduct,
    /CallDynamicTool[\s\S]{0,80}(?:save_comment|save_issue|delete_comment)/,
  )
})

test("sdd-to-tdd treats START and Red/Green/Refactor as non-skippable", () => {
  assert.match(sdd, /non-skippable/)
  assert.match(sdd, /tdd-guard\.mjs evidence/)
  assert.match(sdd, /--agent-id/)
  assert.match(sdd, /BLOCKED \(infra\)/)
  assert.match(sdd, /Do not change status/)
  assert.match(sdd, /fingerprint --plan/)
})

test("synthetic conductor fixture: every criterion phase is a Task and tracker writes are delegated", () => {
  const good = evaluateConductorTranscript(
    readFileSync(join(TRANSCRIPT_FIX, "conductor-next-delegated.jsonl"), "utf8"),
    { requiredCriteria: REQUIRED_CRITERIA },
  )
  assert.equal(good.ok, true)
  assert.equal(good.everyPhaseIsTask, true)
  assert.equal(good.trackerWritesDelegated, true)
  assert.equal(good.inlineProtectedWrites.length, 0)
  assert.deepEqual(good.missingPhases, [])

  const bad = evaluateConductorTranscript(
    readFileSync(
      join(TRANSCRIPT_FIX, "conductor-next-inline-violation.jsonl"),
      "utf8",
    ),
    { requiredCriteria: REQUIRED_CRITERIA },
  )
  assert.equal(bad.ok, false)
  assert.equal(bad.everyPhaseIsTask, false)
  assert.equal(bad.trackerWritesDelegated, false)
  assert.ok(bad.inlineProtectedWrites.length > 0)
  assert.ok(bad.missingPhases.length > 0)

  const policy = readFileSync(
    join(ROOT, ".cursor", "hooks", "lib", "conduct-transcript-policy.mjs"),
    "utf8",
  )
  assert.doesNotMatch(policy, /REAZED/)
  assert.deepEqual(
    extractCriterionIds(
      "Red ISSUE-350 / AC-12 and SHA-256 checksum",
      REQUIRED_CRITERIA,
    ),
    ["AC-12", "ISSUE-350"],
  )
  assert.deepEqual(extractCriterionIds("SHA-256 and UTF-8"), [])
})

test("unlabelled Task phase does not credit required criteria", () => {
  const jsonl = `${JSON.stringify({
    role: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          name: "Task",
          input: {
            description: "Red without a criterion id",
            subagent_type: "tdd-red",
            prompt: "Write a failing test. Do not name a criterion.",
          },
        },
      ],
    },
  })}\n`
  const result = evaluateConductorTranscript(jsonl, {
    requiredCriteria: REQUIRED_CRITERIA,
  })
  assert.equal(result.criteria["ISSUE-350"].red, false)
  assert.equal(result.everyPhaseIsTask, false)
  assert.ok(
    result.missingPhases.some(
      (row) => row.criterion === "ISSUE-350" && row.phase === "red",
    ),
  )
})

test("simulated conductor inline phase edit is denied by the delegation policy", () => {
  assert.equal(
    checkTddWrite("lib/foo.ts", { depth: 0, phase: null })?.kind,
    "delegation",
  )
})

describe("conductor inline edit spawn", { concurrency: 1 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "conduct-inline-"))
  const statePath = join(dir, "tdd-guard.json")
  after(() => rmSync(dir, { recursive: true, force: true }))

  function run(script, payload, extraArgs = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [join(process.cwd(), ".cursor", "hooks", script), ...extraArgs],
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
      child.stdin.end(payload)
    })
  }

  test("armed conductor Write to lib/ is denied before Task", async () => {
    assert.equal((await run("tdd-guard.mjs", "", ["on"])).code, 0)
    const payload =
      "\uFEFF" +
      JSON.stringify({
        tool_name: "Write",
        tool_input: { path: "lib/foo.ts" },
        hook_event_name: "preToolUse",
        conversation_id: "conductor-next",
      })
    const availability = await run("task-availability-guard.mjs", payload)
    assert.equal(availability.code, 0)
    assert.equal(JSON.parse(availability.out).permission, "deny")
    const delegation = await run("tdd-delegation-guard.mjs", payload)
    assert.equal(delegation.code, 0)
    assert.equal(JSON.parse(delegation.out).permission, "deny")
  })
})

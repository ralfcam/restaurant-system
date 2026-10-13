import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, test } from "node:test"

const ISOLATED_STATE = join(
  mkdtempSync(join(tmpdir(), "task-avail-state-")),
  "tdd-guard.json",
)
process.env.TDD_GUARD_STATE = ISOLATED_STATE
import {
  arm,
  disarm,
  markTaskSucceeded,
  markTaskUnavailable,
  isTaskAvailable,
  isArmedStateFile,
  isLinearWriterStateFile,
  checkTaskUnavailableWrite,
  checkLinearWriterParentShell,
  appendRunFileFingerprint,
  hashToolSurface,
} from "../hooks/lib/tdd-guard-policy.mjs"

const TDD_STATE = join(
  process.cwd(),
  ".cursor",
  "hooks",
  "state",
  "tdd-guard.json",
)
const LINEAR_STATE = join(
  process.cwd(),
  ".cursor",
  "hooks",
  "state",
  "linear-writer.json",
)

let tddBackup = null
let linearBackup = null
if (readFileSync) {
  try {
    tddBackup = readFileSync(TDD_STATE, "utf8")
  } catch {
    tddBackup = null
  }
  try {
    linearBackup = readFileSync(LINEAR_STATE, "utf8")
  } catch {
    linearBackup = null
  }
}

after(() => {
  if (tddBackup != null) writeFileSync(TDD_STATE, tddBackup)
  else disarm()
  if (linearBackup != null) writeFileSync(LINEAR_STATE, linearBackup)
})

function runGuard(scriptName, payload, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), ".cursor", "hooks", scriptName), ...extraArgs],
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
    child.stdin.end(payload)
  })
}

const SYNTHETIC_WRITE_LIB =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    tool_input: { path: "lib/billing/foo.ts" },
  })

const CLOUD_WRITE_LIB =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    hook_event_name: "preToolUse",
    session_id: "cloud-modelled",
    tool_input: { path: "src/app.ts" },
  })

const WRITE_LINEAR_WRITER = JSON.stringify({
  tool_name: "Write",
  tool_input: { path: ".cursor/hooks/state/linear-writer.json" },
})

const SAVE_COMMENT = JSON.stringify({
  tool_name: "CallDynamicTool",
  hook_event_name: "preToolUse",
  tool_input: { namespace: "Linear", toolName: "save_comment" },
})

describe("task-availability-policy", () => {
  test("isArmedStateFile matches only the armed-state file", () => {
    assert.equal(isArmedStateFile(".cursor/hooks/state/tdd-guard.json"), true)
    assert.equal(isArmedStateFile("lib/tdd-guard.json"), false)
    assert.equal(
      isArmedStateFile("lib/.cursor/hooks/state/tdd-guard.json"),
      false,
    )
    assert.equal(isArmedStateFile("linear-writer.json"), false)
  })

  test("Task success stays latched after markTaskUnavailable", () => {
    arm()
    markTaskSucceeded()
    markTaskUnavailable()
    assert.equal(isTaskAvailable(), true)
    disarm()
  })

  test("armed Write to lib/ is denied before Task", () => {
    arm()
    const hit = checkTaskUnavailableWrite("lib/billing/foo.ts", {
      armed: true,
      taskAvailable: false,
    })
    assert.equal(hit?.kind, "task-unavailable")
    disarm()
  })

  test("parent Write to linear-writer.json is denied at all times", () => {
    disarm()
    assert.equal(
      checkTaskUnavailableWrite(".cursor/hooks/state/linear-writer.json", {
        armed: false,
        taskAvailable: false,
      })?.kind,
      "linear-writer-parent",
    )
    arm()
    markTaskSucceeded()
    assert.equal(
      checkTaskUnavailableWrite(".cursor/hooks/state/linear-writer.json", {
        armed: true,
        taskAvailable: true,
      })?.kind,
      "linear-writer-parent",
    )
    assert.equal(
      isLinearWriterStateFile(".cursor/hooks/state/linear-writer.json"),
      true,
    )
    disarm()
  })

  test("checkLinearWriterParentShell denies redirects and tee", () => {
    assert.ok(
      checkLinearWriterParentShell(
        "echo x>.cursor/hooks/state/linear-writer.json",
      ),
    )
    assert.ok(
      checkLinearWriterParentShell(
        "echo x | tee .cursor/hooks/state/linear-writer.json",
      ),
    )
  })

  test("missing-Task run records a tool-surface fingerprint and zero tracker writes", async () => {
    arm()
    const runDir = mkdtempSync(join(tmpdir(), "task-avail-"))
    const runFile = join(runDir, "run.md")
    mkdirSync(runDir, { recursive: true })
    writeFileSync(runFile, "# run\n", "utf8")
    const fingerprint = appendRunFileFingerprint(runFile, ["Read", "Write"])
    assert.equal(fingerprint, hashToolSurface(["Read", "Write"]))
    assert.match(readFileSync(runFile, "utf8"), /tool-surface fingerprint/)

    const write = await runGuard(
      "task-availability-guard.mjs",
      SYNTHETIC_WRITE_LIB,
    )
    assert.match(write.stdout, /"permission":"deny"/)
    assert.match(write.stdout, /BLOCKED \(infra\)/)

    const cloud = await runGuard("task-availability-guard.mjs", CLOUD_WRITE_LIB)
    assert.match(cloud.stdout, /"permission":"deny"/)

    const writer = await runGuard(
      "task-availability-guard.mjs",
      WRITE_LINEAR_WRITER,
    )
    assert.match(writer.stdout, /"permission":"deny"/)

    const tracker = await runGuard("linear-write-guard.mjs", SAVE_COMMENT)
    assert.match(tracker.stdout, /"permission":"deny"/)
    disarm()
  })

  test("fingerprint CLI appends a run-file line", async () => {
    const runDir = mkdtempSync(join(tmpdir(), "fp-"))
    const runFile = join(runDir, "run.md")
    writeFileSync(runFile, "", "utf8")
    const result = await runGuard("tdd-guard.mjs", "", [
      "fingerprint",
      "--run-file",
      runFile,
      "--tools",
      "Read",
      "Grep",
    ])
    assert.equal(result.code, 0)
    assert.match(readFileSync(runFile, "utf8"), /tool-surface fingerprint/)
  })

  test("hooks.json fail-closes the Write availability guard", () => {
    const hooks = JSON.parse(
      readFileSync(join(process.cwd(), ".cursor", "hooks.json"), "utf8"),
    )
    const hit = hooks.hooks.preToolUse.find((h) =>
      h.command.includes("task-availability-guard.mjs"),
    )
    assert.equal(hit.failClosed, true)
    assert.equal(hit.matcher, "Write")
  })
})

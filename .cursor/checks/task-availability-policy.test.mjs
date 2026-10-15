import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, test } from "node:test"
import {
  checkLinearWriterParentShell,
  checkLinearWriterParentWrite,
  checkProtectedShellWrite,
  checkTaskAvailabilityWrite,
  defaultFingerprintTools,
  extractShellWriteTargets,
  recordDisarm,
  runFileFingerprintLine,
  toolSurfaceFingerprint,
} from "../hooks/lib/tdd-guard-policy.mjs"
import { checkLinearWrite } from "../hooks/lib/linear-write-policy.mjs"
import { extractMcpCall } from "../hooks/lib/mcp-payload.mjs"

const hooks = JSON.parse(
  readFileSync(join(process.cwd(), ".cursor", "hooks.json"), "utf8"),
)

test("linear-writer-write-guard is a fail-closed Write preToolUse hook", () => {
  const entry = hooks.hooks.preToolUse.find((h) =>
    h.command.includes("linear-writer-write-guard.mjs"),
  )
  assert.ok(entry, "linear-writer-write-guard is registered on preToolUse")
  assert.equal(entry.matcher, "Write")
  assert.equal(entry.failClosed, true)
})

test("task-availability-guard is not registered on any hook event", () => {
  for (const [event, entries] of Object.entries(hooks.hooks)) {
    for (const entry of entries) {
      assert.doesNotMatch(
        entry.command,
        /task-availability-guard/,
        `${event} must not register task-availability-guard (inert on Cloud CallDynamicTool Task)`,
      )
    }
  }
})

test("checkTaskAvailabilityWrite denies armed edits until Task succeeds", () => {
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: true,
      taskAvailable: true,
    }),
    null,
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: false,
      taskAvailable: false,
    }),
    null,
  )
  assert.equal(
    checkTaskAvailabilityWrite(".cursor/hooks/state/tdd-guard.json", {
      armed: true,
      taskAvailable: false,
    }),
    null,
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/tdd-guard.json", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/.cursor/hooks/state/tdd-guard.json", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
  assert.equal(
    checkTaskAvailabilityWrite(".cursor/hooks/state/linear-writer.json", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
  assert.equal(
    checkTaskAvailabilityWrite(".cursor/hooks/state/task-fanout.json", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
})

test("pre-Task depth>0 claim is still denied; subagent write after Task is allowed", () => {
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: true,
      taskAvailable: false,
      depth: 1,
    })?.kind,
    "task-unavailable",
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: true,
      taskAvailable: true,
      depth: 1,
    }),
    null,
  )
})

test("checkProtectedShellWrite denies armed parent Shell writes without taskAvailable", () => {
  const parent = { armed: true, depth: 0, phase: null }
  for (const command of [
    "echo ok > lib/foo.ts",
    "echo '{\"allowed\":true}' > .cursor/hooks/state/linear-writer.json",
    "tee .cursor/hooks/state/linear-writer.json",
    "sed -i s/a/b/ tests/foo.test.ts",
    "cp lib/a.ts lib/b.ts",
    "mv hooks/old.ts hooks/new.ts",
    "echo x > .cursor/hooks/state/findings-writer.json",
  ]) {
    assert.equal(
      checkProtectedShellWrite(command, parent)?.deny,
      true,
      command,
    )
  }
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", parent)?.kind,
    "delegation",
  )
  assert.equal(
    checkProtectedShellWrite(
      "echo disarmed > .cursor/hooks/state/tdd-guard.json",
      parent,
    ),
    null,
  )
  assert.equal(checkProtectedShellWrite("git status", parent), null)
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", {
      armed: false,
      depth: 0,
      phase: null,
    }),
    null,
  )
})

test("checkProtectedShellWrite follows depth and phase like the Write guard", () => {
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", {
      armed: true,
      depth: 1,
      phase: "green",
    }),
    null,
  )
  assert.equal(
    checkProtectedShellWrite("echo ok > tests/foo.test.ts", {
      armed: true,
      depth: 1,
      phase: "green",
    })?.kind,
    "phase-tests",
  )
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", {
      armed: true,
      depth: 1,
      phase: "red",
    })?.kind,
    "phase-red",
  )
  assert.equal(
    checkProtectedShellWrite("echo x > .cursor/hooks/state/linear-writer.json", {
      armed: true,
      depth: 1,
      phase: "green",
    })?.deny,
    true,
  )
})

test("checkProtectedShellWrite follows the phase at depth 0 and denies protected targets with no phase", () => {
  const at = (command, phase) =>
    checkProtectedShellWrite(command, { armed: true, depth: 0, phase })
  assert.equal(at("echo ok > tests/foo.test.ts", "red"), null)
  assert.equal(at("echo ok > src/foo.ts", "red")?.kind, "phase-red")
  assert.equal(at("echo ok > src/foo.ts", "green"), null)
  assert.equal(at("echo ok > src/foo.ts", "refactor"), null)
  assert.equal(
    at("echo ok > tests/foo.test.ts", "green")?.kind,
    "phase-tests",
  )
  assert.equal(at("echo ok > src/foo.ts", null)?.kind, "delegation")
  assert.equal(at("echo ok > tests/foo.test.ts", null)?.kind, "delegation")
  assert.equal(
    at("echo x > .cursor/hooks/state/linear-writer.json", "green")?.deny,
    true,
  )
})

test("checkProtectedShellWrite denies protected targets at armed depth>0 with phase unset", () => {
  const unset = { armed: true, depth: 1, phase: null }
  for (const command of [
    "echo ok > lib/foo.ts",
    "echo ok > tests/foo.test.ts",
    "cp lib/a.ts lib/b.ts",
    "sed -i s/a/b/ app/page.tsx",
    "echo x > .cursor/hooks/state/linear-writer.json",
  ]) {
    const hit = checkProtectedShellWrite(command, unset)
    assert.equal(hit?.deny, true, command)
  }
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", unset)?.kind,
    "phase-unset",
  )
  for (const command of [
    "echo ok > docs/findings/security.md",
    "echo ok > .cursor/plans/x.plan.md",
    "echo ok > docs/verifier-reports/tdd/x.md",
    "echo disarmed > .cursor/hooks/state/tdd-guard.json",
    "git status",
  ]) {
    assert.equal(checkProtectedShellWrite(command, unset), null, command)
  }
  assert.equal(
    checkProtectedShellWrite("echo ok > lib/foo.ts", {
      armed: false,
      depth: 1,
      phase: null,
    }),
    null,
  )
})

test("parent linear-writer.json writes are denied unarmed and after Task", () => {
  assert.equal(
    checkLinearWriterParentWrite(".cursor/hooks/state/linear-writer.json")
      ?.kind,
    "linear-writer-parent",
  )
  assert.equal(checkLinearWriterParentWrite("lib/foo.ts"), null)
  assert.equal(
    checkLinearWriterParentWrite(".cursor/hooks/state/tdd-guard.json"),
    null,
  )
  assert.equal(
    checkLinearWriterParentShell(
      "echo '{\"allowed\":true}' > .cursor/hooks/state/linear-writer.json",
    )?.kind,
    "linear-writer-parent-shell",
  )
  assert.equal(checkLinearWriterParentShell("echo x > lib/foo.ts"), null)
  assert.equal(
    checkTaskAvailabilityWrite(".cursor/hooks/state/linear-writer.json", {
      armed: false,
      taskAvailable: false,
    }),
    null,
  )
  assert.equal(
    checkTaskAvailabilityWrite(".cursor/hooks/state/linear-writer.json", {
      armed: true,
      taskAvailable: true,
    }),
    null,
  )
})

test("recordDisarm emits stderr and appends the morning log", () => {
  const dir = mkdtempSync(join(tmpdir(), "disarm-log-"))
  const logPath = join(dir, "log.md")
  writeFileSync(
    logPath,
    "# Project Knowledge Update Log\n\n## 2026-10-13\n\n* **prior:** keep\n",
    "utf8",
  )
  const lines = []
  const result = recordDisarm({
    source: "parent Write .cursor/hooks/state/tdd-guard.json",
    at: new Date("2026-10-13T12:00:00Z"),
    logPath,
    stderr: (msg) => lines.push(String(msg)),
  })
  assert.match(result.line, /\[tdd-guard\] DISARM/)
  assert.deepEqual(lines, [result.line])
  const text = readFileSync(logPath, "utf8")
  assert.match(text, /\*\*tdd-guard disarm:\*\*/)
  assert.match(text, /\*\*prior:\*\* keep/)
  const changelogPath = join(process.cwd(), "CHANGELOG.md")
  const specPath = join(
    process.cwd(),
    "docs",
    "specs",
    "generic-harness-upstream.md",
  )
  if (existsSync(changelogPath) && existsSync(specPath)) {
    const changelog = readFileSync(changelogPath, "utf8")
    const spec = readFileSync(specPath, "utf8")
    assert.match(changelog, /Known gap[\s\S]*tdd-guard\.json[\s\S]*docs\/log\.md/)
    assert.match(spec, /Known gap[\s\S]*tdd-guard\.json[\s\S]*docs\/log\.md/)
  }
  rmSync(dir, { recursive: true, force: true })
})

test("extractShellWriteTargets covers redirect, tee, sed -i, cp, mv", () => {
  assert.deepEqual(extractShellWriteTargets("echo x > lib/foo.ts"), [
    "lib/foo.ts",
  ])
  assert.deepEqual(extractShellWriteTargets("echo x >> lib/foo.ts"), [
    "lib/foo.ts",
  ])
  assert.ok(
    extractShellWriteTargets("cat a | tee tests/a.test.ts").includes(
      "tests/a.test.ts",
    ),
  )
})

test("missing-Task run records a tool-surface fingerprint and zero tracker writes", () => {
  const tools = defaultFingerprintTools()
  const line = runFileFingerprintLine({
    planSlug: "blocked-infra",
    tools,
    taskAvailable: false,
  })
  assert.match(line, /tool-surface/)
  assert.match(line, /taskAvailable=false/)
  assert.match(line, new RegExp(`fingerprint ${toolSurfaceFingerprint(tools)}`))
  assert.equal(
    toolSurfaceFingerprint(tools),
    toolSurfaceFingerprint([...tools].reverse()),
  )

  const cloudSaveComment = {
    tool_name: "CallDynamicTool",
    tool_input: {
      namespace: "Linear",
      toolName: "save_comment",
      arguments: { issueId: "ISSUE-1", body: "Work started:" },
      mcpDetails: {
        description: "Post a comment on a Linear issue",
      },
    },
    hook_event_name: "preToolUse",
  }
  const extracted = extractMcpCall(cloudSaveComment)
  assert.equal(extracted.toolName, "save_comment")
  assert.equal(
    checkLinearWrite(extracted.server, extracted.toolName, false)?.deny,
    true,
  )
  assert.equal(
    checkTaskAvailabilityWrite("lib/foo.ts", {
      armed: true,
      taskAvailable: false,
    })?.kind,
    "task-unavailable",
  )
})

function runIsolated(script, payload, extraArgs, statePath, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(process.cwd(), ".cursor", "hooks", script), ...extraArgs],
      { env: { ...process.env, TDD_GUARD_STATE: statePath, ...extraEnv } },
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

const WRITE_LIB =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    tool_input: { path: "lib/billing/foo.ts" },
  })
/** Cloud-modelled preToolUse Write: same tool_name/path fields as hook-authoring.mdc, plus session metadata observed on Cloud. */
const CLOUD_WRITE_LIB =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    tool_input: { path: "lib/billing/foo.ts" },
    hook_event_name: "preToolUse",
    cwd: "/workspace",
    conversation_id: "bc-cloud-example",
  })
/** Synthetic local Write payload (labelled): same shape without Cloud session fields. */
const SYNTHETIC_WRITE_LIB = WRITE_LIB
const WRITE_LINEAR_STATE =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    tool_input: { path: ".cursor/hooks/state/linear-writer.json" },
  })
const WRITE_TDD_GUARD =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Write",
    tool_input: {
      path: ".cursor/hooks/state/tdd-guard.json",
      contents: '{"armed":false}',
    },
  })
const SHELL_LINEAR_STATE =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Shell",
    tool_input: {
      command: "echo '{\"allowed\":true}' > .cursor/hooks/state/linear-writer.json",
    },
  })
const SHELL_TDD_GUARD =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Shell",
    tool_input: {
      command: "echo disarmed > .cursor/hooks/state/tdd-guard.json",
    },
  })
const CLOUD_CALL_DYNAMIC_SAVE_COMMENT =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "CallDynamicTool",
    tool_input: {
      namespace: "Linear",
      toolName: "save_comment",
      arguments: { issueId: "ISSUE-1", body: "Work started:" },
      mcpDetails: {
        description: "Post a comment on a Linear issue",
      },
    },
    hook_event_name: "preToolUse",
  })
const TASK_OK =
  "\uFEFF" +
  JSON.stringify({
    tool_name: "Task",
    tool_input: { subagent_type: "tdd-red", prompt: "red" },
  })

describe("task-availability isolated spawn", { concurrency: 1 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "task-avail-"))
  const statePath = join(dir, "tdd-guard.json")
  after(() => rmSync(dir, { recursive: true, force: true }))

  test("pre-Task Write with depth>0 in state is still denied", async () => {
    writeFileSync(
      statePath,
      JSON.stringify({
        armed: true,
        depth: 1,
        phase: "red",
        taskAvailable: false,
      }),
      "utf8",
    )
    const denied = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LIB,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
    assert.match(JSON.parse(denied.out).user_message, /BLOCKED \(infra\)/)
  })

  test("subagent Write after Task succeeds is allowed", async () => {
    writeFileSync(
      statePath,
      JSON.stringify({
        armed: true,
        depth: 1,
        phase: "green",
        taskAvailable: false,
      }),
      "utf8",
    )
    assert.equal(
      (
        await runIsolated(
          "task-availability-guard.mjs",
          TASK_OK,
          ["--success"],
          statePath,
        )
      ).code,
      0,
    )
    const allowed = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LIB,
      [],
      statePath,
    )
    assert.equal(allowed.code, 0)
    assert.deepEqual(JSON.parse(allowed.out), {})
  })

  test("armed Write without Task is denied; Task success then allows", async () => {
    const armed = await runIsolated("tdd-guard.mjs", "", ["on"], statePath)
    assert.equal(armed.code, 0)
    const denied = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LIB,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    const body = JSON.parse(denied.out)
    assert.equal(body.permission, "deny")
    assert.match(body.user_message, /BLOCKED \(infra\)/)

    const marked = await runIsolated(
      "task-availability-guard.mjs",
      TASK_OK,
      ["--success"],
      statePath,
    )
    assert.equal(marked.code, 0)
    const allowed = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LIB,
      [],
      statePath,
    )
    assert.equal(allowed.code, 0)
    assert.deepEqual(JSON.parse(allowed.out), {})
  })

  test("cloud-modelled Write and synthetic Write are both denied before Task", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    for (const payload of [CLOUD_WRITE_LIB, SYNTHETIC_WRITE_LIB]) {
      const denied = await runIsolated(
        "task-availability-guard.mjs",
        payload,
        [],
        statePath,
      )
      assert.equal(denied.code, 0)
      assert.equal(JSON.parse(denied.out).permission, "deny")
    }
  })

  test("unarmed parent Write to linear-writer.json is denied", async () => {
    const denied = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LINEAR_STATE,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
    assert.match(JSON.parse(denied.out).user_message, /linear-writer\.json/)
  })

  test("unarmed parent Shell to linear-writer.json is denied", async () => {
    const denied = await runIsolated(
      "git-stage-guard.mjs",
      SHELL_LINEAR_STATE,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
    assert.match(JSON.parse(denied.out).user_message, /linear-writer\.json/)
  })

  test("parent Write to linear-writer.json is denied after Task succeeded", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    assert.equal(
      (await runIsolated("task-availability-guard.mjs", TASK_OK, ["--success"], statePath))
        .code,
      0,
    )
    const denied = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LINEAR_STATE,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
    assert.match(JSON.parse(denied.out).user_message, /linear-writer\.json/)
  })

  test("parent Shell to linear-writer.json is denied after Task succeeded", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    assert.equal(
      (await runIsolated("task-availability-guard.mjs", TASK_OK, ["--success"], statePath))
        .code,
      0,
    )
    const denied = await runIsolated(
      "git-stage-guard.mjs",
      SHELL_LINEAR_STATE,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
    assert.match(JSON.parse(denied.out).user_message, /linear-writer\.json/)
  })

  test("unarmed parent Write or Shell of tdd-guard.json does not log a disarm", async () => {
    writeFileSync(
      statePath,
      JSON.stringify({
        armed: false,
        depth: 0,
        phase: null,
        taskAvailable: false,
      }),
      "utf8",
    )
    const writeLog = join(dir, "unarmed-write.md")
    const shellLog = join(dir, "unarmed-shell.md")
    const write = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_TDD_GUARD,
      [],
      statePath,
      { DISARM_LOG_PATH: writeLog },
    )
    assert.equal(write.code, 0)
    assert.doesNotMatch(write.err, /\[tdd-guard\] DISARM/)
    assert.equal(
      existsSync(writeLog) ? readFileSync(writeLog, "utf8") : "",
      "",
    )
    const shell = await runIsolated(
      "git-stage-guard.mjs",
      SHELL_TDD_GUARD,
      [],
      statePath,
      { DISARM_LOG_PATH: shellLog },
    )
    assert.equal(shell.code, 0)
    assert.doesNotMatch(shell.err, /\[tdd-guard\] DISARM/)
    assert.equal(
      existsSync(shellLog) ? readFileSync(shellLog, "utf8") : "",
      "",
    )
  })

  test("parent Write of tdd-guard.json to disarm is logged", async () => {
    const logPath = join(dir, "disarm-write.md")
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const logged = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_TDD_GUARD,
      [],
      statePath,
      { DISARM_LOG_PATH: logPath },
    )
    assert.equal(logged.code, 0)
    assert.deepEqual(JSON.parse(logged.out), {})
    assert.match(logged.err, /\[tdd-guard\] DISARM/)
    assert.match(readFileSync(logPath, "utf8"), /tdd-guard disarm/)
  })

  test("tdd-guard off logs every disarm", async () => {
    const logPath = join(dir, "disarm-off.md")
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const off = await runIsolated("tdd-guard.mjs", "", ["off"], statePath, {
      DISARM_LOG_PATH: logPath,
    })
    assert.equal(off.code, 0)
    assert.match(off.err, /\[tdd-guard\] DISARM/)
    assert.match(readFileSync(logPath, "utf8"), /tdd-guard disarm/)
  })

  test("parent Write to linear-writer.json is denied while Task is unavailable", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const denied = await runIsolated(
      "task-availability-guard.mjs",
      WRITE_LINEAR_STATE,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
  })

  test("missing-Task run denies a Cloud CallDynamicTool tracker write", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const denied = await runIsolated(
      "linear-write-guard.mjs",
      CLOUD_CALL_DYNAMIC_SAVE_COMMENT,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
  })

  test("Shell redirect to lib/ is denied by git-stage-guard while armed at depth 0 without Task", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const payload =
      "\uFEFF" +
      JSON.stringify({
        tool_name: "Shell",
        tool_input: { command: "echo x > lib/foo.ts" },
      })
    const denied = await runIsolated(
      "git-stage-guard.mjs",
      payload,
      [],
      statePath,
    )
    assert.equal(denied.code, 0)
    assert.equal(JSON.parse(denied.out).permission, "deny")
  })

  test("Shell redirect to lib/ is allowed for an armed subagent (depth>0) and denied for tests/ in green", async () => {
    writeFileSync(
      statePath,
      JSON.stringify({ armed: true, depth: 1, phase: "green" }),
      "utf8",
    )
    const shell = (command) =>
      "\uFEFF" + JSON.stringify({ tool_name: "Shell", tool_input: { command } })
    const allowed = await runIsolated(
      "git-stage-guard.mjs",
      shell("echo x > lib/foo.ts"),
      [],
      statePath,
    )
    assert.equal(allowed.code, 0)
    assert.deepEqual(JSON.parse(allowed.out), {})
    const denied = await runIsolated(
      "git-stage-guard.mjs",
      shell("echo x > tests/foo.test.ts"),
      [],
      statePath,
    )
    assert.equal(JSON.parse(denied.out).permission, "deny")
  })

  test("Shell redirect to lib/ or tests/ is denied by git-stage-guard at armed depth>0 with phase unset", async () => {
    writeFileSync(
      statePath,
      JSON.stringify({ armed: true, depth: 1, phase: null }),
      "utf8",
    )
    const shell = (command) =>
      "\uFEFF" + JSON.stringify({ tool_name: "Shell", tool_input: { command } })
    for (const command of [
      "echo x > lib/foo.ts",
      "echo x > tests/foo.test.ts",
    ]) {
      const denied = await runIsolated(
        "git-stage-guard.mjs",
        shell(command),
        [],
        statePath,
      )
      assert.equal(denied.code, 0)
      assert.equal(JSON.parse(denied.out).permission, "deny", command)
    }
    const allowed = await runIsolated(
      "git-stage-guard.mjs",
      shell("echo x > docs/findings/security.md"),
      [],
      statePath,
    )
    assert.deepEqual(JSON.parse(allowed.out), {})
  })

  test("git-stage-guard follows the phase at armed depth 0 and denies protected writes with no phase", async () => {
    const shell = (command) =>
      "\uFEFF" + JSON.stringify({ tool_name: "Shell", tool_input: { command } })
    const run = async (phase, command) => {
      writeFileSync(
        statePath,
        JSON.stringify({ armed: true, depth: 0, phase }),
        "utf8",
      )
      const out = await runIsolated(
        "git-stage-guard.mjs",
        shell(command),
        [],
        statePath,
      )
      assert.equal(out.code, 0)
      return JSON.parse(out.out)
    }
    assert.deepEqual(await run("red", "echo x > tests/foo.test.ts"), {})
    assert.equal(
      (await run("red", "echo x > src/foo.ts")).permission,
      "deny",
    )
    assert.deepEqual(await run("green", "echo x > src/foo.ts"), {})
    assert.equal(
      (await run("green", "echo x > tests/foo.test.ts")).permission,
      "deny",
    )
    assert.equal(
      (await run(null, "echo x > src/foo.ts")).permission,
      "deny",
    )
    assert.equal(
      (await run(null, "echo x > tests/foo.test.ts")).permission,
      "deny",
    )
  })

  test("unarmed Shell redirect to lib/ is not denied by git-stage-guard", async () => {
    writeFileSync(statePath, JSON.stringify({ armed: false }), "utf8")
    const out = await runIsolated(
      "git-stage-guard.mjs",
      "\uFEFF" +
        JSON.stringify({
          tool_name: "Shell",
          tool_input: { command: "echo x > lib/foo.ts" },
        }),
      [],
      statePath,
    )
    assert.deepEqual(JSON.parse(out.out), {})
  })

  test("linear-writer-write-guard denies parent Write unarmed, armed, and after Task", async () => {
    for (const state of [
      { armed: false },
      { armed: true, depth: 0 },
      { armed: true, depth: 1, phase: "green", taskAvailable: true },
    ]) {
      writeFileSync(statePath, JSON.stringify(state), "utf8")
      const out = await runIsolated(
        "linear-writer-write-guard.mjs",
        WRITE_LINEAR_STATE,
        [],
        statePath,
      )
      assert.equal(out.code, 0)
      assert.equal(JSON.parse(out.out).permission, "deny", JSON.stringify(state))
    }
  })

  test("linear-writer-write-guard allows other Write paths and non-Write tools", async () => {
    writeFileSync(statePath, JSON.stringify({ armed: false }), "utf8")
    for (const payload of [
      WRITE_LIB,
      WRITE_TDD_GUARD,
      "\uFEFF" +
        JSON.stringify({
          tool_name: "Shell",
          tool_input: { command: "ls .cursor/hooks/state" },
        }),
    ]) {
      const out = await runIsolated(
        "linear-writer-write-guard.mjs",
        payload,
        [],
        statePath,
      )
      assert.equal(out.code, 0)
      assert.deepEqual(JSON.parse(out.out), {})
    }
  })

  test("fingerprint CLI appends a run-file line", async () => {
    assert.equal((await runIsolated("tdd-guard.mjs", "", ["on"], statePath)).code, 0)
    const cwd = mkdtempSync(join(tmpdir(), "fp-run-"))
    const child = spawn(
      process.execPath,
      [
        join(process.cwd(), ".cursor", "hooks", "tdd-guard.mjs"),
        "fingerprint",
        "--plan",
        "blocked-infra",
        "--tools",
        "Task,Write,Shell,CallDynamicTool",
      ],
      {
        cwd,
        env: { ...process.env, TDD_GUARD_STATE: statePath },
      },
    )
    const result = await new Promise((resolve, reject) => {
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
    })
    assert.equal(result.code, 0)
    assert.match(result.out, /tool-surface/)
    const written = readFileSync(
      join(cwd, "docs", "findings", "runs", "blocked-infra.md"),
      "utf8",
    )
    assert.match(written, /fingerprint /)
    rmSync(cwd, { recursive: true, force: true })
  })
})

import { spawn, spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { TASK_FANOUT_INFLIGHT_CAP } from "../../../.cursor/hooks/lib/task-fanout-policy.mjs"

const repoRoot = process.cwd()
const FANOUT_STATE = path.join(
  repoRoot,
  ".cursor",
  "hooks",
  "state",
  "task-fanout.json",
)
const FANOUT_STATE_PRIOR = existsSync(FANOUT_STATE)
  ? readFileSync(FANOUT_STATE, "utf8")
  : null

function restoreFanoutState() {
  writeFileSync(
    FANOUT_STATE,
    FANOUT_STATE_PRIOR ?? JSON.stringify({ reservations: [] }, null, 2),
    "utf8",
  )
}

function runGuard(payload: string) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", "task-fanout-guard.mjs")],
    { encoding: "utf8", input: payload },
  )
}

function runGuardAsync(payload: string) {
  return new Promise<{ status: number | null; stdout: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [path.join(repoRoot, ".cursor", "hooks", "task-fanout-guard.mjs")],
        { stdio: ["pipe", "pipe", "pipe"] },
      )
      let stdout = ""
      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString("utf8")
      })
      child.on("error", reject)
      child.on("close", (status) => {
        resolve({ status, stdout })
      })
      child.stdin.end(payload)
    },
  )
}

describe("G-FO1 Task fan-out atomic fail-closed", () => {
  afterAll(restoreFanoutState)

  it("nine parallel Task reservations deny exactly one; malformed stdin exits non-zero", async () => {
    const hooks = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: Array<{
          command: string
          matcher?: string
          failClosed?: boolean
        }>
      }
    }
    const pre = hooks.hooks.preToolUse.find((h) =>
      h.command.includes("task-fanout-guard.mjs"),
    )
    expect(pre?.matcher).toBe("Task")
    expect(pre?.failClosed).toBe(true)

    writeFileSync(FANOUT_STATE, JSON.stringify({ reservations: [] }, null, 2))

    const payload =
      "\uFEFF" +
      JSON.stringify({
        tool_name: "Task",
        tool_input: { description: "x", prompt: "y" },
        hook_event_name: "preToolUse",
      })
    const results = await Promise.all(
      Array.from({ length: TASK_FANOUT_INFLIGHT_CAP + 1 }, () =>
        runGuardAsync(payload),
      ),
    )
    const parsed = results.map((r) => {
      const body = r.stdout.trim() ? JSON.parse(r.stdout) : {}
      return {
        status: r.status,
        deny: body.permission === "deny",
      }
    })
    expect(parsed.filter((r) => r.deny)).toHaveLength(1)
    expect(parsed.filter((r) => !r.deny && r.status === 0)).toHaveLength(
      TASK_FANOUT_INFLIGHT_CAP,
    )

    const malformed = runGuard("\uFEFF{not-json")
    expect(malformed.status).not.toBe(0)
  })
})

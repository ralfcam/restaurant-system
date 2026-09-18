import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const TDD_STATE = path.join(
  repoRoot,
  ".cursor",
  "hooks",
  "state",
  "tdd-guard.json",
)
// Captured at import, before any test writes, so restore is independent of
// interleaving. A per-test capture can leak an armed operator window.
const TDD_STATE_PRIOR = existsSync(TDD_STATE)
  ? readFileSync(TDD_STATE, "utf8")
  : null
const TDD_STATE_DISARMED = JSON.stringify(
  { armed: false, depth: 0, phase: null, loopRan: false },
  null,
  2,
)

function restoreTddState() {
  writeFileSync(TDD_STATE, TDD_STATE_PRIOR ?? TDD_STATE_DISARMED, "utf8")
}

function runGuard(scriptName: string, payload: string) {
  return spawnSync(
    process.execPath,
    [path.join(repoRoot, ".cursor", "hooks", scriptName)],
    { encoding: "utf8", input: payload },
  )
}

function parseHookStdout(stdout: string) {
  return JSON.parse(stdout) as { permission?: string }
}

describe("G-TD1 TDD delegation-guard liveness", () => {
  afterAll(restoreTddState)

  it("TDD delegation-guard liveness is spawn-proven", () => {
    const hooks = JSON.parse(
      readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
    ) as {
      hooks: {
        preToolUse: Array<{ command: string; failClosed?: boolean }>
      }
    }
    const tddHook = hooks.hooks.preToolUse.find((h) =>
      h.command.includes("tdd-delegation-guard.mjs"),
    )
    const fanoutHook = hooks.hooks.preToolUse.find((h) =>
      h.command.includes("task-fanout-guard.mjs"),
    )

    writeFileSync(
      TDD_STATE,
      JSON.stringify({ armed: true, depth: 1, phase: "red" }, null, 2),
      "utf8",
    )

    try {
      const protectedWrite = runGuard(
        "tdd-delegation-guard.mjs",
        "\uFEFF" +
          JSON.stringify({
            tool_name: "Write",
            tool_input: { path: "lib/billing/foo.ts" },
          }),
      )
      const disarmEscape = runGuard(
        "tdd-delegation-guard.mjs",
        "\uFEFF" +
          JSON.stringify({
            tool_name: "Write",
            tool_input: { path: ".cursor/hooks/state/tdd-guard.json" },
          }),
      )
      const malformed = "\uFEFF{not-json"
      const tddMalformed = runGuard("tdd-delegation-guard.mjs", malformed)
      const fanoutMalformed = runGuard("task-fanout-guard.mjs", malformed)

      expect({
        protectedWrite: {
          status: protectedWrite.status,
          permission: parseHookStdout(protectedWrite.stdout).permission,
        },
        disarmEscape: {
          status: disarmEscape.status,
          body: parseHookStdout(disarmEscape.stdout),
        },
        tddFailClosed: tddHook?.failClosed,
        fanoutFailClosed: fanoutHook?.failClosed,
        tddMalformed: {
          status: tddMalformed.status,
          body: parseHookStdout(tddMalformed.stdout),
        },
        fanoutMalformed: {
          status: fanoutMalformed.status,
          body: parseHookStdout(fanoutMalformed.stdout),
        },
      }).toEqual({
        protectedWrite: { status: 0, permission: "deny" },
        disarmEscape: { status: 0, body: {} },
        tddFailClosed: false,
        fanoutFailClosed: false,
        tddMalformed: { status: 0, body: {} },
        fanoutMalformed: { status: 0, body: {} },
      })
    } finally {
      restoreTddState()
    }
  })
})

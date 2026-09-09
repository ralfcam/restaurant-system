import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { devNull } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { runPnpm } from "./run-pnpm.mjs"

const ROOT = process.cwd()

test("harness-lint.mjs exists and exits 0 on this tree", () => {
  const script = join(ROOT, ".cursor", "checks", "harness-lint.mjs")
  assert.equal(existsSync(script), true)
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" })
  assert.equal(r.status, 0, r.stderr || r.stdout)
})

test("task-fanout.mdc pins the same cap as the policy constant", () => {
  const rule = readFileSync(
    join(ROOT, ".cursor", "rules", "task-fanout.mdc"),
    "utf8",
  )
  const policy = readFileSync(
    join(ROOT, ".cursor", "hooks", "lib", "task-fanout-policy.mjs"),
    "utf8",
  )
  const ruleN = /TASK_FANOUT_INFLIGHT_CAP\s*=\s*(\d+)/.exec(rule)
  const polN = /export const TASK_FANOUT_INFLIGHT_CAP\s*=\s*(\d+)/.exec(policy)
  assert.ok(ruleN && polN)
  assert.equal(ruleN[1], polN[1])
})

test("unformatted markdown fixture fails prettier --check", () => {
  const fixture = join(ROOT, ".cursor", "checks", "fixtures", "unformatted.md")
  assert.equal(existsSync(fixture), true)
  const r = runPnpm(
    ["exec", "prettier", "--check", "--ignore-path", devNull, fixture],
    { cwd: ROOT },
  )
  assert.notEqual(r.status, 0, r.stderr || r.stdout)
})

test("run-pnpm uses installed prettier CLI, not win32 pnpm.cmd", () => {
  const src = readFileSync(
    join(ROOT, ".cursor", "checks", "run-pnpm.mjs"),
    "utf8",
  )
  assert.ok(src.includes("node_modules"))
  assert.ok(src.includes("prettier.cjs"))
  assert.ok(src.includes("Cloud Agents are Linux"))
  assert.ok(!src.includes('? "pnpm.cmd"'))
})

test("harness-lint source pins findings-format and prettier --check", () => {
  const src = readFileSync(
    join(ROOT, ".cursor", "checks", "harness-lint.mjs"),
    "utf8",
  )
  assert.ok(src.includes("findings-format"))
  assert.ok(src.includes("prettier --check"))
  assert.ok(src.includes("runPnpm"))
  assert.ok(!src.includes('? "pnpm.cmd"'))
})

test("dispatch.md pins includeRelations and verified-negative", () => {
  const dispatch = readFileSync(
    join(ROOT, ".cursor", "commands", "dispatch.md"),
    "utf8",
  )
  assert.ok(dispatch.includes("includeRelations"))
  assert.ok(dispatch.includes("verified negative"))
  assert.ok(dispatch.includes("cannot verify` is for tool/MCP failure"))
})

test("sdd-to-tdd.md pins managed Cloud one-shot contract", () => {
  const cmd = readFileSync(
    join(ROOT, ".cursor", "commands", "sdd-to-tdd.md"),
    "utf8",
  )
  assert.ok(cmd.includes("/v1/meta-data/agent/runtime"))
  assert.ok(cmd.includes("exactly `managed`"))
  assert.ok(cmd.includes(".cursor/plans/<plan-slug>.plan.md"))
  assert.ok(
    cmd.includes(
      "repository work-order, not a silently accepted native Cursor Plan",
    ),
  )
  assert.ok(cmd.includes("Cloud one-shot does not waive"))
  assert.ok(cmd.includes("do not auto-confirm"))
  assert.ok(cmd.includes("Do **not** invoke `CreatePlan`"))
  assert.ok(cmd.includes("unattended Agent-mode launches"))
})

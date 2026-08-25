import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

test("harness-lint.mjs exists and exits 0 on this tree", () => {
  const script = join(process.cwd(), ".cursor", "checks", "harness-lint.mjs")
  assert.equal(existsSync(script), true)
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" })
  assert.equal(r.status, 0, r.stderr || r.stdout)
})

test("task-fanout.mdc pins the same cap as the policy constant", () => {
  const rule = readFileSync(
    join(process.cwd(), ".cursor", "rules", "task-fanout.mdc"),
    "utf8",
  )
  const policy = readFileSync(
    join(process.cwd(), ".cursor", "hooks", "lib", "task-fanout-policy.mjs"),
    "utf8",
  )
  const ruleN = /TASK_FANOUT_INFLIGHT_CAP\s*=\s*(\d+)/.exec(rule)
  const polN = /export const TASK_FANOUT_INFLIGHT_CAP\s*=\s*(\d+)/.exec(policy)
  assert.ok(ruleN && polN)
  assert.equal(ruleN[1], polN[1])
})

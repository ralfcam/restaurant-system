import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  defaultHarnessConfig,
  loadHarnessConfig,
  validateHarnessConfig,
} from "../hooks/lib/harness-config.mjs"

const ROOT = process.cwd()

test("shipped harness.json matches the restaurant consumer identity", () => {
  const config = loadHarnessConfig(ROOT)
  const schema = JSON.parse(
    readFileSync(join(ROOT, ".cursor", "harness.schema.json"), "utf8"),
  )
  assert.equal(schema.$id, "https://realized.dev/schemas/harness.schema.json")
  assert.deepEqual(validateHarnessConfig(config), [])
  assert.equal(config.git.defaultBranch, "main")
  assert.equal(config.git.accumulatorBranch, "staging")
  assert.equal(config.git.prBase, "staging")
  assert.equal(config.git.featurePrefix, "sdd/")
  assert.equal(config.git.cloudHeadPattern, "cursor/<slug>-<4 hex>")
  assert.equal(config.initialized, true)
  assert.equal(config.project.name, "restaurant-system")
  assert.equal(config.linear.teamKey, "RES")
  assert.equal(config.linear.issuePrefix, "RES")
  assert.equal(config.linear.routingMode, "versionKey")
  assert.equal(config.linear.versionKeyPattern, "V-X.X")
  assert.deepEqual(config.linear.namedProjects, [])
  assert.deepEqual(config.supabase.guardedProjectRefs, [])
  assert.equal(config.supabase.migrations, "validate-only")
  assert.equal(config.conductor.file, ".cursor/conductor.json")
  assert.equal(config.conductor.enabled, true)
  assert.equal(config.conductor.morningMode, "activate")
  assert.equal(config.dispatch.minimumActive, 5)
  assert.equal(config.dispatch.maximumActive, 10)
  assert.deepEqual(config.p0Surfaces, [])
  assert.equal(config.coderabbit.missingReview, "ready_no_coderabbit_review")
  assert.equal(config.prAuthoring.mode, "service-account-automation")
  assert.equal(config.prAuthoring.botLogin, "cursor[bot]")
  assert.equal(config.docs.specsRoot, "docs/specs")
  assert.equal(config.docs.findingsRoot, "docs/findings")
})

test("default config is a valid uninitialized placeholder set", () => {
  const config = defaultHarnessConfig()
  assert.deepEqual(validateHarnessConfig(config), [])
  assert.equal(config.initialized, false)
  assert.equal(config.runtime.nodeMinimum, "22.22.0")
})

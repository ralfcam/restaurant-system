import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { test } from "node:test"
import {
  isCompleteBrief,
  missingBriefParts,
  parseReadyBrief,
} from "../hooks/lib/ready-brief-policy.mjs"

const codeBrief = `# Issue

## Ready brief
Route: /sdd-to-tdd
Queue: 2 (dispatch 2026-10-05)
Spec: docs/specs/dev-toolchain.md: G-PUB1
Decisions:
- where: staging (description)
Allowed edits: .cursor/commands/commit.md
Verification: pnpm test:unit tests/unit/dev-toolchain/push-gate-evidence.test.ts
Out of scope: labels
`

test("a code brief with spec criteria and verification is complete", () => {
  assert.equal(isCompleteBrief(codeBrief), true)
  const brief = parseReadyBrief(codeBrief)
  assert.equal(brief.route, "/sdd-to-tdd")
  assert.equal(brief.specPath, "docs/specs/dev-toolchain.md")
  assert.equal(brief.criteria, "G-PUB1")
  assert.equal(brief.decisions.length, 1)
  assert.equal("lane" in brief, false)
})

test("a design brief needs all five answers", () => {
  const partial = `## Ready brief
Route: /design
Verification: pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts
Design answers:
- purpose and users: operators
- MVP: one spec
`
  assert.equal(isCompleteBrief(partial), false)
  assert.ok(
    missingBriefParts(parseReadyBrief(partial)).includes("domain placement"),
  )
})

test("a full design brief is complete", () => {
  const full = `## Ready brief
Route: /design
Verification: pnpm test:unit tests/unit/dev-toolchain/design-cloud-dialogue.test.ts
Design answers:
- purpose and users: operators
- MVP: one spec
- domain placement: docs/specs
- constraints: no live users
- out of scope: billing
`
  assert.equal(isCompleteBrief(full), true)
})

test("an invalid route is incomplete", () => {
  const brief = codeBrief.replace("Route: /sdd-to-tdd", "Route: /audit")
  assert.equal(isCompleteBrief(brief), false)
  assert.ok(missingBriefParts(parseReadyBrief(brief)).includes("route"))
})

test("a spec without criteria is incomplete", () => {
  const brief = codeBrief.replace(
    "Spec: docs/specs/dev-toolchain.md: G-PUB1",
    "Spec: docs/specs/dev-toolchain.md",
  )
  assert.equal(isCompleteBrief(brief), false)
  assert.ok(missingBriefParts(parseReadyBrief(brief)).includes("spec"))
})

test("missing verification is incomplete", () => {
  const brief = codeBrief.replace(/^Verification:.*$/m, "Verification:")
  const parsed = parseReadyBrief(brief)
  assert.equal(parsed.verification, "")
  assert.equal(isCompleteBrief(brief), false)
  assert.ok(missingBriefParts(parsed).includes("verification"))
})

test("CRLF line endings still parse", () => {
  assert.equal(isCompleteBrief(codeBrief.replaceAll("\n", "\r\n")), true)
})

test("star bullets and multi-word decision keys parse", () => {
  const brief = `## Ready brief
Route: /sdd-to-tdd
Spec: docs/specs/dev-toolchain.md: G-CON1
Decisions:
* where to land: staging (description)
Verification: pnpm test:unit
`
  const parsed = parseReadyBrief(brief)
  assert.equal(isCompleteBrief(brief), true)
  assert.equal(parsed.decisions.length, 1)
  assert.match(parsed.decisions[0], /where to land:/)
})

test("stdin CLI reads a complete brief", () => {
  const result = spawnSync(
    process.execPath,
    [".cursor/checks/ready-brief.mjs", "-"],
    { input: codeBrief, encoding: "utf8" },
  )
  assert.equal(result.status, 0)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed.complete, true)
  assert.equal(parsed.route, "/sdd-to-tdd")
})

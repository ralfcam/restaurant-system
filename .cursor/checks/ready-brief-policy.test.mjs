import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
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

test("a prose mention of ## Ready brief is not the section", () => {
  const prose = `Notes
The writeup mentions ## Ready brief before any heading.
Route: /sdd-to-tdd
Spec: docs/specs/dev-toolchain.md: G-PUB1
Verification: pnpm test:unit tests/unit/dev-toolchain/push-gate-evidence.test.ts
`
  const parsed = parseReadyBrief(prose)
  assert.equal(parsed.present, false)
  assert.equal(parsed.route, "")
  assert.equal(isCompleteBrief(prose), false)
})

test("## Ready briefs is not the section", () => {
  const plural = `## Ready briefs
Route: /sdd-to-tdd
Spec: docs/specs/dev-toolchain.md: G-PUB1
Verification: pnpm test:unit tests/unit/dev-toolchain/push-gate-evidence.test.ts
`
  const parsed = parseReadyBrief(plural)
  assert.equal(parsed.present, false)
  assert.equal(parsed.route, "")
  assert.equal(isCompleteBrief(plural), false)
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

test("classifyConductEligibility excludes migration, RLS, and unanswered clarifications", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  assert.equal(
    typeof classifyConductEligibility,
    "function",
    "classifyConductEligibility must be exported from ready-brief-policy.mjs",
  )
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(
    classifyConductEligibility({ ...base, scope: "migration" }),
    { eligible: false, reason: "excluded_migration" },
  )
  assert.deepEqual(classifyConductEligibility({ ...base, scope: "rls" }), {
    eligible: false,
    reason: "excluded_rls",
  })
  assert.deepEqual(
    classifyConductEligibility({ ...base, unansweredClarification: true }),
    { eligible: false, reason: "excluded_clarification" },
  )
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  assert.match(
    conduct,
    /still excluded[\s\S]{0,160}database migrations|database migrations[\s\S]{0,160}still excluded/i,
  )
  assert.match(
    conduct,
    /still excluded[\s\S]{0,160}RLS policy changes|RLS policy changes[\s\S]{0,160}still excluded/,
  )
  assert.match(
    conduct,
    /still excluded[\s\S]{0,160}unanswered clarification|unanswered clarification[\s\S]{0,160}still excluded/i,
  )
})

test("security payment and auth tickets are sensitive-eligible", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      scope: "migration",
      class: "security",
    }),
    { eligible: false, reason: "excluded_migration" },
  )
  for (const ticketClass of ["security", "payment", "auth"]) {
    const result = classifyConductEligibility({ ...base, class: ticketClass })
    assert.equal(result?.eligible, true, ticketClass)
    assert.equal(result?.sensitive, true, ticketClass)
  }
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  assert.match(
    conduct,
    /security,\s+payment,\s+and\s+auth[\s\S]{0,500}regression test|regression test[\s\S]{0,500}security,\s+payment,\s+and\s+auth/i,
  )
  assert.match(
    conduct,
    /security,\s+payment,\s+and\s+auth[\s\S]{0,500}GitHub `sensitive` label|GitHub `sensitive` label[\s\S]{0,500}security,\s+payment,\s+and\s+auth/,
  )
  assert.match(
    conduct,
    /security,\s+payment,\s+and\s+auth[\s\S]{0,500}body line|body line[\s\S]{0,500}security,\s+payment,\s+and\s+auth/i,
  )
})

test("qaMayReadyPr is false for a sensitive PR", async () => {
  const { qaMayReadyPr } = await import("../hooks/lib/ready-brief-policy.mjs")
  assert.equal(
    typeof qaMayReadyPr,
    "function",
    "qaMayReadyPr must be exported from ready-brief-policy.mjs",
  )
  assert.equal(qaMayReadyPr({ labels: ["sensitive"] }), false)
  assert.equal(qaMayReadyPr({ labels: [] }), true)
  assert.equal(qaMayReadyPr({ labels: ["docs"] }), true)
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  assert.match(conduct, /wait for Jose/)
  assert.match(
    conduct,
    /(?:\bQA\b|ralfcam|sensitive)[\s\S]{0,800}\bdigest\b|\bdigest\b[\s\S]{0,800}(?:\bQA\b|ralfcam|sensitive)/,
  )
})

test("missing brief with priority auto-briefs via dispatch", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
    briefComplete: false,
  }
  const result = classifyConductEligibility(base)
  assert.equal(result?.reason, "auto_brief")
  assert.equal(result?.eligible, true)

  const sensitive = classifyConductEligibility({ ...base, class: "security" })
  assert.equal(sensitive?.reason, "auto_brief")
  assert.equal(sensitive?.eligible, true)
  assert.equal(sensitive?.sensitive, true)

  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  assert.match(
    pick,
    /`?\/conduct next`? runs `?\/dispatch`? to write the brief, then starts/,
  )

  const dispatch = readFileSync(
    join(process.cwd(), ".cursor/commands/dispatch.md"),
    "utf8",
  )
  assert.doesNotMatch(
    dispatch.replace(/\s+/g, " "),
    /There is no priority, estimate, `security`, or P0-surface gate\./,
  )
  assert.match(dispatch, /writes the `## Ready brief`/)
})

test("new-scope and design-labelled tickets are design-first", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(
    classifyConductEligibility({ ...base, scope: "new-scope" }),
    { eligible: true, reason: "design_first" },
  )
  assert.deepEqual(
    classifyConductEligibility({ ...base, labels: ["/design"] }),
    { eligible: true, reason: "design_first" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      scope: "migration",
      labels: ["/design"],
    }),
    { eligible: false, reason: "excluded_migration" },
  )
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  assert.match(conduct, /design-only|spec \+ plan/)
  assert.match(conduct, /no application code/)
})

test("answered clarification amends spec then completes the brief", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      answeredClarification: true,
      briefMissingSpec: true,
    }),
    { eligible: true, reason: "spec_amend" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      answeredClarification: true,
      briefMissingSpec: true,
      unansweredClarification: true,
    }),
    { eligible: false, reason: "excluded_clarification" },
  )
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  assert.match(
    conduct,
    /\/conduct may amend the owning spec with the decided behaviour as the first step[\s\S]{0,240}then write the brief/,
  )
  const sdd = readFileSync(
    join(process.cwd(), ".cursor/commands/sdd-to-tdd.md"),
    "utf8",
  )
  assert.match(
    sdd,
    /\/conduct may apply an answered clarification to the owning spec first \(FIX-mode order\) so the brief `spec` field can be completed/,
  )
})

test("classifyConductEligibility excludes not-Todo and not-current-cycle", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    priority: 2,
    unansweredClarification: false,
    briefComplete: false,
  }
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      status: "Backlog",
      currentCycle: true,
      scope: "new-scope",
    }),
    { eligible: false, reason: "excluded_status" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      status: "Todo",
      currentCycle: false,
      scope: "new-scope",
    }),
    { eligible: false, reason: "excluded_cycle" },
  )
  const kept = classifyConductEligibility({
    ...base,
    status: "Todo",
    currentCycle: true,
  })
  assert.equal(kept.eligible, true)
  assert.equal(typeof kept.reason, "string")
  assert.equal(kept.reason.startsWith("excluded_"), false)
})

test("complete briefs are ready and sensitive rides every eligible reason", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const base = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(
    classifyConductEligibility({ ...base, briefComplete: true }),
    { eligible: true, reason: "ready" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      briefComplete: true,
      class: "security",
    }),
    { eligible: true, reason: "ready", sensitive: true },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      scope: "new-scope",
      class: "security",
    }),
    { eligible: true, reason: "design_first", sensitive: true },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      answeredClarification: true,
      briefMissingSpec: true,
      class: "auth",
    }),
    { eligible: true, reason: "spec_amend", sensitive: true },
  )
})

test("omitted briefComplete with priority auto-briefs", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const record = {
    status: "Todo",
    currentCycle: true,
    priority: 2,
    unansweredClarification: false,
  }
  assert.deepEqual(classifyConductEligibility(record), {
    eligible: true,
    reason: "auto_brief",
  })
  assert.deepEqual(
    classifyConductEligibility({ ...record, class: "payment" }),
    {
      eligible: true,
      reason: "auto_brief",
      sensitive: true,
    },
  )
  assert.deepEqual(
    classifyConductEligibility({ ...record, briefComplete: true }),
    { eligible: true, reason: "ready" },
  )
})

test("step 7 routes design-first to design before the code route", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const step7 =
    conduct.match(/### 7\. Branch and execute[\s\S]*?(?=### 8\.)/)?.[0] ?? ""
  assert.match(
    step7,
    /design_first[\s\S]{0,160}design route[\s\S]{0,40}\/design[\s\S]{0,80}code route[\s\S]{0,40}\/sdd-to-tdd/i,
  )
})

test("step 7 amends the owning spec before dispatch writes the brief", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const step7 =
    conduct.match(/### 7\. Branch and execute[\s\S]*?(?=### 8\.)/)?.[0] ?? ""
  assert.match(
    step7,
    /spec_amend[\s\S]{0,240}amend[\s\S]{0,80}owning spec[\s\S]{0,120}\/dispatch[\s\S]{0,80}writes the brief/,
  )
  const sdd = readFileSync(
    join(process.cwd(), ".cursor/commands/sdd-to-tdd.md"),
    "utf8",
  )
  assert.match(
    sdd,
    /exact spec path[\s\S]{0,40}`## Permissions Requested`[\s\S]{0,80}before the amendment[\s\S]{0,120}STOP[\s\S]{0,40}path is unknown/,
  )
})

test("pick classifies then dispatches before ranking Queue", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  assert.match(pick, /classifyConductEligibility/)
  assert.match(pick, /\/dispatch[\s\S]*Queue:/)
  assert.match(pick, /\/dispatch[\s\S]*re-reads the issue[\s\S]*complete brief/)
})

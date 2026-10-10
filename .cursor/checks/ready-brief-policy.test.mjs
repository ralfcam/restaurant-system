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

test("ready-brief fields keep continuation lines until the next label", () => {
  const brief = `## Ready brief
Route: /sdd-to-tdd
Spec: docs/specs/dev-toolchain.md: G-RDY1
Allowed edits: .cursor/commands/conduct.md
.cursor/hooks/lib/ready-brief-policy.mjs
Verification: pnpm test:unit
Out of scope: labels
`
  const parsed = parseReadyBrief(brief)
  assert.match(parsed.allowedEdits, /\.cursor\/commands\/conduct\.md/)
  assert.match(
    parsed.allowedEdits,
    /\.cursor\/hooks\/lib\/ready-brief-policy\.mjs/,
  )
  assert.equal(parsed.verification, "pnpm test:unit")
  assert.equal(parsed.outOfScope, "labels")
  assert.equal(isCompleteBrief(brief), true)
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
    /`?\/conduct next`? runs `?\/dispatch`? to write the brief/,
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

test("design-first first PR stops after the design route", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const step7 =
    conduct.match(/### 7\. Branch and execute[\s\S]*?(?=### 8\.)/)?.[0] ?? ""
  assert.match(
    step7,
    /design_first[\s\S]{0,300}stops after[\s\S]{0,120}\/design[\s\S]{0,200}does not run[\s\S]{0,80}\/sdd-to-tdd[\s\S]{0,80}first PR|design_first[\s\S]{0,120}first PR[\s\S]{0,80}stops after[\s\S]{0,120}\/design[\s\S]{0,200}does not run[\s\S]{0,80}\/sdd-to-tdd|design_first[\s\S]{0,200}stops after[\s\S]{0,80}\/design[\s\S]{0,80}first PR[\s\S]{0,120}does not run[\s\S]{0,80}\/sdd-to-tdd/i,
  )
})

test("spec-amend runs before the complete-brief re-read", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const ordered =
    /spec_amend[\s\S]{0,160}amend[\s\S]{0,80}owning spec[\s\S]{0,160}complete[- ]brief[\s\S]{0,120}\/dispatch[\s\S]{0,160}re-check/.exec(
      pick,
    )
  const firstDispatch = pick.search(/\/dispatch/)
  const amendAt = ordered?.index ?? -1
  assert.ok(
    ordered && firstDispatch !== -1 && amendAt < firstDispatch,
    "Step 6 must amend on spec_amend before requiring a complete brief, then /dispatch and re-check",
  )
})

test("pick dispatches only an auto-brief eligible issue", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const conductNextDispatch =
    pick.match(/`?\/conduct next`?[^\n]*\/dispatch[^\n]*/)?.[0]?.trim() ?? ""
  const writesBriefForAutoBrief =
    /writes? a brief[\s\S]{0,40}`?auto_brief`?/.test(pick)
  const skipsIneligible =
    /skip(?:s)? [\s\S]{0,40}\/dispatch[\s\S]{0,80}eligible:\s*false|eligible:\s*false[\s\S]{0,80}skip(?:s)? [\s\S]{0,40}\/dispatch/.test(
      pick,
    )
  assert.ok(
    writesBriefForAutoBrief && skipsIneligible,
    `Step 6 must skip /dispatch when eligible: false and write a brief for auto_brief (${conductNextDispatch})`,
  )
})

test("incomplete brief without priority is explicitly ineligible", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const excluded = { eligible: false, reason: "excluded_priority" }
  const base = {
    status: "Todo",
    currentCycle: true,
    unansweredClarification: false,
  }
  for (const brief of [{ briefComplete: false }, {}]) {
    for (const priority of [undefined, null, ""]) {
      const record = { ...base, ...brief }
      if (priority !== undefined) record.priority = priority
      assert.deepEqual(classifyConductEligibility(record), excluded)
      for (const ticketClass of ["security", "payment", "auth"]) {
        assert.deepEqual(
          classifyConductEligibility({ ...record, class: ticketClass }),
          excluded,
        )
      }
    }
  }
})

test("Linear priority 0 is missing and does not auto-brief", async () => {
  const { classifyConductEligibility } =
    await import("../hooks/lib/ready-brief-policy.mjs")
  const excluded = { eligible: false, reason: "excluded_priority" }
  const record = {
    status: "Todo",
    currentCycle: true,
    unansweredClarification: false,
    briefComplete: false,
    priority: 0,
  }
  assert.deepEqual(classifyConductEligibility(record), excluded)
  for (const ticketClass of ["security", "payment", "auth"]) {
    assert.deepEqual(
      classifyConductEligibility({ ...record, class: ticketClass }),
      excluded,
    )
  }
})

test("conduct confirms the spec path before the step 7 amendment", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const step7 =
    conduct.match(/### 7\. Branch and execute[\s\S]*?(?=### 8\.)/)?.[0] ?? ""
  assert.match(
    step7,
    /identifies the owning spec[\s\S]{0,160}listed in `## Permissions Requested`[\s\S]{0,80}before amending[\s\S]{0,160}STOP without editing when either is unknown/,
    "conduct.md Step 7 must identify the owning spec and confirm it is listed in ## Permissions Requested before amending, and STOP without editing when either is unknown",
  )
})

test("pick confirms Permissions Requested before spec-amend", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const identifyStopAt = pick.search(
    /identifies the owning spec[\s\S]{0,240}STOP without editing when[\s\S]{0,60}(?:the spec path|that path|either) is unknown/,
  )
  const amendAt = pick.search(/On `spec_amend`, amend the owning spec/)
  assert.ok(
    identifyStopAt !== -1 && amendAt !== -1 && identifyStopAt < amendAt,
    `Step 6 must identify the owning spec and STOP without editing when the spec path is unknown before the spec_amend amend (identify/STOP at ${identifyStopAt}, amend at ${amendAt})`,
  )
})

test("pick identifies the spec before spec-amend without a work-order listing", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const identifyStopAt = pick.search(
    /identifies the owning spec[\s\S]{0,240}STOP without editing when[\s\S]{0,60}(?:the spec path|that path|either) is unknown/,
  )
  const amendAt = pick.search(/On `spec_amend`, amend the owning spec/)
  assert.ok(
    identifyStopAt !== -1 && amendAt !== -1 && identifyStopAt < amendAt,
    `Step 6 must identify the owning spec and STOP without editing when the spec path is unknown before spec_amend (identify/STOP at ${identifyStopAt}, amend at ${amendAt})`,
  )
  const sdd = readFileSync(
    join(process.cwd(), ".cursor/commands/sdd-to-tdd.md"),
    "utf8",
  )
  assert.match(
    sdd,
    /exact spec path[\s\S]{0,40}`## Permissions Requested`[\s\S]{0,80}before the amendment[\s\S]{0,120}STOP[\s\S]{0,40}path is unknown/,
  )
  assert.doesNotMatch(
    pick,
    /## Permissions Requested/,
    "Step 6 must not require a work-order ## Permissions Requested listing",
  )
})

test("pick starts only after brief re-check and Queue", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const recheckAt = pick.search(
    /re-check[\s\S]{0,160}complete brief|complete[- ]brief re-check/,
  )
  const queueAt = pick.search(/Queue:/)
  const startAt = pick.search(/\bstarts?\b/i)
  assert.ok(
    recheckAt !== -1 &&
      queueAt !== -1 &&
      startAt > recheckAt &&
      startAt > queueAt,
    `Step 6 must start only after the complete-brief re-check and Queue: pick (start ${startAt}, re-check ${recheckAt}, Queue: ${queueAt}); \`/dispatch\` to write the brief, then starts is too early`,
  )
})

test("pick dispatch is per reason so spec_amend can complete the brief", () => {
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const pick = conduct.match(/### 6\. Pick[\s\S]*?(?=### 7\.)/)?.[0] ?? ""
  const amendAt = pick.search(/On `spec_amend`, amend the owning spec/)
  const afterAmend = amendAt === -1 ? "" : pick.slice(amendAt)
  const firstDispatch = pick.search(/\/dispatch/)
  const skipsIneligible =
    /skip(?:s)? [\s\S]{0,40}\/dispatch[\s\S]{0,80}eligible:\s*false|eligible:\s*false[\s\S]{0,80}skip(?:s)? [\s\S]{0,40}\/dispatch/.test(
      pick,
    )
  const writesBriefForAutoBrief = /writes? a brief for `auto_brief`/.test(pick)
  const specAmendCompletes =
    /\/dispatch completes the brief for `spec_amend`/.test(afterAmend)
  const dispatchAfterAmend = amendAt !== -1 && firstDispatch > amendAt
  const readyKeeps = /`ready` pick keeps its existing brief/.test(pick)
  const onlyForAutoBrief = /writes a brief only for `?auto_brief`?/.test(pick)
  const unconditionalDispatch = pick
    .split("\n")
    .some(
      (line) =>
        /\/conduct next/.test(line) &&
        /\/dispatch/.test(line) &&
        /write the brief/.test(line) &&
        !/auto_brief/.test(line),
    )
  const observed = [
    skipsIneligible ? "skips-ineligible" : "missing-skip",
    writesBriefForAutoBrief ? "auto-brief-write" : "missing-auto-brief-write",
    onlyForAutoBrief ? "only-for-auto_brief" : "not-only-auto_brief",
    unconditionalDispatch ? "unconditional-dispatch" : "scoped-dispatch",
    specAmendCompletes ? "spec-amend-completes" : "missing-spec-amend-complete",
    readyKeeps ? "ready-keeps" : "missing-ready-keeps",
    dispatchAfterAmend ? "dispatch-after-amend" : "dispatch-before-amend",
  ].join(", ")
  assert.equal(
    observed,
    "skips-ineligible, auto-brief-write, not-only-auto_brief, scoped-dispatch, spec-amend-completes, ready-keeps, dispatch-after-amend",
    'Step 6 must skip /dispatch when eligible: false, write a brief for auto_brief, let /dispatch complete the brief for spec_amend after the permitted amend, and keep a ready pick\'s brief. "writes a brief only for auto_brief" and an unconditional "/conduct next runs /dispatch to write the brief" line are the failure.',
  )
})

test("readiness stops gh pr ready on a sensitive PR", () => {
  const release = readFileSync(
    join(process.cwd(), ".cursor/commands/ready-merge-release.md"),
    "utf8",
  )
  const readyStart = release.indexOf("### 3. Ready")
  const afterReady = release.indexOf("### 4.", readyStart)
  const step3 =
    readyStart === -1 || afterReady <= readyStart
      ? ""
      : release.slice(readyStart, afterReady)
  const mutationAt = step3.search(/run `gh pr ready(?! --undo)/)
  const beforeReady = mutationAt === -1 ? "" : step3.slice(0, mutationAt)
  const step3StopsBeforeGhPrReady =
    /qaMayReadyPr[\s\S]{0,240}false[\s\S]{0,200}\bSTOP\b|\bSTOP\b[\s\S]{0,240}qaMayReadyPr[\s\S]{0,160}false|`sensitive`[\s\S]{0,240}\bSTOP\b|\bSTOP\b[\s\S]{0,240}`sensitive`|sensitive label[\s\S]{0,240}\bSTOP\b|\bSTOP\b[\s\S]{0,240}sensitive label/i.test(
      beforeReady,
    )
  const beforeMutation =
    readyStart === -1 || mutationAt === -1
      ? ""
      : release.slice(0, readyStart + mutationAt)
  const fetchesLabels =
    /gh pr view[\s\S]{0,500}--json[\s\S]{0,400}\blabels\b/.test(beforeMutation)

  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const conductNamesThatStop =
    /\/ready-merge-release[\s\S]{0,400}\bSTOP\b[\s\S]{0,250}(?:qaMayReadyPr|`sensitive`|sensitive label)[\s\S]{0,200}gh pr ready|\bSTOP\b[\s\S]{0,280}(?:qaMayReadyPr[\s\S]{0,80}false|`sensitive`|sensitive label)[\s\S]{0,250}gh pr ready|(?:qaMayReadyPr[\s\S]{0,80}false|`sensitive`|sensitive label)[\s\S]{0,280}\bSTOP\b[\s\S]{0,200}gh pr ready/.test(
      conduct,
    )

  assert.deepEqual(
    {
      fetchesLabels,
      step3StopsBeforeGhPrReady,
      conductNamesThatStop,
    },
    {
      fetchesLabels: true,
      step3StopsBeforeGhPrReady: true,
      conductNamesThatStop: true,
    },
    "Step 3 (`### 3. Ready`) runs `gh pr ready` with no STOP when qaMayReadyPr is false or the PR has the sensitive label; conduct.md must name that STOP",
  )
})

test("completed design leaves design_first and takes the code route", async () => {
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
      scope: "new-scope",
      designComplete: true,
    }),
    { eligible: true, reason: "auto_brief" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      scope: "new-scope",
      designComplete: true,
      briefComplete: true,
    }),
    { eligible: true, reason: "ready" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      scope: "new-scope",
      designComplete: true,
      answeredClarification: true,
      briefMissingSpec: true,
    }),
    { eligible: true, reason: "spec_amend" },
  )
  assert.deepEqual(
    classifyConductEligibility({
      ...base,
      labels: ["/design"],
      designComplete: true,
      briefComplete: true,
    }),
    { eligible: true, reason: "ready" },
  )
  const conduct = readFileSync(
    join(process.cwd(), ".cursor/commands/conduct.md"),
    "utf8",
  )
  const step7 =
    conduct.match(/### 7\. Branch and execute[\s\S]*?(?=### 8\.)/)?.[0] ?? ""
  assert.match(
    step7,
    /later picks?[\s\S]{0,240}designComplete[\s\S]{0,240}code route[\s\S]{0,80}\/sdd-to-tdd|designComplete[\s\S]{0,240}later picks?[\s\S]{0,240}code route[\s\S]{0,80}\/sdd-to-tdd/i,
  )
})

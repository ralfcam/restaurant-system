#!/usr/bin/env node
/**
 * Slim harness lint for restaurant-system.
 *
 * Usage: node .cursor/checks/harness-lint.mjs
 * Exit 0 if clean, 1 if any violation.
 *
 * Checks:
 *   links            repo-root-relative markdown links in .cursor/{rules,commands,agents}
 *   fanout           TASK_FANOUT_INFLIGHT_CAP matches the number in task-fanout.mdc
 *   routing          fixed RES-key identity; display-name versionKey
 *                    extraction; exact slug resolution; fail-closed allocation;
 *                    milestone routes
 *   clarify          resolver-only bounded/idempotent comment feedback loop
 *   gates            commit.md names lint, typecheck, test:unit, gate open, harness-lint
 *   capture          capture.md pins Validation Summary row count = PHASE 5 slug count
 *   ledger           linear-resolver + triage Grep ledger before MCP
 *   findings-format  prettier --check on the five docs/findings/*.md bus files
 *                    via Corepack-independent local prettier (Linux Cloud Agents
 *                    and Windows; PATH Corepack shims are not portable)
 *   dispatch         includeRelations + verified-negative vs cannot-verify
 *   pm-workflow      triage intake, bounded dispatch scheduling, audit project
 *                    update, and single-writer/spawn-guard ownership
 *   groom-stale      expected-source-state GROOM handoff and pre-write stale guard
 *   clarify-only     executable clarify-* capture plans (authorization/order/no-work)
 *   design-writes    design PHASE 5 write whitelist (spec, docs-updater, CLARIFY)
 *   run-ledger       named run-file registration, source mapping, and pruning
 *   clarify-state    CLARIFY leaves current workflow state unchanged
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  extractProjectSlug,
  extractVersionKey,
} from "../hooks/lib/linear-project-routing-policy.mjs"
import { runPnpm } from "./run-pnpm.mjs"

const FINDINGS_LEDGER = [
  "docs/findings/archive.md",
  "docs/findings/product-gaps.md",
  "docs/findings/security.md",
  "docs/findings/tech-debt.md",
  "docs/findings/test-debt.md",
]
const ROOT = process.cwd()
const violations = []
const LEGACY_ISSUE_PREFIX = ["REA", "ZED"].join("")

function fail(id, msg) {
  violations.push(`${id}: ${msg}`)
}

function walk(dir, ext, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, ext, acc)
    else if (p.endsWith(ext)) acc.push(p)
  }
  return acc
}

function stripFences(text) {
  const out = []
  let inFence = false
  for (const line of text.split("\n")) {
    if (/^```/.test(line)) {
      inFence = !inFence
      out.push("")
      continue
    }
    out.push(inFence ? "" : line)
  }
  return out.join("\n")
}

function checkLinks() {
  const files = [
    ...walk(join(ROOT, ".cursor", "rules"), ".mdc"),
    ...walk(join(ROOT, ".cursor", "commands"), ".md"),
    ...walk(join(ROOT, ".cursor", "agents"), ".md"),
  ]
  const linkRe = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g
  for (const file of files) {
    const text = stripFences(readFileSync(file, "utf8"))
    let m
    while ((m = linkRe.exec(text))) {
      const href = m[2].trim()
      if (/^(https?:|mailto:|#)/i.test(href)) continue
      if (href.includes("<") || href.includes(">")) continue
      if (href.startsWith("../") || href.startsWith("./")) {
        fail(
          "links",
          `${file}: sibling-relative link ${href} — use repo-root-relative`,
        )
        continue
      }
      const pathOnly = href.split("#")[0]
      if (!pathOnly) continue
      const abs = resolve(ROOT, pathOnly)
      if (!existsSync(abs)) fail("links", `${file}: missing ${pathOnly}`)
    }
  }
}

function checkFanout() {
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
  if (!ruleN || !polN) {
    fail(
      "fanout",
      "could not read TASK_FANOUT_INFLIGHT_CAP from rule and policy",
    )
    return
  }
  if (ruleN[1] !== polN[1]) {
    fail("fanout", `rule cap ${ruleN[1]} != policy cap ${polN[1]}`)
  }
}

export function detectActiveRoutingTextViolations(rel, text) {
  const found = []
  if (new RegExp(`\\b${LEGACY_ISSUE_PREFIX}-`, "i").test(text)) {
    found.push(`${rel} contains the legacy Linear issue prefix`)
  }
  if (
    /https:\/\/linear\.app\/[^\s)]+\/project\/[^\s)]+/i.test(text) ||
    /(?:Default project|Platform override):/i.test(text)
  ) {
    found.push(`${rel} hardcodes a Linear project default or URL`)
  }
  return found
}

function requireAll(id, rel, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) fail(id, `${rel} must contain ${needle}`)
  }
}

function missingNeedles(rel, text, needles) {
  return needles
    .filter((needle) => !text.includes(needle))
    .map((needle) => `${rel} must contain ${needle}`)
}

function forbiddenNeedles(rel, text, needles) {
  return needles
    .filter((needle) => text.includes(needle))
    .map((needle) => `${rel} must not contain ${needle}`)
}

export const GROOM_STALE_NEEDLES = {
  ".cursor/agents/linear-resolver.md": [
    "expected source state",
    "freshly re-read before any metadata, relation, comment, or state write",
    "live Triage-inbox membership",
    "already-scheduled correction",
    "report `stale`",
    "complete target state already matches",
    "stale item is deferred independently",
  ],
  ".cursor/commands/triage.md": [
    "expected source state",
    "stale item is deferred independently",
  ],
  ".cursor/commands/dispatch.md": [
    "expected source state",
    "already-scheduled correction",
    "stale item is deferred independently",
  ],
}

export const CLARIFY_ONLY_CAPTURE_NEEDLES = [
  "An approved clarification-only plan must invoke `linear-resolver` and then stop",
  "untracked or unapproved clarification remains non-executable",
  "then each approved `clarify-*` todo",
  "any `linear-register`, and any `clarify-*`",
  "and any approved `clarify-*`",
]

export const CLARIFY_ONLY_CAPTURE_FORBIDDEN = [
  "there is nothing to execute — report the",
]

export const DESIGN_WRITE_WHITELIST_NEEDLES = [
  "approved spec write",
  "optional `docs-updater` delegation",
  "single approved comment-only CLARIFY",
]

export const DESIGN_WRITE_WHITELIST_FORBIDDEN = [
  "The only other write besides the spec file is the gated",
]

export const RUN_FILE_LIFECYCLE_NEEDLES = {
  ".cursor/agents/linear-resolver.md": [
    "named run files",
    "derive category from the run section",
    "source path/entry mapping",
  ],
  ".cursor/commands/triage.md": [
    "exact orphaned `docs/findings/runs/*.md` paths",
    "reconcile run/bus duplicates once",
    "original source line",
    "preserving unrelated run content",
    "Validate touched run entries and archive outcomes structurally",
  ],
}

export const CLARIFY_STATE_UNCHANGED_RELS = [
  ".cursor/rules/linear-automation.mdc",
  ".cursor/commands/capture.md",
  ".cursor/commands/design.md",
  ".cursor/commands/sdd-to-tdd.md",
  ".cursor/rules/linear-project-routing.mdc",
]

export const CLARIFY_STATE_UNCHANGED_NEEDLE = "current workflow state unchanged"

export const CLARIFY_STATE_FORBIDDEN = [
  "stays in Triage/Backlog",
  "leaves the issue in Triage/Backlog",
  "current Triage/Backlog state",
  "leaves it in Triage/Backlog",
]

export function detectGroomStaleGuardViolations(rel, text) {
  const needles = GROOM_STALE_NEEDLES[rel]
  return needles ? missingNeedles(rel, text, needles) : []
}

export function detectClarifyOnlyCaptureViolations(text) {
  const rel = ".cursor/commands/capture.md"
  return [
    ...missingNeedles(rel, text, CLARIFY_ONLY_CAPTURE_NEEDLES),
    ...forbiddenNeedles(rel, text, CLARIFY_ONLY_CAPTURE_FORBIDDEN),
  ]
}

export function detectDesignWriteWhitelistViolations(text) {
  const rel = ".cursor/commands/design.md"
  return [
    ...missingNeedles(rel, text, DESIGN_WRITE_WHITELIST_NEEDLES),
    ...forbiddenNeedles(rel, text, DESIGN_WRITE_WHITELIST_FORBIDDEN),
  ]
}

export function detectRunFileLifecycleViolations(rel, text) {
  const needles = RUN_FILE_LIFECYCLE_NEEDLES[rel]
  return needles ? missingNeedles(rel, text, needles) : []
}

export function detectClarifyStateWordingViolations(rel, text) {
  if (!CLARIFY_STATE_UNCHANGED_RELS.includes(rel)) return []
  return [
    ...missingNeedles(rel, text, [CLARIFY_STATE_UNCHANGED_NEEDLE]),
    ...forbiddenNeedles(rel, text, CLARIFY_STATE_FORBIDDEN),
  ]
}

function checkRoutingContracts() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  const active = [
    ".cursor/README.md",
    "docs/findings/README.md",
    ...walk(join(ROOT, ".cursor", "rules"), ".mdc").map((p) =>
      p.slice(ROOT.length + 1).replaceAll("\\", "/"),
    ),
    ...walk(join(ROOT, ".cursor", "commands"), ".md").map((p) =>
      p.slice(ROOT.length + 1).replaceAll("\\", "/"),
    ),
    ...walk(join(ROOT, ".cursor", "agents"), ".md").map((p) =>
      p.slice(ROOT.length + 1).replaceAll("\\", "/"),
    ),
  ]
  for (const rel of active) {
    for (const message of detectActiveRoutingTextViolations(rel, read(rel))) {
      fail("routing", message)
    }
  }

  const routingRel = ".cursor/rules/linear-project-routing.mdc"
  const routing = read(routingRel)
  if (routing.includes("`^V-\\d+\\.\\d+$`")) {
    fail(
      "routing",
      `${routingRel} still uses the obsolete whole-name V-X.X gate`,
    )
  }
  requireAll("routing", routingRel, routing, [
    "prefix **`RES`**",
    "owning team key/UUID is RES",
    "`versionKey`",
    "standalone",
    "`list_projects`",
    "paginate until exhausted",
    "Never infer identity from the human-readable slug",
    "multiple distinct tokens",
    "duplicate canonical keys",
    "**ongoing**",
    "**available**",
    "Fail closed",
    "explicit valid pinned project",
    "existing nonterminal RES version project",
    "project of its parent or issue that blocks it",
    "descriptions/labels plus milestone compatibility",
    "for Urgent/Blocker work",
    "earliest compatible available version",
    "Select one audit project",
    "no ongoing project exists or a tie",
  ])

  for (const rel of [
    ".cursor/commands/triage.md",
    ".cursor/commands/dispatch.md",
    ".cursor/commands/audit.md",
    ".cursor/commands/tldr.md",
    ".cursor/commands/sdd-to-tdd.md",
  ]) {
    const text = read(rel)
    requireAll("routing", rel, text, [
      "linear-project-routing.mdc",
      "list_projects",
      "canonical version key",
      "V-X.X",
      "RES",
    ])
  }

  for (const rel of [
    ".cursor/commands/triage.md",
    ".cursor/commands/dispatch.md",
    ".cursor/commands/audit.md",
  ]) {
    const text = read(rel)
    requireAll("routing", rel, text, [
      "/project/<slug>/...",
      "query",
      "multiline Markdown",
      "get_issue",
      "non-RES",
      "exact slug",
      "versionKey",
    ])
  }

  requireAll(
    "routing",
    ".cursor/commands/triage.md",
    read(".cursor/commands/triage.md"),
    [
      "explicit issues: read exactly",
      "pinned project",
      "allocated V-X.X project",
      "ongoing",
    ],
  )
  requireAll(
    "routing",
    ".cursor/commands/dispatch.md",
    read(".cursor/commands/dispatch.md"),
    [
      "complete ordered candidate pool",
      "explicit list is the complete",
      "within their owning project",
      "cross-project",
      "final tie-break",
    ],
  )
  requireAll(
    "routing",
    ".cursor/commands/audit.md",
    read(".cursor/commands/audit.md"),
    [
      "AUDIT SCOPE",
      "complete repository audit",
      "owning specs/code",
      "hub-walk only",
      "omitted spec",
      "mandatory cross-cutting controls",
    ],
  )

  const findingsRel = "docs/findings/README.md"
  requireAll("routing", findingsRel, read(findingsRel), [
    "Fixed team key: **RES**",
    "canonical version key `V-X.X`",
    "allocated `V-X.X` project",
  ])
  requireAll("routing", ".cursor/README.md", read(".cursor/README.md"), [
    "canonical version key",
    "team whose key is **`RES`**",
  ])

  const fixtureRel = ".cursor/checks/fixtures/routing-scopes.json"
  if (!existsSync(join(ROOT, fixtureRel))) {
    fail("routing", `${fixtureRel} is missing`)
  } else {
    try {
      const fixtures = JSON.parse(read(fixtureRel))
      for (const name of [
        "project issues-view URL with layout and query",
        "multiline Markdown issue list preserves ordered first occurrences",
        "duplicates malformed and mixed-team entries fail closed",
        "project plus list is an intersection boundary",
        "dispatch list larger than lane capacity remains bounded",
        "targeted audit derives scope from listed issue hubs",
        "decorated overview URL resolves by exact slug then versionKey",
      ]) {
        if (!fixtures.some((fixture) => fixture.name === name)) {
          fail("routing", `${fixtureRel} must include fixture: ${name}`)
        }
      }
      const decorated = fixtures.find(
        (fixture) =>
          fixture.name ===
          "decorated overview URL resolves by exact slug then versionKey",
      )
      if (decorated) {
        if (
          extractProjectSlug(decorated.input) !== decorated.expectedProjectSlug
        ) {
          fail(
            "routing",
            `${fixtureRel} decorated URL must extract expectedProjectSlug`,
          )
        }
        if (
          extractVersionKey(decorated.expectedDisplayName) !==
          decorated.expectedVersionKey
        ) {
          fail(
            "routing",
            `${fixtureRel} decorated display name must extract expectedVersionKey`,
          )
        }
        if (extractVersionKey(decorated.expectedProjectSlug) !== null) {
          fail(
            "routing",
            `${fixtureRel} must not infer versionKey from the human-readable slug`,
          )
        }
      }
    } catch (error) {
      fail("routing", `${fixtureRel} is invalid JSON: ${error.message}`)
    }
  }
}

function checkCaptureSlugRule() {
  const text = readFileSync(
    join(ROOT, ".cursor", "commands", "capture.md"),
    "utf8",
  )
  if (
    !text.includes("Validation Summary row count must equal PHASE 5 slug count")
  ) {
    fail(
      "capture",
      "capture.md must pin Validation Summary row count = PHASE 5 slug count",
    )
  }
}

function checkLedgerFirst() {
  const needle =
    "Grep ledger before MCP: Grep `docs/findings/archive.md` and open `docs/findings/*.md` for `RES-###` before the first `list_issues` / `get_issue`."
  for (const rel of [
    ".cursor/agents/linear-resolver.md",
    ".cursor/commands/triage.md",
  ]) {
    const text = readFileSync(join(ROOT, rel), "utf8")
    if (!text.includes(needle))
      fail("ledger", `${rel} must Grep ledger before MCP`)
  }
}

function checkGates() {
  const commit = readFileSync(
    join(ROOT, ".cursor", "commands", "commit.md"),
    "utf8",
  )
  for (const needle of [
    "pnpm lint",
    "pnpm typecheck",
    "pnpm test:unit",
    "gate open",
    "harness-lint.mjs",
  ]) {
    if (!commit.includes(needle)) fail("gates", `commit.md must name ${needle}`)
  }
}

function checkFindingsFormat() {
  const triage = readFileSync(
    join(ROOT, ".cursor", "commands", "triage.md"),
    "utf8",
  )
  const pruneRow = triage
    .split("\n")
    .find((line) => line.includes("| `prune-ledger`"))
  if (!pruneRow?.includes("pnpm exec prettier --check")) {
    fail(
      "findings-format",
      "triage.md prune-ledger path must name pnpm exec prettier --check",
    )
  }
  const r = runPnpm(["exec", "prettier", "--check", ...FINDINGS_LEDGER], {
    cwd: ROOT,
  })
  if (r.error || r.status == null || r.status !== 0) {
    const detail = [r.stderr, r.stdout, r.error?.message]
      .filter(Boolean)
      .join("\n")
      .trim()
    fail(
      "findings-format",
      detail ||
        "prettier --check failed (prettier missing or files unformatted)",
    )
  }
}

function checkDispatchNeedles() {
  const dispatch = readFileSync(
    join(ROOT, ".cursor", "commands", "dispatch.md"),
    "utf8",
  )
  if (!dispatch.includes("includeRelations"))
    fail("dispatch", "dispatch.md must contain includeRelations")
  for (const rel of [
    ".cursor/commands/dispatch.md",
    ".cursor/commands/triage.md",
  ]) {
    const text = readFileSync(join(ROOT, rel), "utf8")
    if (!text.includes("verified negative"))
      fail("dispatch", `${rel} must pin verified negative`)
    if (!text.includes("cannot verify` is for tool/MCP failure"))
      fail("dispatch", `${rel} must pin cannot verify is for tool/MCP failure`)
  }
}

function checkPmWorkflowContracts() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  const requireAll = (rel, text, needles) => {
    for (const needle of needles) {
      if (!text.includes(needle))
        fail("pm-workflow", `${rel} must contain ${needle}`)
    }
  }

  const triageRel = ".cursor/commands/triage.md"
  const triage = read(triageRel)
  requireAll(triageRel, triage, [
    'state: "triage"',
    "Linear Triage is an intake inbox, not a normal workflow status",
    "Ordinary accepted work",
    "Backlog",
    "Urgent fast lane",
    "`blocked-by` relation is dependency evidence",
    "leaves scheduling metadata for `/dispatch`",
  ])
  for (const stale of [
    'There is **no "Triage" state',
    "Inspect all open issues in parallel",
    "`backfill-*`",
    "`sweep-*`",
  ]) {
    if (triage.includes(stale))
      fail(
        "pm-workflow",
        `${triageRel} still contains stale contract: ${stale}`,
      )
  }

  const dispatchRel = ".cursor/commands/dispatch.md"
  const dispatch = read(dispatchRel)
  requireAll(dispatchRel, dispatch, [
    "schedule-selected",
    "emit-post-apply-card",
    "one local",
    "three background",
    "Backlog → Todo",
    "one explicit GROOM batch",
    "post-apply re-read",
    "linear-resolver",
  ])
  for (const stale of [
    "There is no execution phase",
    "card is the whole deliverable",
    "never write Linear",
  ]) {
    if (dispatch.includes(stale))
      fail(
        "pm-workflow",
        `${dispatchRel} still contains stale contract: ${stale}`,
      )
  }

  const auditRel = ".cursor/commands/audit.md"
  const audit = read(auditRel)
  requireAll(auditRel, audit, [
    "Source of truth — docs/specs/ ONLY",
    "FINAL — PROJECT HEALTH VISIBILITY",
    "Audit run key:",
    "get_status_updates",
    "save_status_update",
    "`onTrack`",
    "`atRisk`",
    "`offTrack`",
    "`/projects/all`",
  ])
  if (
    audit.indexOf("FINAL — PROJECT HEALTH VISIBILITY") < audit.indexOf("PART 8")
  ) {
    fail("pm-workflow", `${auditRel} project update must follow PART 8`)
  }

  const resolverRel = ".cursor/agents/linear-resolver.md"
  const resolver = read(resolverRel)
  requireAll(resolverRel, resolver, [
    "`/triage` or `/dispatch`",
    "PROJECT-UPDATE",
    "get_status_updates",
    "save_status_update",
    "may call only",
    "Audit run key:",
  ])

  const writePolicyRel = ".cursor/hooks/lib/linear-write-policy.mjs"
  const writePolicy = read(writePolicyRel)
  requireAll(writePolicyRel, writePolicy, ['"save_status_update"'])

  const spawnPolicyRel = ".cursor/hooks/lib/linear-spawn-policy.mjs"
  const spawnPolicy = read(spawnPolicyRel)
  requireAll(spawnPolicyRel, spawnPolicy, [
    'toolName === "save_status_update"',
    "mentionHit(a.body",
  ])
}

function checkMilestoneRouting() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  requireAll(
    "milestone-routing",
    ".cursor/commands/design.md",
    read(".cursor/commands/design.md"),
    [
      "pre-implementation work in M1–M3 only",
      "M1 for genuine",
      "M2 for requirements/spec",
      "M3 — architecture",
      "blocks the later",
    ],
  )
  requireAll(
    "milestone-routing",
    ".cursor/commands/sdd-to-tdd.md",
    read(".cursor/commands/sdd-to-tdd.md"),
    [
      "Route by the work being performed",
      "M2 — Requirements Sign-Off",
      "M4 — Code Complete",
      "Do not impose a blanket M4+",
      "M5, M6, M7, M8, and",
      "decision/design issue blocks the implementation issue",
    ],
  )
  requireAll(
    "milestone-routing",
    "docs/findings/README.md",
    read("docs/findings/README.md"),
    [
      "Command-to-milestone contract",
      "`/design` is pre-implementation",
      "`/sdd-to-tdd` may remain M2",
      "Do not apply a blanket M4+",
    ],
  )
}

function checkClarificationLoop() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  const resolverRel = ".cursor/agents/linear-resolver.md"
  const resolver = read(resolverRel)
  requireAll("clarify", resolverRel, resolver, [
    "Six duties: CLARIFY comment",
    "## Workflow — CLARIFY",
    "may call only `list_comments` and",
    "`save_comment`",
    "Clarification required",
    "clarify:<RES-id>:<spec-basename>:<rule-or-ac>",
    "identical unresolved key",
    "materially changed spec evidence",
    "different rule/criterion",
    "START_SUMMARY_MAX_CHARS",
    "Do not call Slack",
    "trigger In Review/Done automations",
  ])

  for (const rel of [
    ".cursor/commands/triage.md",
    ".cursor/commands/dispatch.md",
    ".cursor/commands/design.md",
    ".cursor/commands/sdd-to-tdd.md",
    ".cursor/commands/capture.md",
  ]) {
    requireAll("clarify", rel, read(rel), [
      "linear-resolver",
      "CLARIFY",
      "Clarification required",
      "clarify:<RES-id>:<spec-basename>:<rule-or-ac>",
    ])
  }

  const automationRel = ".cursor/rules/linear-automation.mdc"
  requireAll("clarify", automationRel, read(automationRel), [
    "CLARIFY is comment-only",
    "Slack visibility triggers only",
    "never trigger In Review/Done",
  ])
}

function checkResIdentity() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  for (const rel of [
    ".cursor/commands/dispatch.md",
    ".cursor/rules/staging-accumulator.mdc",
  ]) {
    if (!read(rel).includes("sdd/RES-")) {
      fail("identity", `${rel} must name sdd/RES-`)
    }
  }
  for (const rel of [
    ".cursor/commands/commit.md",
    ".cursor/commands/push.md",
    ".cursor/commands/intake.md",
  ]) {
    requireAll("identity", rel, read(rel), ["Fixes RES-", "RES-\\d+"])
  }
  requireAll(
    "identity",
    ".cursor/rules/vercel-project.mdc",
    read(".cursor/rules/vercel-project.mdc"),
    ["Project slug: `restaurant-system`"],
  )
}

function checkReviewFixContracts() {
  const read = (rel) => readFileSync(join(ROOT, rel), "utf8")
  for (const rel of Object.keys(GROOM_STALE_NEEDLES)) {
    for (const message of detectGroomStaleGuardViolations(rel, read(rel))) {
      fail("groom-stale", message)
    }
  }
  for (const message of detectClarifyOnlyCaptureViolations(
    read(".cursor/commands/capture.md"),
  )) {
    fail("clarify-only", message)
  }
  for (const message of detectDesignWriteWhitelistViolations(
    read(".cursor/commands/design.md"),
  )) {
    fail("design-writes", message)
  }
  for (const rel of Object.keys(RUN_FILE_LIFECYCLE_NEEDLES)) {
    for (const message of detectRunFileLifecycleViolations(rel, read(rel))) {
      fail("run-ledger", message)
    }
  }
  for (const rel of CLARIFY_STATE_UNCHANGED_RELS) {
    for (const message of detectClarifyStateWordingViolations(rel, read(rel))) {
      fail("clarify-state", message)
    }
  }
}

export function runHarnessLint() {
  checkLinks()
  checkFanout()
  checkRoutingContracts()
  checkResIdentity()
  checkGates()
  checkCaptureSlugRule()
  checkLedgerFirst()
  checkFindingsFormat()
  checkDispatchNeedles()
  checkPmWorkflowContracts()
  checkMilestoneRouting()
  checkClarificationLoop()
  checkReviewFixContracts()

  if (violations.length) {
    for (const v of violations) console.error(v)
    return 1
  }
  console.log("harness-lint: ok")
  return 0
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  process.exit(runHarnessLint())
}

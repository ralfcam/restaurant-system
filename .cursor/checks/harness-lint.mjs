#!/usr/bin/env node
/**
 * Slim harness lint for restaurant-system.
 *
 * Usage: node .cursor/checks/harness-lint.mjs
 * Exit 0 if clean, 1 if any violation.
 *
 * Checks:
 *   links     repo-root-relative markdown links in .cursor/{rules,commands,agents}
 *   fanout    TASK_FANOUT_INFLIGHT_CAP matches the number in task-fanout.mdc
 *   prefix    dispatch + staging-accumulator use sdd/REAZED- (not sdd/SG-);
 *             triage/tldr/dispatch default to restaurant-system (not SG→REAZED)
 *   gates     commit.md names lint, typecheck, test:unit, gate open, harness-lint
 *   capture   capture.md pins Validation Summary row count = PHASE 5 slug count
 *   ledger    linear-resolver + triage Grep ledger before MCP
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT = process.cwd()
const violations = []

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

function checkPrefix() {
  for (const rel of [
    ".cursor/commands/dispatch.md",
    ".cursor/rules/staging-accumulator.mdc",
  ]) {
    const text = readFileSync(join(ROOT, rel), "utf8")
    if (!text.includes("sdd/REAZED-"))
      fail("prefix", `${rel} must name sdd/REAZED-`)
    if (/sdd\/SG-/.test(text)) fail("prefix", `${rel} still mentions sdd/SG-`)
  }
  for (const rel of [
    ".cursor/commands/triage.md",
    ".cursor/commands/tldr.md",
    ".cursor/commands/dispatch.md",
  ]) {
    const text = readFileSync(join(ROOT, rel), "utf8")
    const hasDefault =
      text.includes("project/restaurant-system") ||
      text.includes("Default project: **restaurant-system**")
    if (!hasDefault)
      fail(
        "prefix",
        `${rel} must name restaurant-system as the default project`,
      )
    if (text.includes("key **SG** → issues are `REAZED-###`"))
      fail("prefix", `${rel} still claims SG emits REAZED-###`)
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
    "Grep ledger before MCP: Grep `docs/findings/archive.md` and open `docs/findings/*.md` for `REAZED-###` before the first `list_issues` / `get_issue`."
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

checkLinks()
checkFanout()
checkPrefix()
checkGates()
checkCaptureSlugRule()
checkLedgerFirst()

if (violations.length) {
  for (const v of violations) console.error(v)
  process.exit(1)
}
console.log("harness-lint: ok")

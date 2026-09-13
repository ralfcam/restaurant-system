#!/usr/bin/env node
/**
 * Local CodeRabbit final-surface gate. Reviews the dirty tree after a scoped
 * work-order check and writes an ignored receipt. Never executes
 * codegenInstructions. Never stashes or resets.
 *
 * Usage:
 *   node .cursor/checks/coderabbit-gate.mjs --owning-spec docs/specs/foo.md --work-order <json>
 */
import { spawn, spawnSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  DEFAULT_REVIEW_TIMEOUT_MS,
  PINNED_CLI_VERSION,
  YAML_REL,
  POLICY_REL,
  assertPinnedUsAuth,
  buildReceipt,
  configHashes,
  currentBranch,
  defaultStateDir,
  evaluateAgentStream,
  evaluateWorkOrder,
  loadWaivers,
  parseJsonl,
  resolveCrBinary,
  resolveDirtyPaths,
  resolveHead,
  resolveManifest,
  reviewCommandArgs,
  saveReceipt,
} from "../hooks/lib/coderabbit-review-policy.mjs"

function argValue(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function fail(reason, extra = {}) {
  console.error(
    JSON.stringify({ ok: false, reason, ...extra }, null, 2),
  )
  process.exit(1)
}

function loadWorkOrder(path) {
  if (!path) fail("missing_work_order")
  if (!existsSync(path)) fail("missing_work_order", { path })
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"))
    if (!raw || typeof raw !== "object") fail("malformed_work_order")
    const expectedPaths = Array.isArray(raw.expectedPaths)
      ? raw.expectedPaths
      : []
    return {
      owningSpec: raw.owningSpec || null,
      expectedPaths,
      base: raw.base || null,
    }
  } catch (err) {
    fail("malformed_work_order", { message: err.message })
  }
}

function spawnOpts(bin, cwd) {
  return {
    cwd,
    env: process.env,
    shell: process.platform === "win32" && !String(bin).endsWith(".exe"),
  }
}

function runCr(bin, args, { timeoutMs, cwd }) {
  return new Promise((resolvePromise) => {
    const child = spawn(bin, args, spawnOpts(bin, cwd))
    let stdout = ""
    let stderr = ""
    let timedOut = false
    let lastEvent = Date.now()
    const timer = setInterval(() => {
      if (Date.now() - lastEvent <= timeoutMs) return
      timedOut = true
      child.kill()
      clearInterval(timer)
    }, 250)
    child.stdout.on("data", (chunk) => {
      stdout += chunk
      lastEvent = Date.now()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })
    child.on("close", (code) => {
      clearInterval(timer)
      resolvePromise({ code, stdout, stderr, timedOut })
    })
    child.on("error", (err) => {
      clearInterval(timer)
      resolvePromise({
        code: 1,
        stdout,
        stderr: `${stderr}\n${err.message}`,
        timedOut,
      })
    })
  })
}

function isTestMode() {
  return process.env.CODERABBIT_GATE_TEST === "1"
}

function readPinnedAuth(cwd) {
  if (isTestMode()) {
    return {
      version: process.env.CODERABBIT_STUB_VERSION || PINNED_CLI_VERSION,
      auth: JSON.parse(
        process.env.CODERABBIT_STUB_AUTH ||
          '{"authenticated":true,"region":"us"}',
      ),
      jsonl: process.env.CODERABBIT_STUB_JSONL
        ? readFileSync(process.env.CODERABBIT_STUB_JSONL, "utf8")
        : "",
    }
  }
  const bin = resolveCrBinary()
  const versionRun = spawnSync(bin, ["--version"], {
    ...spawnOpts(bin, cwd),
    encoding: "utf8",
  })
  const authRun = spawnSync(bin, ["auth", "status", "--agent"], {
    ...spawnOpts(bin, cwd),
    encoding: "utf8",
  })
  return {
    version: (versionRun.stdout || "").trim(),
    auth: authRun.stdout || "",
    bin,
  }
}

function dirtyPaths(cwd) {
  return resolveDirtyPaths(cwd)
}

function manifestFor(cwd, paths) {
  return resolveManifest(cwd, paths)
}

function headFor(cwd) {
  return resolveHead(cwd)
}

function branchFor(cwd) {
  if (isTestMode() && process.env.CODERABBIT_STUB_BRANCH) {
    return process.env.CODERABBIT_STUB_BRANCH
  }
  return currentBranch(cwd)
}

async function main() {
  const cwd = process.cwd()
  const owningSpecArg = argValue("--owning-spec")
  const workOrder = loadWorkOrder(argValue("--work-order"))
  const owningSpec = owningSpecArg || workOrder.owningSpec
  if (!owningSpec) fail("missing_owning_spec")
  const timeoutMs = Number(
    argValue("--timeout-ms") ||
      process.env.CODERABBIT_REVIEW_TIMEOUT_MS ||
      DEFAULT_REVIEW_TIMEOUT_MS,
  )
  const base =
    argValue("--base") || workOrder.base || currentBranch(cwd) || "staging"

  const dirty = dirtyPaths(cwd)
  const scope = evaluateWorkOrder({
    dirtyPaths: dirty,
    expectedPaths: workOrder.expectedPaths,
  })
  if (!scope.ok) fail(scope.reason, { paths: scope.paths })

  const beforeManifest = manifestFor(cwd, scope.reviewablePaths)
  const hashes = configHashes(cwd)
  const head = headFor(cwd)
  const branch = branchFor(cwd)

  const pinned = readPinnedAuth(cwd)
  const authCheck = assertPinnedUsAuth({
    version: pinned.version,
    auth: pinned.auth,
  })
  if (!authCheck.ok) fail(authCheck.reason, authCheck)

  let jsonl = pinned.jsonl
  if (!isTestMode()) {
    const bin = pinned.bin || resolveCrBinary()
    const args = reviewCommandArgs({ owningSpec, base })
    const review = await runCr(bin, args, { timeoutMs, cwd })
    if (review.timedOut) fail("timeout")
    jsonl = review.stdout
    if (!jsonl.trim() && review.code !== 0) {
      fail("error", { stderr: review.stderr, code: review.code })
    }
  } else if (!jsonl) {
    fail("missing_complete")
  }

  const parsed = parseJsonl(jsonl)
  if (!parsed.ok) fail(parsed.reason, { line: parsed.line })

  const waivers = loadWaivers(defaultStateDir())
  const evaluated = evaluateAgentStream(parsed.events, {
    reviewablePaths: scope.reviewablePaths,
    base,
    waivers,
  })
  if (!evaluated.ok) {
    fail(evaluated.reason, {
      blocking: evaluated.blocking,
      expected: evaluated.expected,
      actual: evaluated.actual,
    })
  }

  const afterManifest = manifestFor(cwd, scope.reviewablePaths)
  if (JSON.stringify(beforeManifest) !== JSON.stringify(afterManifest)) {
    fail("changed_bytes")
  }

  const receipt = buildReceipt({
    cliVersion: PINNED_CLI_VERSION,
    region: "us",
    branch,
    base,
    head,
    manifest: afterManifest,
    configHashes: hashes,
    reviewedFiles: evaluated.reviewedFiles,
    findings: evaluated.findings,
    waived: evaluated.waived,
    nonBlocking: evaluated.nonBlocking,
    owningSpec,
  })
  saveReceipt(defaultStateDir(), receipt)
  console.log(
    JSON.stringify(
      {
        ok: true,
        reason: "clean",
        reviewedFiles: receipt.reviewedFiles,
        findingIds: receipt.findingIds,
        yaml: YAML_REL,
        policy: POLICY_REL,
      },
      null,
      2,
    ),
  )
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    fail("error", { message: err.message })
  })
}

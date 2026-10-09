#!/usr/bin/env node
/**
 * Mandatory advisory local CodeRabbit attempt. `/push` reviews the committed
 * branch diff against `origin/staging` (`--branch-diff`). The dirty-tree
 * work-order path stays for tests and stays paused outside test mode.
 * Never executes codegenInstructions. Never stashes or resets.
 *
 * Usage:
 *   node .cursor/checks/coderabbit-gate.mjs --branch-diff --base origin/staging
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
  applyWaivers,
  assertPinnedUsAuth,
  buildReceipt,
  configHashes,
  currentBranch,
  defaultStateDir,
  evaluateAgentStream,
  evaluateWorkOrder,
  isSecretPath,
  loadPushRound,
  loadWaivers,
  parseJsonl,
  resolveBranchDiffPaths,
  resolveCrBinary,
  resolveDirtyPaths,
  resolveHead,
  resolveManifest,
  reviewCommandArgs,
  savePushRound,
  saveReceipt,
  branchDiffBaseExists,
} from "../hooks/lib/coderabbit-review-policy.mjs"
import { decidePushCliAction } from "../hooks/lib/coderabbit-pr-policy.mjs"

function argValue(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function fail(reason, extra = {}) {
  console.error(JSON.stringify({ ok: false, reason, ...extra }, null, 2))
  process.exit(1)
}

function loadWorkOrder(path) {
  if (!path) fail("missing_work_order")
  if (!existsSync(path)) fail("missing_work_order", { path })
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"))
    if (!raw || typeof raw !== "object") fail("malformed_work_order")
    if (
      !Array.isArray(raw.expectedPaths) ||
      raw.expectedPaths.some(
        (item) => typeof item !== "string" || item.trim() === "",
      ) ||
      (raw.owningSpec != null && typeof raw.owningSpec !== "string") ||
      (raw.base != null && typeof raw.base !== "string")
    ) {
      fail("malformed_work_order")
    }
    return {
      owningSpec: raw.owningSpec || null,
      expectedPaths: raw.expectedPaths,
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

function manifestFor(cwd, paths, afterAttempt = false) {
  if (
    afterAttempt &&
    isTestMode() &&
    process.env.CODERABBIT_STUB_AFTER_MANIFEST
  ) {
    return JSON.parse(process.env.CODERABBIT_STUB_AFTER_MANIFEST)
  }
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

function dispositionFor(findings, waivers) {
  return applyWaivers(findings, waivers)
}

function unavailable(reason, findings = [], waivers = [], extra = {}) {
  const dispositions = dispositionFor(findings, waivers)
  return {
    attemptStatus: "unavailable",
    reason,
    findings,
    reviewedFiles: [],
    ...dispositions,
    ...extra,
  }
}

function evaluateAdvisoryJsonl(jsonl, { reviewablePaths, base, waivers }) {
  const parsed = parseJsonl(jsonl)
  if (!parsed.ok) {
    const findings = parsed.events.filter((event) => event.type === "finding")
    return unavailable(parsed.reason, findings, waivers, { line: parsed.line })
  }

  const evaluated = evaluateAgentStream(parsed.events, {
    reviewablePaths,
    base,
    waivers,
  })
  if (!evaluated.ok) {
    if (evaluated.reason === "unresolved_findings") {
      return { ...evaluated, attemptStatus: "findings" }
    }
    return unavailable(evaluated.reason, evaluated.findings, waivers, evaluated)
  }
  return {
    ...evaluated,
    attemptStatus: evaluated.findings.length ? "findings" : "clean",
    reason: evaluated.findings.length ? "findings" : "clean",
  }
}

async function main() {
  const cwd = process.cwd()
  const branchDiff = process.argv.includes("--branch-diff")
  const owningSpecArg = argValue("--owning-spec")
  const timeoutMs = Number(
    argValue("--timeout-ms") ||
      process.env.CODERABBIT_REVIEW_TIMEOUT_MS ||
      DEFAULT_REVIEW_TIMEOUT_MS,
  )

  let owningSpec = owningSpecArg
  let base
  let scope
  if (branchDiff) {
    base = argValue("--base") || "origin/staging"
    owningSpec = owningSpecArg || null
    const paths = resolveBranchDiffPaths(cwd, base)
    const secrets = paths.filter(isSecretPath)
    if (secrets.length) fail("secret_path", { paths: secrets })
    scope = { ok: true, reviewablePaths: paths }
  } else {
    const workOrder = loadWorkOrder(argValue("--work-order"))
    owningSpec = owningSpecArg || workOrder.owningSpec
    if (!owningSpec) fail("missing_owning_spec")
    base =
      argValue("--base") || workOrder.base || currentBranch(cwd) || "staging"
    const dirty = dirtyPaths(cwd)
    scope = evaluateWorkOrder({
      dirtyPaths: dirty,
      expectedPaths: workOrder.expectedPaths,
    })
    if (!scope.ok) fail(scope.reason, { paths: scope.paths })
  }

  const beforeManifest = manifestFor(cwd, scope.reviewablePaths)
  const hashes = configHashes(cwd)
  const head = headFor(cwd)
  const branch = branchFor(cwd)

  const waivers = loadWaivers(defaultStateDir())
  let pinned = null
  let authCheck = null
  let evaluated
  if (!isTestMode() && !branchDiff) {
    evaluated = unavailable("cli_paused", [], waivers)
  } else if (branchDiff && !branchDiffBaseExists(cwd, base)) {
    evaluated = unavailable("missing_base", [], waivers)
  } else if (branchDiff && scope.reviewablePaths.length === 0) {
    evaluated = {
      attemptStatus: "clean",
      reason: "clean",
      findings: [],
      reviewedFiles: [],
    }
  } else {
    try {
      pinned = readPinnedAuth(cwd)
      authCheck = assertPinnedUsAuth({
        version: pinned.version,
        auth: pinned.auth,
      })
      if (!authCheck.ok) {
        evaluated = unavailable(authCheck.reason, [], waivers)
      } else {
        let jsonl = pinned.jsonl
        if (isTestMode()) {
          if (process.env.CODERABBIT_STUB_REVIEW_ERROR === "1") {
            evaluated = unavailable("error", [], waivers, {
              code: 1,
              stderr: "stubbed review process failure",
            })
          } else if (!jsonl) {
            evaluated = unavailable("missing_complete", [], waivers)
          }
        } else {
          const bin = pinned.bin || resolveCrBinary()
          const args = reviewCommandArgs({
            owningSpec,
            base,
            branchDiff,
          })
          const review = await runCr(bin, args, { timeoutMs, cwd })
          if (review.timedOut) {
            evaluated = unavailable("timeout", [], waivers)
          } else if (review.code !== 0) {
            const parsed = parseJsonl(review.stdout)
            const findings = parsed.events.filter(
              (event) => event.type === "finding",
            )
            evaluated = unavailable("error", findings, waivers, {
              stderr: review.stderr,
              code: review.code,
            })
          } else {
            jsonl = review.stdout
          }
        }
        if (!evaluated) {
          evaluated = evaluateAdvisoryJsonl(jsonl, {
            reviewablePaths: scope.reviewablePaths,
            base,
            waivers,
          })
        }
      }
    } catch (err) {
      evaluated = unavailable("error", [], waivers, { message: err.message })
    }
  }

  const afterManifest = manifestFor(cwd, scope.reviewablePaths, true)
  if (JSON.stringify(beforeManifest) !== JSON.stringify(afterManifest)) {
    fail("changed_bytes")
  }

  const receipt = buildReceipt({
    cliVersion: pinned?.version || PINNED_CLI_VERSION,
    region: authCheck?.region || pinned?.auth?.region || "unknown",
    attemptStatus: evaluated.attemptStatus,
    reason: evaluated.reason,
    branch,
    base,
    head,
    manifest: afterManifest,
    configHashes: hashes,
    reviewedFiles: evaluated.reviewedFiles,
    findings: evaluated.findings,
    blocking: evaluated.blocking,
    waived: evaluated.waived,
    nonBlocking: evaluated.nonBlocking,
    owningSpec,
  })
  saveReceipt(defaultStateDir(), receipt)
  const prior = loadPushRound(defaultStateDir())
  const priorRound = prior.branch === branch ? Number(prior.round) || 0 : 0
  const decision = branchDiff
    ? decidePushCliAction({
        attemptStatus: receipt.attemptStatus,
        findings: evaluated.findings,
        priorRound,
      })
    : null
  if (decision?.action === "route") {
    savePushRound(defaultStateDir(), {
      branch,
      head,
      round: priorRound + 1,
      findingIds: receipt.findingIds,
    })
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        attemptStatus: receipt.attemptStatus,
        reason: receipt.reason,
        reviewedFiles: receipt.reviewedFiles,
        findingIds: receipt.findingIds,
        yaml: YAML_REL,
        policy: POLICY_REL,
        ...(decision
          ? {
              action: decision.action,
              record: decision.record,
              leftover: decision.leftover || [],
              sddToTdd: decision.sddToTdd || [],
              capture: decision.capture || [],
              fixRound: priorRound,
            }
          : {}),
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

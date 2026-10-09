import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { after, describe, test } from "node:test"
import { tmpdir } from "node:os"
import {
  buildReceipt,
  configHashes,
  loadReceipt,
  receiptPath,
  saveReceipt,
} from "../hooks/lib/coderabbit-review-policy.mjs"

const ROOT = process.cwd()
const FIX = join(ROOT, ".cursor", "checks", "fixtures", "coderabbit")
const TMP_STATE = join(tmpdir(), `cr-gate-state-${process.pid}`)
const RECEIPT = receiptPath(TMP_STATE)
const TDD_STATE = join(ROOT, ".cursor", "hooks", "state", "tdd-guard.json")
const TDD_STATE_PRIOR = existsSync(TDD_STATE)
  ? readFileSync(TDD_STATE, "utf8")
  : null
const WORK_ORDER = join(FIX, "work-order.json")

mkdirSync(TMP_STATE, { recursive: true })

function restoreTdd() {
  if (TDD_STATE_PRIOR == null) {
    if (existsSync(TDD_STATE)) unlinkSync(TDD_STATE)
  } else {
    writeFileSync(TDD_STATE, TDD_STATE_PRIOR, "utf8")
  }
}

function childEnv(extra = {}) {
  return {
    ...process.env,
    CODERABBIT_STATE_DIR: TMP_STATE,
    ...extra,
  }
}

function runGuard(scriptName, payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, ".cursor", "hooks", scriptName)],
      { env: childEnv() },
    )
    let out = ""
    child.stdout.on("data", (d) => {
      out += d
    })
    child.on("close", (code) => resolve({ code, out }))
    child.on("error", reject)
    child.stdin.end(payload)
  })
}

function runBranchDiff(jsonlName, extraEnv = {}, extraArgs = []) {
  return spawnSync(
    process.execPath,
    [
      join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs"),
      "--branch-diff",
      "--base",
      extraEnv.CODERABBIT_STUB_BASE || "staging",
      ...extraArgs,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: childEnv({
        CODERABBIT_GATE_TEST: "1",
        CODERABBIT_STUB_BRANCH_DIFF: "lib/example.ts",
        CODERABBIT_STUB_HEAD: "deadbeef",
        CODERABBIT_STUB_BRANCH: "sdd/RES-1",
        CODERABBIT_STUB_MANIFEST: JSON.stringify({ "lib/example.ts": "abc" }),
        CODERABBIT_STUB_JSONL: join(FIX, jsonlName),
        ...extraEnv,
      }),
    },
  )
}

function runGate(jsonlName, extraEnv = {}) {
  writeFileSync(
    WORK_ORDER,
    JSON.stringify({
      owningSpec: "docs/specs/dev-toolchain.md",
      expectedPaths: ["lib/example.ts"],
      base: "staging",
    }),
    "utf8",
  )
  return spawnSync(
    process.execPath,
    [
      join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs"),
      "--owning-spec",
      "docs/specs/dev-toolchain.md",
      "--work-order",
      WORK_ORDER,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: childEnv({
        CODERABBIT_GATE_TEST: "1",
        CODERABBIT_STUB_DIRTY: "lib/example.ts",
        CODERABBIT_STUB_HEAD: "deadbeef",
        CODERABBIT_STUB_BRANCH: "sdd/RES-1",
        CODERABBIT_STUB_MANIFEST: JSON.stringify({ "lib/example.ts": "abc" }),
        CODERABBIT_STUB_JSONL: join(FIX, jsonlName),
        ...extraEnv,
      }),
    },
  )
}

describe("coderabbit local/remote CLI fixtures", { concurrency: 1 }, () => {
  after(() => {
    restoreTdd()
    if (existsSync(WORK_ORDER)) unlinkSync(WORK_ORDER)
    rmSync(TMP_STATE, { recursive: true, force: true })
  })

  test("clean JSONL fixture writes a US receipt", () => {
    const r = runGate("local-clean.jsonl")
    assert.equal(r.status, 0, r.stderr)
    const body = JSON.parse(r.stdout)
    assert.equal(body.ok, true)
    assert.equal(body.attemptStatus, "clean")
    assert.equal(body.reason, "clean")
    const receipt = loadReceipt(TMP_STATE)
    assert.equal(receipt.cliVersion, "0.9.0")
    assert.equal(receipt.region, "us")
    assert.equal(receipt.head, "deadbeef")
    assert.deepEqual(receipt.reviewedFiles, ["lib/example.ts"])
    assert.equal(receipt.attemptStatus, "clean")
    assert.equal(receipt.reason, "clean")
  })

  test("findings and unavailable review outcomes are advisory audit attempts", () => {
    for (const [file, reason, attemptStatus] of [
      ["local-critical.jsonl", "unresolved_findings", "findings"],
      ["local-major.jsonl", "unresolved_findings", "findings"],
      ["local-minor.jsonl", "unresolved_findings", "findings"],
      ["local-malformed.jsonl", "malformed_jsonl", "unavailable"],
      ["local-missing-complete.jsonl", "missing_complete", "unavailable"],
      [
        "local-reviewed-mismatch.jsonl",
        "reviewed_files_mismatch",
        "unavailable",
      ],
      ["local-rate-limit.jsonl", "rate_limited", "unavailable"],
      ["local-billing.jsonl", "billing", "unavailable"],
      ["local-skipped.jsonl", "review_skipped", "unavailable"],
      ["local-unknown-terminal.jsonl", "unknown_terminal", "unavailable"],
      ["local-error.jsonl", "error", "unavailable"],
      ["local-count-mismatch.jsonl", "finding_count_mismatch", "unavailable"],
      ["local-missing-context.jsonl", "missing_review_context", "unavailable"],
      ["local-scope-mismatch.jsonl", "scope_mismatch", "unavailable"],
    ]) {
      if (existsSync(RECEIPT)) unlinkSync(RECEIPT)
      const r = runGate(file)
      assert.equal(r.status, 0, `${file}: ${r.stderr}`)
      const body = JSON.parse(r.stdout)
      assert.equal(body.reason, reason, file)
      assert.equal(body.attemptStatus, attemptStatus, file)
      const receipt = loadReceipt(TMP_STATE)
      assert.equal(receipt.reason, reason, file)
      assert.equal(receipt.attemptStatus, attemptStatus, file)
      assert.deepEqual(receipt.attemptedFiles, ["lib/example.ts"], file)
      if (attemptStatus === "findings") {
        assert.equal(receipt.dispositions.blocking.length, 1, file)
        assert.match(
          receipt.dispositions.blocking[0].severity,
          /critical|major|minor/,
          file,
        )
      }
    }
  })

  test("non-blocking severity stays visible in advisory receipt metadata", () => {
    const r = runGate("local-trivial.jsonl")
    assert.equal(r.status, 0, r.stderr)
    const receipt = loadReceipt(TMP_STATE)
    assert.equal(receipt.attemptStatus, "findings")
    assert.equal(receipt.reason, "findings")
    assert.equal(receipt.dispositions.blocking.length, 0)
    assert.equal(receipt.dispositions.nonBlocking.length, 1)
    assert.equal(receipt.dispositions.nonBlocking[0].severity, "trivial")
  })

  test("unrelated dirt and secrets stop before review", () => {
    const dirt = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_DIRTY: "lib/example.ts,notes.md",
    })
    assert.notEqual(dirt.status, 0)
    assert.equal(JSON.parse(dirt.stderr).reason, "unrelated_dirt")
    const secret = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_DIRTY: ".env",
    })
    assert.notEqual(secret.status, 0)
    assert.equal(JSON.parse(secret.stderr).reason, "secret_path")
  })

  test("missing or malformed work orders and empty surfaces fail hard", () => {
    const gate = join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs")
    const missing = spawnSync(
      process.execPath,
      [
        gate,
        "--owning-spec",
        "docs/specs/dev-toolchain.md",
        "--work-order",
        join(FIX, "missing-work-order.json"),
      ],
      { cwd: ROOT, encoding: "utf8", env: childEnv() },
    )
    assert.notEqual(missing.status, 0)
    assert.equal(JSON.parse(missing.stderr).reason, "missing_work_order")

    writeFileSync(WORK_ORDER, "{", "utf8")
    const malformed = spawnSync(
      process.execPath,
      [
        gate,
        "--owning-spec",
        "docs/specs/dev-toolchain.md",
        "--work-order",
        WORK_ORDER,
      ],
      { cwd: ROOT, encoding: "utf8", env: childEnv() },
    )
    assert.notEqual(malformed.status, 0)
    assert.equal(JSON.parse(malformed.stderr).reason, "malformed_work_order")

    const empty = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_DIRTY: "",
    })
    assert.notEqual(empty.status, 0)
    assert.equal(JSON.parse(empty.stderr).reason, "no_reviewable_paths")
  })

  test("authentication and setup failures are advisory unavailable attempts", () => {
    const ver = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_VERSION: "0.7.5",
    })
    assert.equal(ver.status, 0, ver.stderr)
    assert.equal(JSON.parse(ver.stdout).reason, "version_mismatch")
    assert.equal(loadReceipt(TMP_STATE).attemptStatus, "unavailable")
    const region = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_AUTH: JSON.stringify({
        authenticated: true,
        region: "other",
      }),
    })
    assert.equal(region.status, 0, region.stderr)
    assert.equal(JSON.parse(region.stdout).reason, "region_mismatch")
    assert.equal(loadReceipt(TMP_STATE).attemptStatus, "unavailable")
  })

  test("review process failures are advisory unavailable attempts", () => {
    const failed = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_REVIEW_ERROR: "1",
    })
    assert.equal(failed.status, 0, failed.stderr)
    assert.equal(JSON.parse(failed.stdout).reason, "error")
    assert.equal(loadReceipt(TMP_STATE).attemptStatus, "unavailable")
  })

  test("changed dirty bytes after an attempted review still fail hard", () => {
    if (existsSync(RECEIPT)) unlinkSync(RECEIPT)
    const changed = runGate("local-major.jsonl", {
      CODERABBIT_STUB_AFTER_MANIFEST: JSON.stringify({
        "lib/example.ts": "changed",
      }),
    })
    assert.notEqual(changed.status, 0)
    assert.equal(JSON.parse(changed.stderr).reason, "changed_bytes")
    assert.equal(existsSync(RECEIPT), false)
  })

  test("branch-diff mode reviews origin/staging and routes one fix round", () => {
    const gateSrc = readFileSync(
      join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs"),
      "utf8",
    )
    assert.match(gateSrc, /--branch-diff/)
    assert.match(gateSrc, /origin\/staging/)
    assert.match(gateSrc, /shouldReinstallCli/)
    assert.match(gateSrc, /cloud-install-coderabbit\.sh/)
    const clean = runBranchDiff("local-clean.jsonl")
    assert.equal(clean.status, 0, clean.stderr)
    const cleanBody = JSON.parse(clean.stdout)
    assert.equal(cleanBody.ok, true)
    assert.equal(cleanBody.attemptStatus, "clean")
    assert.equal(cleanBody.action, "push")

    const critical = runBranchDiff("local-critical.jsonl")
    assert.equal(critical.status, 0, critical.stderr)
    const criticalBody = JSON.parse(critical.stdout)
    assert.equal(criticalBody.attemptStatus, "findings")
    assert.equal(criticalBody.action, "route")
    assert.equal(criticalBody.sddToTdd[0].command, "/sdd-to-tdd")

    const again = runBranchDiff("local-critical.jsonl")
    assert.equal(again.status, 0, again.stderr)
    const againBody = JSON.parse(again.stdout)
    assert.equal(againBody.action, "push")
    assert.equal(againBody.record, "leftover_after_fix_round")

    const missingBase = runBranchDiff("local-clean.jsonl", {
      CODERABBIT_STUB_MISSING_BASE: "1",
    })
    assert.equal(missingBase.status, 0, missingBase.stderr)
    const missingBody = JSON.parse(missingBase.stdout)
    assert.equal(missingBody.attemptStatus, "unavailable")
    assert.equal(missingBody.reason, "missing_base")
    assert.equal(missingBody.action, "push")

    const empty = runBranchDiff("local-clean.jsonl", {
      CODERABBIT_STUB_BRANCH_DIFF: "",
    })
    assert.equal(empty.status, 0, empty.stderr)
    const emptyBody = JSON.parse(empty.stdout)
    assert.equal(emptyBody.attemptStatus, "clean")
    assert.equal(emptyBody.action, "push")

    const failedDiff = runBranchDiff("local-clean.jsonl", {
      CODERABBIT_STUB_DIFF_FAILED: "1",
    })
    assert.equal(failedDiff.status, 0, failedDiff.stderr)
    const failedBody = JSON.parse(failedDiff.stdout)
    assert.equal(failedBody.attemptStatus, "unavailable")
    assert.equal(failedBody.reason, "diff_failed")
    assert.equal(failedBody.action, "push")

    const newHead = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "cafebabe",
    })
    assert.equal(newHead.status, 0, newHead.stderr)
    const newHeadBody = JSON.parse(newHead.stdout)
    assert.equal(newHeadBody.action, "push")
    assert.equal(newHeadBody.record, "leftover_after_fix_round")
  })

  test("route prints started fixRound and isolated second run uses that output", () => {
    const firstDir = join(tmpdir(), `cr-gate-print-${process.pid}`)
    mkdirSync(firstDir, { recursive: true })
    const first = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "print-base",
      CODERABBIT_STATE_DIR: firstDir,
    })
    assert.equal(first.status, 0, first.stderr)
    const firstBody = JSON.parse(first.stdout)
    assert.equal(firstBody.action, "route")
    assert.equal(firstBody.record, "fix_round")
    assert.equal(firstBody.fixRound, 1)

    const isolated = join(tmpdir(), `cr-gate-print-iso-${process.pid}`)
    mkdirSync(isolated, { recursive: true })
    const second = runBranchDiff(
      "local-critical.jsonl",
      {
        CODERABBIT_STUB_HEAD: "print-fixed",
        CODERABBIT_STATE_DIR: isolated,
      },
      ["--fix-round", String(firstBody.fixRound)],
    )
    assert.equal(second.status, 0, second.stderr)
    const body = JSON.parse(second.stdout)
    assert.equal(body.action, "push")
    assert.equal(body.record, "leftover_after_fix_round")
  })

  test("completed push clears the saved fix round for a later independent review", () => {
    const dir = join(tmpdir(), `cr-gate-clear-${process.pid}`)
    mkdirSync(dir, { recursive: true })
    const first = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "clear-aaa",
      CODERABBIT_STATE_DIR: dir,
    })
    assert.equal(first.status, 0, first.stderr)
    assert.equal(JSON.parse(first.stdout).action, "route")

    const leftover = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "clear-bbb",
      CODERABBIT_STATE_DIR: dir,
    })
    assert.equal(leftover.status, 0, leftover.stderr)
    assert.equal(JSON.parse(leftover.stdout).record, "leftover_after_fix_round")

    const retry = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "clear-retry",
      CODERABBIT_STATE_DIR: dir,
    })
    assert.equal(retry.status, 0, retry.stderr)
    assert.equal(JSON.parse(retry.stdout).record, "leftover_after_fix_round")

    const ack = spawnSync(
      process.execPath,
      [join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs"), "--ack-push"],
      { encoding: "utf8", env: childEnv({ CODERABBIT_STATE_DIR: dir }) },
    )
    assert.equal(ack.status, 0, ack.stderr)
    assert.equal(JSON.parse(ack.stdout).action, "ack-push")

    const later = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "clear-ccc",
      CODERABBIT_STATE_DIR: dir,
    })
    assert.equal(later.status, 0, later.stderr)
    const laterBody = JSON.parse(later.stdout)
    assert.equal(laterBody.action, "route")
    assert.equal(laterBody.fixRound, 1)

    const gateSrc = readFileSync(
      join(ROOT, ".cursor", "checks", "coderabbit-gate.mjs"),
      "utf8",
    )
    assert.match(gateSrc, /timeout: timeoutMs/)
    assert.match(gateSrc, /auth", "status", "--agent"/)
    const pushMd = readFileSync(
      join(ROOT, ".cursor", "commands", "push.md"),
      "utf8",
    )
    assert.match(pushMd, /--ack-push/)
  })

  test(
    "runCr times out on continuous stdout at the absolute deadline",
    { timeout: 5_000 },
    async () => {
      const { runCr } = await import("./coderabbit-gate.mjs")
      const started = Date.now()
      const result = await runCr(
        process.execPath,
        ["-e", "setInterval(() => process.stdout.write('tick\\n'), 20)"],
        { timeoutMs: 400, cwd: ROOT },
      )
      const elapsed = Date.now() - started
      assert.equal(result.timedOut, true)
      assert.ok(elapsed < 2500, `elapsed ${elapsed}`)
    },
  )

  test("route then new head is leftover after one fix round", () => {
    const first = runBranchDiff("local-critical.jsonl", {
      CODERABBIT_STUB_HEAD: "round-base",
      CODERABBIT_STATE_DIR: join(TMP_STATE, "cycle"),
    })
    assert.equal(first.status, 0, first.stderr)
    assert.equal(JSON.parse(first.stdout).action, "route")

    const isolated = join(tmpdir(), `cr-gate-cycle-${process.pid}`)
    mkdirSync(isolated, { recursive: true })
    const second = runBranchDiff(
      "local-critical.jsonl",
      {
        CODERABBIT_STUB_HEAD: "round-fixed",
        CODERABBIT_STATE_DIR: isolated,
      },
      ["--fix-round", "1"],
    )
    assert.equal(second.status, 0, second.stderr)
    const body = JSON.parse(second.stdout)
    assert.equal(body.action, "push")
    assert.equal(body.record, "leftover_after_fix_round")
  })

  test("branch-diff secret_path is advisory and .env.example is not a secret", () => {
    const secret = runBranchDiff("local-clean.jsonl", {
      CODERABBIT_STUB_BRANCH_DIFF: ".env",
    })
    assert.equal(secret.status, 0, secret.stderr)
    const secretBody = JSON.parse(secret.stdout)
    assert.equal(secretBody.attemptStatus, "unavailable")
    assert.equal(secretBody.reason, "secret_path")
    assert.equal(secretBody.action, "push")

    const example = runBranchDiff("local-clean.jsonl", {
      CODERABBIT_STUB_BRANCH_DIFF: ".env.example",
    })
    assert.equal(example.status, 0, example.stderr)
    const exampleBody = JSON.parse(example.stdout)
    assert.notEqual(exampleBody.reason, "secret_path")
  })

  test("pr-gate snapshots: clean and no-formal-review pass; rate-limit fails", () => {
    const adapter = join(ROOT, ".cursor", "checks", "coderabbit-pr-gate.mjs")
    const clean = spawnSync(
      process.execPath,
      [adapter, "--snapshot", join(FIX, "remote-clean.json")],
      { encoding: "utf8" },
    )
    assert.equal(clean.status, 0, clean.stderr)
    assert.equal(JSON.parse(clean.stdout).ok, true)
    const pending = spawnSync(
      process.execPath,
      [adapter, "--snapshot", join(FIX, "remote-pending.json")],
      { encoding: "utf8" },
    )
    assert.equal(pending.status, 0, pending.stderr)
    const pendingVerdict = JSON.parse(pending.stdout)
    assert.equal(pendingVerdict.ok, true)
    assert.equal(pendingVerdict.reason, "ready_no_coderabbit_review")
    const inProgress = spawnSync(
      process.execPath,
      [
        adapter,
        "--snapshot",
        join(FIX, "remote-review-in-progress-check.json"),
        "--allow-draft",
      ],
      { encoding: "utf8" },
    )
    assert.notEqual(inProgress.status, 0)
    assert.equal(JSON.parse(inProgress.stderr).reason, "review_in_progress")
    const limited = spawnSync(
      process.execPath,
      [adapter, "--snapshot", join(FIX, "remote-rate-limit.json")],
      { encoding: "utf8" },
    )
    assert.equal(JSON.parse(limited.stderr).reason, "rate_limited")
    const promotion = spawnSync(
      process.execPath,
      [
        adapter,
        "--snapshot",
        join(FIX, "remote-feature.json"),
        "--promotion-only",
      ],
      { encoding: "utf8" },
    )
    assert.notEqual(promotion.status, 0)
    assert.equal(JSON.parse(promotion.stderr).reason, "wrong_base_head")
    const feature = spawnSync(
      process.execPath,
      [adapter, "--snapshot", join(FIX, "remote-feature.json")],
      { encoding: "utf8" },
    )
    assert.equal(feature.status, 0, feature.stderr)
  })

  test("loop snapshot of exempt plan plus body minor is capture_only_findings", () => {
    const adapter = join(ROOT, ".cursor", "checks", "coderabbit-pr-gate.mjs")
    const snapshot = join(FIX, "remote-loop-exempt-plan-body-minor.json")
    const looped = spawnSync(
      process.execPath,
      [adapter, "--snapshot", snapshot, "--allow-draft", "--loop"],
      { encoding: "utf8" },
    )
    assert.equal(looped.status, 0, looped.stderr)
    const verdict = JSON.parse(looped.stdout)
    assert.equal(verdict.ok, true)
    assert.equal(verdict.reason, "capture_only_findings")
    const plain = spawnSync(
      process.execPath,
      [adapter, "--snapshot", snapshot, "--allow-draft"],
      { encoding: "utf8" },
    )
    assert.notEqual(plain.status, 0)
    assert.equal(JSON.parse(plain.stderr).reason, "changes_requested")
  })
})

const GIT_COMMIT = JSON.stringify({
  tool_name: "Shell",
  tool_input: { command: "git commit -m msg" },
})

describe("coderabbit commit-gate spawn-level", { concurrency: 1 }, () => {
  after(() => {
    restoreTdd()
    rmSync(TMP_STATE, { recursive: true, force: true })
    mkdirSync(TMP_STATE, { recursive: true })
  })

  test("gate open succeeds without a receipt after commit checks pass", () => {
    if (existsSync(RECEIPT)) unlinkSync(RECEIPT)
    writeFileSync(
      TDD_STATE,
      JSON.stringify({ armed: false, depth: 0, phase: null, loopRan: true }),
      "utf8",
    )
    const r = spawnSync(
      process.execPath,
      [join(ROOT, ".cursor", "hooks", "tdd-guard.mjs"), "gate", "open"],
      { cwd: ROOT, encoding: "utf8", env: childEnv() },
    )
    assert.equal(r.status, 0, r.stderr)
    assert.equal(JSON.parse(readFileSync(TDD_STATE, "utf8")).loopRan, false)
  })

  test("gate open succeeds with a stale audit receipt without rebinding it", () => {
    const manifest = { "lib/example.ts": "abc" }
    const receipt = {
      ...buildReceipt({
        branch: "sdd/RES-1",
        base: "staging",
        head: "older",
        manifest: { "lib/example.ts": "older" },
        configHashes: configHashes(ROOT),
        reviewedFiles: ["lib/example.ts"],
      }),
      gateOpened: true,
      gateOpenedAt: "2026-01-01T00:00:00.000Z",
    }
    saveReceipt(TMP_STATE, receipt)
    const r = spawnSync(
      process.execPath,
      [join(ROOT, ".cursor", "hooks", "tdd-guard.mjs"), "gate", "open"],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: childEnv({
          CODERABBIT_STUB_DIRTY: "lib/example.ts",
          CODERABBIT_STUB_HEAD: "deadbeef",
          CODERABBIT_STUB_MANIFEST: JSON.stringify(manifest),
        }),
      },
    )
    assert.equal(r.status, 0, r.stderr)
    assert.deepEqual(loadReceipt(TMP_STATE), receipt)
  })

  test("an old opened receipt cannot ghost-block a later git commit", async () => {
    writeFileSync(
      TDD_STATE,
      JSON.stringify(
        {
          armed: false,
          depth: 0,
          phase: null,
          loopRan: false,
          commitExempt: null,
        },
        null,
        2,
      ),
      "utf8",
    )
    saveReceipt(TMP_STATE, {
      ...buildReceipt({
        branch: "sdd/RES-1",
        base: "staging",
        head: "deadbeef",
        manifest: { "nope.ts": "x" },
        configHashes: configHashes(ROOT),
        reviewedFiles: ["nope.ts"],
      }),
      gateOpened: true,
    })
    const { code, out } = await runGuard(
      "git-stage-guard.mjs",
      `\uFEFF${GIT_COMMIT}`,
    )
    assert.equal(code, 0, out)
    assert.deepEqual(JSON.parse(out), {})
  })
})

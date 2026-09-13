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
  currentHead,
  hashStagedContents,
  loadReceipt,
  receiptPath,
  saveReceipt,
  stagedPathsFromGit,
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
    const receipt = loadReceipt(TMP_STATE)
    assert.equal(receipt.cliVersion, "0.7.6")
    assert.equal(receipt.region, "us")
    assert.equal(receipt.head, "deadbeef")
    assert.deepEqual(receipt.reviewedFiles, ["lib/example.ts"])
    assert.equal(receipt.gateOpened, false)
  })

  test("blocking and terminal fixtures fail closed", () => {
    for (const [file, reason] of [
      ["local-critical.jsonl", "unresolved_findings"],
      ["local-major.jsonl", "unresolved_findings"],
      ["local-minor.jsonl", "unresolved_findings"],
      ["local-malformed.jsonl", "malformed_jsonl"],
      ["local-missing-complete.jsonl", "missing_complete"],
      ["local-reviewed-mismatch.jsonl", "reviewed_files_mismatch"],
      ["local-rate-limit.jsonl", "rate_limited"],
      ["local-billing.jsonl", "billing"],
      ["local-skipped.jsonl", "review_skipped"],
      ["local-unknown-terminal.jsonl", "unknown_terminal"],
      ["local-error.jsonl", "error"],
      ["local-count-mismatch.jsonl", "finding_count_mismatch"],
      ["local-missing-context.jsonl", "missing_review_context"],
      ["local-scope-mismatch.jsonl", "scope_mismatch"],
    ]) {
      const r = runGate(file)
      assert.notEqual(r.status, 0, file)
      const body = JSON.parse(r.stderr)
      assert.equal(body.reason, reason, file)
    }
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

  test("version and region mismatch fail closed", () => {
    const ver = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_VERSION: "0.7.5",
    })
    assert.equal(JSON.parse(ver.stderr).reason, "version_mismatch")
    const region = runGate("local-clean.jsonl", {
      CODERABBIT_STUB_AUTH: JSON.stringify({
        authenticated: true,
        region: "eu",
      }),
    })
    assert.equal(JSON.parse(region.stderr).reason, "region_mismatch")
  })

  test("pr-gate snapshots: clean passes, pending/rate-limit fail", () => {
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
    assert.notEqual(pending.status, 0)
    assert.equal(JSON.parse(pending.stderr).reason, "pending")
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

  test("gate open is denied without a matching receipt", () => {
    if (existsSync(RECEIPT)) unlinkSync(RECEIPT)
    const r = spawnSync(
      process.execPath,
      [join(ROOT, ".cursor", "hooks", "tdd-guard.mjs"), "gate", "open"],
      { cwd: ROOT, encoding: "utf8", env: childEnv() },
    )
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /gate open denied/)
  })

  test("gate open is allowed with a matching dirty-tree receipt", () => {
    const manifest = { "lib/example.ts": "abc" }
    const receipt = buildReceipt({
      branch: "sdd/RES-1",
      base: "staging",
      head: "deadbeef",
      manifest,
      configHashes: configHashes(ROOT),
      reviewedFiles: ["lib/example.ts"],
    })
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
    assert.equal(loadReceipt(TMP_STATE).gateOpened, true)
  })

  test("git-stage-guard denies a BOM-prefixed git commit without a matching receipt", async () => {
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
    assert.equal(code, 0)
    assert.equal(JSON.parse(out).permission, "deny")
    assert.match(JSON.parse(out).user_message, /CodeRabbit receipt/)
  })

  test("git-stage-guard allows a BOM-prefixed git commit with a matching receipt", async () => {
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
    const staged = stagedPathsFromGit(ROOT)
    saveReceipt(TMP_STATE, {
      ...buildReceipt({
        branch: "sdd/RES-1",
        base: "staging",
        head: currentHead(ROOT),
        manifest: hashStagedContents(ROOT, staged),
        configHashes: configHashes(ROOT),
        reviewedFiles: staged,
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

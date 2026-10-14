import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { test } from "node:test"
import {
  LOCK_MAX_AGE_MS,
  LOCK_STALE_MS,
  RESERVATION_TTL_MS,
  TASK_FANOUT_INFLIGHT_CAP,
  applyReservationMutation,
  inflightCount,
  onSubagentStart,
  onSubagentStop,
  onTaskFailure,
  processStartTime,
  pruneExpired,
  reclaimStaleLock,
  reservationLockWrite,
  tryReserve,
  unlinkLockIfOwner,
} from "../hooks/lib/task-fanout-policy.mjs"

const procStartAvailable =
  existsSync("/proc") && processStartTime(process.pid) != null

const hooks = JSON.parse(
  readFileSync(join(process.cwd(), ".cursor", "hooks.json"), "utf8"),
)

function hookByCommand(event, needle) {
  return (hooks.hooks[event] || []).find((h) => h.command.includes(needle))
}

const NOW = 1_000_000

function fillPending(n, ts = NOW) {
  return Array.from({ length: n }, () => ({ status: "pending", ts }))
}

test("task-fanout guard is fail-open on Task preToolUse with matcher Task", () => {
  const pre = hookByCommand("preToolUse", "task-fanout-guard.mjs")
  assert.ok(pre, "task-fanout-guard is registered on preToolUse")
  assert.equal(pre.failClosed, false)
  assert.equal(pre.matcher, "Task")
})

test("task-fanout guard decrements on Task postToolUseFailure and subagent start/stop", () => {
  const fail = hookByCommand("postToolUseFailure", "task-fanout-guard.mjs")
  const start = hookByCommand("subagentStart", "task-fanout-guard.mjs")
  const stop = hookByCommand("subagentStop", "task-fanout-guard.mjs")
  assert.ok(fail, "task-fanout-guard is registered on postToolUseFailure")
  assert.match(fail.command, /--failure/)
  assert.equal(fail.failClosed, false)
  assert.ok(start, "task-fanout-guard is registered on subagentStart")
  assert.match(start.command, /\bstart$/)
  assert.ok(stop, "task-fanout-guard is registered on subagentStop")
  assert.match(stop.command, /\bstop$/)
})

test("tryReserve allows up to the cap and denies the next", () => {
  const almost = fillPending(TASK_FANOUT_INFLIGHT_CAP - 1)
  const allowed = tryReserve(almost, NOW)
  assert.equal(allowed.deny, false)
  assert.equal(allowed.reservations.length, TASK_FANOUT_INFLIGHT_CAP)
  assert.equal(allowed.reservations.at(-1).status, "pending")

  const denied = tryReserve(allowed.reservations, NOW)
  assert.equal(denied.deny, true)
  assert.equal(denied.reservations.length, TASK_FANOUT_INFLIGHT_CAP)
})

test("converting pending to running does not free a slot", () => {
  let state = fillPending(TASK_FANOUT_INFLIGHT_CAP)
  for (let i = 0; i < TASK_FANOUT_INFLIGHT_CAP; i++)
    state = onSubagentStart(state, NOW)
  assert.equal(inflightCount(state, NOW), TASK_FANOUT_INFLIGHT_CAP)
  assert.ok(state.every((r) => r.status === "running"))
  assert.equal(tryReserve(state, NOW).deny, true)
})

test("subagentStop and Task failure free a slot", () => {
  const running = onSubagentStart(fillPending(TASK_FANOUT_INFLIGHT_CAP), NOW)
  const afterStop = onSubagentStop(running, NOW)
  assert.equal(afterStop.length, TASK_FANOUT_INFLIGHT_CAP - 1)
  assert.equal(tryReserve(afterStop, NOW).deny, false)

  const pending = fillPending(TASK_FANOUT_INFLIGHT_CAP)
  const afterFail = onTaskFailure(pending, NOW)
  assert.equal(afterFail.length, TASK_FANOUT_INFLIGHT_CAP - 1)
  assert.equal(tryReserve(afterFail, NOW).deny, false)
})

test("TTL prune drops stale reservations so a new Task is allowed", () => {
  const stale = fillPending(TASK_FANOUT_INFLIGHT_CAP, NOW - RESERVATION_TTL_MS)
  assert.equal(pruneExpired(stale, NOW).length, 0)
  const allowed = tryReserve(stale, NOW)
  assert.equal(allowed.deny, false)
  assert.equal(allowed.reservations.length, 1)

  const fresh = fillPending(
    TASK_FANOUT_INFLIGHT_CAP,
    NOW - RESERVATION_TTL_MS + 1,
  )
  assert.equal(tryReserve(fresh, NOW).deny, true)
})

test("exclusive lock serializes reservation RMW across processes", async () => {
  assert.equal(typeof applyReservationMutation, "function")
  const dir = mkdtempSync(join(tmpdir(), "fanout-lock-"))
  const statePath = join(dir, "task-fanout.json")
  writeFileSync(statePath, JSON.stringify({ reservations: [] }), "utf8")
  const policy = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "hooks",
    "lib",
    "task-fanout-policy.mjs",
  )
  const specifier = pathToFileURL(policy).href
  assert.match(specifier, /^file:/)
  const workers = TASK_FANOUT_INFLIGHT_CAP + 8
  const results = await Promise.all(
    Array.from({ length: workers }, () =>
      new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `import { applyReservationMutation, tryReserve } from ${JSON.stringify(specifier)}; const r = applyReservationMutation((cur) => tryReserve(cur)); process.stdout.write(JSON.stringify({ deny: r.deny, n: r.reservations.length }))`,
          ],
          {
            env: {
              ...process.env,
              TASK_FANOUT_STATE: statePath,
              TASK_FANOUT_LOCK_WAIT_MS: "2000",
            },
          },
        )
        let out = ""
        let err = ""
        child.stdout.on("data", (d) => {
          out += d
        })
        child.stderr.on("data", (d) => {
          err += d
        })
        child.on("close", (code) => resolve({ code, out, err }))
        child.on("error", reject)
      }),
    ),
  )
  try {
    assert.ok(
      results.every((r) => r.code === 0),
      results
        .filter((r) => r.code !== 0)
        .map((r) => r.err || r.out)
        .join("\n"),
    )
    const denied = results.filter((r) => JSON.parse(r.out).deny === true).length
    const allowed = results.length - denied
    const saved = JSON.parse(readFileSync(statePath, "utf8"))
    const live = Array.isArray(saved.reservations) ? saved.reservations : []
    assert.equal(allowed, TASK_FANOUT_INFLIGHT_CAP)
    assert.equal(denied, workers - TASK_FANOUT_INFLIGHT_CAP)
    assert.equal(live.length, TASK_FANOUT_INFLIGHT_CAP)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

function lockRecord(pid, startTime) {
  return `${pid}\n${startTime}\n`
}

function spawnReserve(specifier, statePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import { applyReservationMutation, tryReserve } from ${JSON.stringify(specifier)}; const r = applyReservationMutation((cur) => tryReserve(cur)); process.stdout.write(JSON.stringify({ deny: r.deny, n: r.reservations?.length }))`,
      ],
      {
        env: {
          ...process.env,
          TASK_FANOUT_STATE: statePath,
          TASK_FANOUT_LOCK_WAIT_MS: "2000",
        },
      },
    )
    let out = ""
    let err = ""
    child.stdout.on("data", (d) => {
      out += d
    })
    child.stderr.on("data", (d) => {
      err += d
    })
    child.on("close", (code) => resolve({ code, out, err }))
    child.on("error", reject)
  })
}

test(
  "stale-lock reclaim leaves a live owner and removes a dead one",
  {
    skip: procStartAvailable
      ? false
      : "/proc or processStartTime unavailable",
  },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "fanout-stale-"))
    const livePath = join(dir, "live.lock")
    const deadPath = join(dir, "dead.lock")
    const start = processStartTime(process.pid)
    assert.ok(start, "processStartTime must read /proc startTime")
    writeFileSync(livePath, lockRecord(process.pid, start), "utf8")
    writeFileSync(deadPath, lockRecord(999999999, "1"), "utf8")
    const past = new Date(Date.now() - LOCK_STALE_MS - 1000)
    utimesSync(livePath, past, past)
    utimesSync(deadPath, past, past)
    try {
      assert.equal(reclaimStaleLock(livePath), false)
      assert.equal(existsSync(livePath), true)
      assert.equal(reclaimStaleLock(deadPath), true)
      assert.equal(existsSync(deadPath), false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  },
)

test(
  "reclaimStaleLock does not steal a live holder with real startTime",
  {
    skip: procStartAvailable
      ? false
      : "/proc or processStartTime unavailable",
  },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "fanout-live-hold-"))
    const lockPath = join(dir, "live.lock")
    const start = processStartTime(process.pid)
    assert.ok(start, "processStartTime must read /proc startTime")
    writeFileSync(lockPath, lockRecord(process.pid, start), "utf8")
    const past = new Date(Date.now() - LOCK_STALE_MS - 1000)
    utimesSync(lockPath, past, past)
    try {
      assert.equal(reclaimStaleLock(lockPath), false)
      assert.equal(existsSync(lockPath), true)
      assert.equal(readFileSync(lockPath, "utf8"), lockRecord(process.pid, start))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  },
)

test("reclaimStaleLock reclaims a dead pid after stale mtime", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-dead-"))
  const lockPath = join(dir, "dead.lock")
  writeFileSync(lockPath, lockRecord(999999999, "1"), "utf8")
  const past = new Date(Date.now() - LOCK_STALE_MS - 1000)
  utimesSync(lockPath, past, past)
  try {
    assert.equal(reclaimStaleLock(lockPath), true)
    assert.equal(existsSync(lockPath), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("ambiguous owner younger than max age is not reclaimed", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-ambig-young-"))
  const missingPath = join(dir, "missing.lock")
  const wrongPath = join(dir, "wrong.lock")
  writeFileSync(missingPath, `${process.pid}\n`, "utf8")
  writeFileSync(wrongPath, lockRecord(process.pid, "not-a-start"), "utf8")
  const past = new Date(Date.now() - LOCK_STALE_MS - 1000)
  utimesSync(missingPath, past, past)
  utimesSync(wrongPath, past, past)
  try {
    assert.ok(LOCK_MAX_AGE_MS > LOCK_STALE_MS)
    assert.equal(reclaimStaleLock(missingPath), false)
    assert.equal(existsSync(missingPath), true)
    assert.equal(reclaimStaleLock(wrongPath), false)
    assert.equal(existsSync(wrongPath), true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("ambiguous owner older than LOCK_MAX_AGE_MS is reclaimed", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-ambig-old-"))
  const missingPath = join(dir, "missing.lock")
  const wrongPath = join(dir, "wrong.lock")
  writeFileSync(missingPath, `${process.pid}\n`, "utf8")
  writeFileSync(wrongPath, lockRecord(process.pid, "not-a-start"), "utf8")
  const past = new Date(Date.now() - LOCK_MAX_AGE_MS - 1000)
  utimesSync(missingPath, past, past)
  utimesSync(wrongPath, past, past)
  try {
    assert.equal(reclaimStaleLock(missingPath), true)
    assert.equal(existsSync(missingPath), false)
    assert.equal(reclaimStaleLock(wrongPath), true)
    assert.equal(existsSync(wrongPath), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("two real concurrent holders then more racers cannot exceed the cap", async () => {
  assert.equal(typeof applyReservationMutation, "function")
  const dir = mkdtempSync(join(tmpdir(), "fanout-two-hold-"))
  const statePath = join(dir, "task-fanout.json")
  writeFileSync(statePath, JSON.stringify({ reservations: [] }), "utf8")
  const policy = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "hooks",
    "lib",
    "task-fanout-policy.mjs",
  )
  const specifier = pathToFileURL(policy).href
  const extra = TASK_FANOUT_INFLIGHT_CAP + 8
  try {
    const firstTwo = await Promise.all([
      spawnReserve(specifier, statePath),
      spawnReserve(specifier, statePath),
    ])
    assert.ok(
      firstTwo.every((r) => r.code === 0),
      firstTwo
        .filter((r) => r.code !== 0)
        .map((r) => r.err || r.out)
        .join("\n"),
    )
    const firstAllowed = firstTwo.filter(
      (r) => JSON.parse(r.out).deny !== true,
    ).length
    assert.equal(firstAllowed, 2)
    const more = await Promise.all(
      Array.from({ length: extra }, () => spawnReserve(specifier, statePath)),
    )
    assert.ok(
      more.every((r) => r.code === 0),
      more
        .filter((r) => r.code !== 0)
        .map((r) => r.err || r.out)
        .join("\n"),
    )
    const all = [...firstTwo, ...more]
    const allowed = all.filter((r) => JSON.parse(r.out).deny !== true).length
    const saved = JSON.parse(readFileSync(statePath, "utf8"))
    const live = Array.isArray(saved.reservations) ? saved.reservations : []
    assert.equal(allowed, Math.min(2 + extra, TASK_FANOUT_INFLIGHT_CAP))
    assert.equal(live.length, TASK_FANOUT_INFLIGHT_CAP)
    assert.ok(live.length <= TASK_FANOUT_INFLIGHT_CAP)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("lock release does not delete a replacement owner token", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-release-"))
  const statePath = join(dir, "task-fanout.json")
  const lockPath = `${statePath}.lock`
  writeFileSync(statePath, JSON.stringify({ reservations: [] }), "utf8")
  const prevState = process.env.TASK_FANOUT_STATE
  process.env.TASK_FANOUT_STATE = statePath
  try {
    applyReservationMutation((cur) => {
      writeFileSync(lockPath, "replacement-token\n")
      return tryReserve(cur)
    })
    assert.equal(existsSync(lockPath), true)
    assert.equal(readFileSync(lockPath, "utf8"), "replacement-token\n")
  } finally {
    if (prevState === undefined) delete process.env.TASK_FANOUT_STATE
    else process.env.TASK_FANOUT_STATE = prevState
    rmSync(dir, { recursive: true, force: true })
  }
})

test("unlinkLockIfOwner restores a replaced lock instead of stealing it", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-owner-"))
  const lockPath = join(dir, "owner.lock")
  writeFileSync(lockPath, "replacement-token\n", "utf8")
  try {
    assert.equal(unlinkLockIfOwner(lockPath, "999999999\n"), false)
    assert.equal(readFileSync(lockPath, "utf8"), "replacement-token\n")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("lock-wait timeout denies without mutating reservations", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-wait-"))
  const statePath = join(dir, "task-fanout.json")
  const reservations = [{ status: "pending", ts: Date.now() }]
  writeFileSync(statePath, JSON.stringify({ reservations }), "utf8")
  writeFileSync(
    `${statePath}.lock`,
    lockRecord(process.pid, processStartTime(process.pid)),
    "utf8",
  )
  const policy = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "hooks",
    "lib",
    "task-fanout-policy.mjs",
  )
  const specifier = pathToFileURL(policy).href
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { applyReservationMutation, tryReserve } from ${JSON.stringify(specifier)}; const r = applyReservationMutation((cur) => tryReserve(cur)); process.stdout.write(JSON.stringify(r))`,
        ],
        {
          env: {
            ...process.env,
            TASK_FANOUT_STATE: statePath,
            TASK_FANOUT_LOCK_WAIT_MS: "0",
          },
        },
      )
      let out = ""
      let err = ""
      child.stdout.on("data", (d) => {
        out += d
      })
      child.stderr.on("data", (d) => {
        err += d
      })
      child.on("close", (code) => resolve({ code, out, err }))
      child.on("error", reject)
    })
    assert.equal(result.code, 0, result.err || result.out)
    assert.deepEqual(JSON.parse(result.out), { deny: true, kind: "lock-timeout" })
    const saved = JSON.parse(readFileSync(statePath, "utf8"))
    assert.deepEqual(saved.reservations, reservations)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("task-fanout-guard denies Task on lock-wait timeout", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-guard-wait-"))
  const statePath = join(dir, "task-fanout.json")
  writeFileSync(
    statePath,
    JSON.stringify({ reservations: [{ status: "pending", ts: Date.now() }] }),
    "utf8",
  )
  writeFileSync(
    `${statePath}.lock`,
    lockRecord(process.pid, processStartTime(process.pid)),
    "utf8",
  )
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          join(
            dirname(fileURLToPath(import.meta.url)),
            "..",
            "hooks",
            "task-fanout-guard.mjs",
          ),
        ],
        {
          env: {
            ...process.env,
            TASK_FANOUT_STATE: statePath,
            TASK_FANOUT_LOCK_WAIT_MS: "0",
          },
        },
      )
      let out = ""
      let err = ""
      child.stdout.on("data", (d) => {
        out += d
      })
      child.stderr.on("data", (d) => {
        err += d
      })
      child.on("close", (code) => resolve({ code, out, err }))
      child.on("error", reject)
      child.stdin.end(
        JSON.stringify({
          tool_name: "Task",
          tool_input: { description: "x", prompt: "y" },
        }),
      )
    })
    assert.equal(result.code, 0, result.err || result.out)
    assert.equal(JSON.parse(result.out).permission, "deny")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("writeFileSync failure after wx open does not leak the lock", () => {
  const dir = mkdtempSync(join(tmpdir(), "fanout-write-fail-"))
  const statePath = join(dir, "task-fanout.json")
  const lockPath = `${statePath}.lock`
  writeFileSync(statePath, JSON.stringify({ reservations: [] }), "utf8")
  const prevState = process.env.TASK_FANOUT_STATE
  const prevWrite = reservationLockWrite.writeFileSync
  process.env.TASK_FANOUT_STATE = statePath
  reservationLockWrite.writeFileSync = () => {
    throw Object.assign(new Error("write-fail"), { code: "EIO" })
  }
  try {
    assert.throws(
      () => applyReservationMutation((cur) => tryReserve(cur)),
      { message: "write-fail" },
    )
    assert.equal(existsSync(lockPath), false)
  } finally {
    reservationLockWrite.writeFileSync = prevWrite
    if (prevState === undefined) delete process.env.TASK_FANOUT_STATE
    else process.env.TASK_FANOUT_STATE = prevState
    rmSync(dir, { recursive: true, force: true })
  }
})

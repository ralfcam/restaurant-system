/**
 * Shared in-flight cap for Task fan-out.
 *
 * Goal: stop orchestrators from dumping dozens of Task calls in one composer
 * message (bubble-creation timeouts). Prose in /capture and /audit waves at
 * this number; the preToolUse guard enforces it mechanically.
 *
 * Reservations: increment on an allowed Task preToolUse (pending); convert
 * pending → running on subagentStart (total in-flight unchanged); release on
 * subagentStop or Task postToolUseFailure. TTL prune so a crashed composer
 * cannot stick the cap.
 *
 * Fails OPEN at the hook: any error returns no opinion so TDD Task calls are
 * never bricked. Raise the cap only in TASK_FANOUT_INFLIGHT_CAP (harness-lint
 * pins the same number in .cursor/rules/task-fanout.mdc).
 */
import {
  closeSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = join(__dirname, "..", "state", "task-fanout.json")
export const LOCK_STALE_MS = 5_000
export const LOCK_MAX_AGE_MS = 60_000
const DEFAULT_LOCK_WAIT_MS = 2_000

function lockWaitMs() {
  const n = Number(process.env.TASK_FANOUT_LOCK_WAIT_MS)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LOCK_WAIT_MS
}

function stateFile() {
  return process.env.TASK_FANOUT_STATE || STATE_PATH
}

export const TASK_FANOUT_INFLIGHT_CAP = 8
export const RESERVATION_TTL_MS = 120_000

/** Patch point for tests that force a write failure after wx create. */
export const reservationLockWrite = { writeFileSync }

export function readStdinJson() {
  try {
    // Cursor prefixes hook stdin with a UTF-8 BOM on Windows; JSON.parse rejects it.
    const text = readFileSync(0, "utf8").replace(/^\uFEFF/, "")
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export function writeStdoutJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`)
}

export function isTaskTool(toolName) {
  return toolName === "Task"
}

function asReservation(x) {
  if (!x || typeof x !== "object") return null
  if (x.status !== "pending" && x.status !== "running") return null
  const ts = Number(x.ts)
  if (!Number.isFinite(ts)) return null
  return { status: x.status, ts }
}

export function pruneExpired(reservations, now = Date.now()) {
  if (!Array.isArray(reservations)) return []
  return reservations
    .map(asReservation)
    .filter((r) => r && now - r.ts < RESERVATION_TTL_MS)
}

export function inflightCount(reservations, now = Date.now()) {
  return pruneExpired(reservations, now).length
}

/** Add a pending reservation, or deny when in-flight is already at the cap. */
export function tryReserve(reservations, now = Date.now()) {
  const live = pruneExpired(reservations, now)
  if (live.length >= TASK_FANOUT_INFLIGHT_CAP) {
    return { deny: true, reservations: live }
  }
  return {
    deny: false,
    reservations: [...live, { status: "pending", ts: now }],
  }
}

/** Convert the oldest pending slot to running. Total in-flight is unchanged. */
export function onSubagentStart(reservations, now = Date.now()) {
  const live = pruneExpired(reservations, now)
  const idx = live.findIndex((r) => r.status === "pending")
  if (idx === -1) return live
  const next = live.slice()
  next[idx] = { status: "running", ts: live[idx].ts }
  return next
}

/** Release one running slot (fallback: a pending slot). */
export function onSubagentStop(reservations, now = Date.now()) {
  const live = pruneExpired(reservations, now)
  const runIdx = live.findIndex((r) => r.status === "running")
  if (runIdx !== -1) return live.filter((_, i) => i !== runIdx)
  const pendIdx = live.findIndex((r) => r.status === "pending")
  if (pendIdx !== -1) return live.filter((_, i) => i !== pendIdx)
  return live
}

/** Release one pending slot after Task failed to spawn. */
export function onTaskFailure(reservations, now = Date.now()) {
  const live = pruneExpired(reservations, now)
  const pendIdx = live.findIndex((r) => r.status === "pending")
  if (pendIdx !== -1) return live.filter((_, i) => i !== pendIdx)
  return live
}

export function loadReservations() {
  try {
    const path = stateFile()
    if (!existsSync(path)) return []
    const s = JSON.parse(readFileSync(path, "utf8"))
    return Array.isArray(s.reservations) ? s.reservations : []
  } catch {
    return []
  }
}

export function saveReservations(reservations) {
  const path = stateFile()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ reservations }, null, 2), "utf8")
}

function lockOwnerAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err?.code === "EPERM"
  }
}

/** Linux /proc/<pid>/stat field 22 (starttime), parsed after the last `)`. */
export function processStartTime(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8")
    const after = stat.slice(stat.lastIndexOf(")") + 1).trim().split(/\s+/)
    const start = after[19]
    return start != null && start !== "" ? start : null
  } catch {
    return null
  }
}

function classifyLockLiveness(owner) {
  const lines = String(owner).split("\n")
  const pid = Number(lines[0])
  const recorded = lines.length > 1 ? String(lines[1]).trim() : ""
  if (!Number.isFinite(pid) || pid <= 0) return "dead"
  if (!lockOwnerAlive(pid)) return "dead"
  const current = processStartTime(pid)
  const recordedOk = /^\d+$/.test(recorded)
  const currentOk = current != null && /^\d+$/.test(String(current))
  if (recordedOk && currentOk && recorded === String(current)) return "alive"
  if (recordedOk && currentOk && recorded !== String(current)) return "dead"
  return "ambiguous"
}

function ownerBytes() {
  return `${process.pid}\n${processStartTime(process.pid) ?? ""}\n`
}

function restoreLock(tmp, lockPath) {
  try {
    linkSync(tmp, lockPath)
  } catch (err) {
    if (err?.code !== "EEXIST") {
      // restore failed; still drop tmp and report no reclaim
    }
  }
  try {
    unlinkSync(tmp)
  } catch {
    // leftover tmp is harmless
  }
}

/** Atomically take lockPath off the name. Restore it when the bytes are
 *  a live holder or not the expected owner. Never unlinkSync(lockPath). */
export function unlinkLockIfOwner(lockPath, expectedOwner) {
  let current
  try {
    current = readFileSync(lockPath, "utf8")
  } catch {
    return false
  }
  if (current !== expectedOwner && classifyLockLiveness(current) === "alive") {
    return false
  }
  const tmp = `${lockPath}.reclaim.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`
  try {
    renameSync(lockPath, tmp)
  } catch {
    return false
  }
  let bytes
  try {
    bytes = readFileSync(tmp, "utf8")
  } catch {
    bytes = null
  }
  if (bytes !== expectedOwner) {
    restoreLock(tmp, lockPath)
    return false
  }
  if (classifyLockLiveness(bytes) === "alive" && bytes !== expectedOwner) {
    restoreLock(tmp, lockPath)
    return false
  }
  try {
    unlinkSync(tmp)
  } catch {
    // tmp already gone
  }
  return true
}

/** Reclaim a stale lock only when its recorded owner is gone, or when
 *  liveness is ambiguous past LOCK_MAX_AGE_MS. Never steal a live holder. */
export function reclaimStaleLock(lockPath, now = Date.now()) {
  let owner
  let age
  try {
    const st = statSync(lockPath)
    age = now - st.mtimeMs
    if (age < LOCK_STALE_MS) return false
    owner = readFileSync(lockPath, "utf8")
  } catch {
    return false
  }
  const life = classifyLockLiveness(owner)
  if (life === "alive") return false
  if (life === "ambiguous" && age < LOCK_MAX_AGE_MS) return false
  return unlinkLockIfOwner(lockPath, owner)
}

export function withReservationLock(fn) {
  const lockPath = `${stateFile()}.lock`
  mkdirSync(dirname(stateFile()), { recursive: true })
  const deadline = Date.now() + lockWaitMs()
  const expectedOwner = ownerBytes()
  let fd
  while (true) {
    try {
      fd = openSync(lockPath, "wx")
    } catch (err) {
      if (err.code !== "EEXIST") throw err
      if (reclaimStaleLock(lockPath)) continue
      if (Date.now() >= deadline) {
        const timeout = new Error("lock wait timed out")
        timeout.code = "LOCK_TIMEOUT"
        throw timeout
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5)
      continue
    }
    try {
      reservationLockWrite.writeFileSync(fd, expectedOwner)
    } catch (writeErr) {
      try {
        closeSync(fd)
      } catch {
        // already closed
      }
      try {
        unlinkSync(lockPath)
      } catch {
        // lock already gone
      }
      throw writeErr
    }
    break
  }
  try {
    return fn()
  } finally {
    try {
      closeSync(fd)
    } catch {
      // already closed
    }
    unlinkLockIfOwner(lockPath, expectedOwner)
  }
}

/** Exclusive read-modify-write for reservation state. */
export function applyReservationMutation(mutator, now = Date.now()) {
  try {
    return withReservationLock(() => {
      const current = loadReservations()
      const result = mutator(current, now)
      const next = Array.isArray(result) ? result : result.reservations
      saveReservations(next)
      return result
    })
  } catch (err) {
    if (err?.code === "LOCK_TIMEOUT") {
      return { deny: true, kind: "lock-timeout" }
    }
    throw err
  }
}

import { describe, expect, it } from "vitest"
import type { TableStatus } from "@/lib/data"
import {
  canMergeTables,
  clampExpectedMinutes,
  DEFAULT_EXPECTED_MINUTES,
  dissolvesMerge,
  formatDurationMinutes,
  isMergeExpired,
  labelsInSameMerge,
  mergeExpiresAt,
  mergeLabel,
  mergeSeatCapacity,
  defaultMergeExpectedMinutes,
  remainingMinutes,
  restartsMergeClock,
  shouldExpireMerge,
} from "@/lib/floor/table-use"

describe("clampExpectedMinutes", () => {
  it("defaults, steps by 15, and stays within 30–240", () => {
    expect(clampExpectedMinutes(Number.NaN)).toBe(DEFAULT_EXPECTED_MINUTES)
    expect(clampExpectedMinutes(92)).toBe(90)
    expect(clampExpectedMinutes(10)).toBe(30)
    expect(clampExpectedMinutes(300)).toBe(240)
  })
})

describe("merge arrangement defaults", () => {
  it("adds seat capacity and uses the longest expected time", () => {
    const tables = [
      { label: "4", seats: 4, expectedMinutes: 90 },
      { label: "3", seats: 2, expectedMinutes: 120 },
    ]
    expect(mergeSeatCapacity(tables)).toBe(6)
    expect(mergeLabel(tables)).toBe("3+4")
    expect(defaultMergeExpectedMinutes(tables)).toBe(120)
  })

  it("expires after the expected minutes from the start time", () => {
    const start = new Date("2026-08-18T18:00:00.000Z")
    expect(mergeExpiresAt(start, 90).toISOString()).toBe("2026-08-18T19:30:00.000Z")
    expect(isMergeExpired("2026-08-18T19:30:00.000Z", start)).toBe(false)
    expect(isMergeExpired("2026-08-18T19:30:00.000Z", new Date("2026-08-18T19:30:00.000Z"))).toBe(true)
  })
})

describe("merge status coherence", () => {
  it("only available tables that are not already merged can be combined", () => {
    expect(canMergeTables([{ status: "available" }])).toBe("Select at least two tables to merge.")
    expect(
      canMergeTables([
        { status: "available" },
        { status: "reserved" },
      ]),
    ).toBe("Only available tables can be merged.")
    expect(
      canMergeTables([
        { status: "available", mergeId: "m1" },
        { status: "available" },
      ]),
    ).toBe("A selected table is already in an arrangement.")
    expect(
      canMergeTables([
        { status: "available" },
        { status: "available" },
      ]),
    ).toBeNull()
  })

  it("dissolves on Available or Out of service and restarts the clock when held", () => {
    const dissolving: TableStatus[] = ["available", "out_of_service"]
    const holding: TableStatus[] = ["reserved", "seated", "cleaning"]
    for (const status of dissolving) expect(dissolvesMerge(status)).toBe(true)
    for (const status of holding) expect(dissolvesMerge(status)).toBe(false)
    expect(restartsMergeClock("reserved")).toBe(true)
    expect(restartsMergeClock("seated")).toBe(true)
    expect(restartsMergeClock("cleaning")).toBe(false)
  })

  it("expires unused available arrangements only", () => {
    const expiresAt = "2026-08-18T19:00:00.000Z"
    const now = new Date("2026-08-18T19:00:00.000Z")
    expect(shouldExpireMerge({ status: "available", expiresAt }, now)).toBe(true)
    expect(shouldExpireMerge({ status: "seated", expiresAt }, now)).toBe(false)
    expect(shouldExpireMerge({ status: "available", expiresAt: "2026-08-18T20:00:00.000Z" }, now)).toBe(false)
  })
})

describe("merge labels and remaining time", () => {
  it("expands a reservation label to every table in the arrangement", () => {
    const tables = [
      { id: "t3", label: "3" },
      { id: "t4", label: "4" },
      { id: "t5", label: "5" },
    ]
    expect(labelsInSameMerge("3", tables, [{ tableIds: ["t3", "t4"] }])).toEqual(["3", "4"])
    expect(labelsInSameMerge("5", tables, [{ tableIds: ["t3", "t4"] }])).toEqual(["5"])
  })

  it("formats remaining expected time", () => {
    expect(formatDurationMinutes(45)).toBe("45 min")
    expect(formatDurationMinutes(90)).toBe("1h 30m")
    expect(formatDurationMinutes(120)).toBe("2h")
    expect(
      remainingMinutes("2026-08-18T19:30:00.000Z", new Date("2026-08-18T18:00:00.000Z")),
    ).toBe(90)
  })
})

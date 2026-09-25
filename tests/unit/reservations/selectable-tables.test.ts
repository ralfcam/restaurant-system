import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("selectable tables for assignment", () => {
  it("omits undersize tables except the reservation current label", async () => {
    const selectable = await import("@/lib/reservations/selectable-tables")
    expect(selectable.selectableTablesForAssignment).toEqual(
      expect.any(Function),
    )

    const tables = [
      { label: "1", seats: 2, status: "available" as const },
      { label: "4", seats: 4, status: "available" as const },
      { label: "8", seats: 8, status: "available" as const },
    ]

    expect(
      selectable
        .selectableTablesForAssignment(tables, 8)
        .map((table: { label: string }) => table.label),
    ).toEqual(["8"])
    expect(
      selectable
        .selectableTablesForAssignment(tables, 8, "1")
        .map((table: { label: string }) => table.label),
    ).toEqual(["1", "8"])

    const manager = read("components/staff/reservations-manager.tsx")
    const assignmentStart = manager.indexOf("function TableAssignment")
    expect(assignmentStart).toBeGreaterThanOrEqual(0)
    expect(manager.slice(assignmentStart)).toMatch(
      /\bselectableTablesForAssignment\s*\(/,
    )
  })

  it("omits a table claimed by an overlapping seated or confirmed reservation", async () => {
    const selectable = await import("@/lib/reservations/selectable-tables")
    const {
      ACTIVE_RESERVATION_STATUSES,
      occupyingWindowMinutes,
      occupyingWindowsOverlap,
    } = await import("@/lib/reservations/auto-assign")

    const tables = [
      { label: "1", seats: 2, status: "available" as const },
      { label: "4", seats: 4, status: "available" as const },
      { label: "8", seats: 8, status: "available" as const },
    ]

    const date = "2026-09-23"
    const time = "12:00"
    const candidate = { id: "candidate-noon", date, time }
    const candidateWindow = occupyingWindowMinutes(time, 90, 15)

    expect(ACTIVE_RESERVATION_STATUSES).toEqual(["confirmed", "seated"])
    expect(candidateWindow).not.toBeNull()

    for (const status of ACTIVE_RESERVATION_STATUSES) {
      const occupantWindow = occupyingWindowMinutes(time, 90, 15)
      expect(occupantWindow).not.toBeNull()
      expect(occupyingWindowsOverlap(candidateWindow!, occupantWindow!)).toBe(
        true,
      )

      const labels = selectable
        .selectableTablesForAssignment(tables, 2, undefined, {
          candidate,
          occupying: [
            {
              id: `occupant-${status}`,
              date,
              time,
              status,
              table_label: "8",
            },
          ],
        })
        .map((table: { label: string }) => table.label)

      expect(labels).not.toContain("8")
    }
  })

  it("keeps the reservation current label when that table is occupying", async () => {
    const selectable = await import("@/lib/reservations/selectable-tables")
    const { occupyingWindowMinutes, occupyingWindowsOverlap } =
      await import("@/lib/reservations/auto-assign")

    const tables = [
      { label: "1", seats: 2, status: "available" as const },
      { label: "4", seats: 4, status: "available" as const },
      { label: "8", seats: 8, status: "available" as const },
    ]

    const date = "2026-09-23"
    const time = "12:00"
    const occupantId = "occupant-own-eight"
    const candidate = { id: occupantId, date, time }
    const candidateWindow = occupyingWindowMinutes(time, 90, 15)
    const occupantWindow = occupyingWindowMinutes(time, 90, 15)

    expect(candidateWindow).not.toBeNull()
    expect(occupantWindow).not.toBeNull()
    expect(occupyingWindowsOverlap(candidateWindow!, occupantWindow!)).toBe(
      true,
    )

    const labels = selectable
      .selectableTablesForAssignment(tables, 2, undefined, {
        candidate,
        occupying: [
          {
            id: occupantId,
            date,
            time,
            status: "seated",
            table_label: "8",
          },
        ],
      })
      .map((table: { label: string }) => table.label)

    expect(labels).toContain("8")
  })

  it("includes a table claimed only by a non-overlapping occupying reservation", async () => {
    const selectable = await import("@/lib/reservations/selectable-tables")
    const { occupyingWindowMinutes, occupyingWindowsOverlap } =
      await import("@/lib/reservations/auto-assign")

    const tables = [
      { label: "8", seats: 8, status: "seated" as const },
      { label: "3", seats: 4, status: "reserved" as const },
      { label: "6", seats: 4, status: "cleaning" as const },
      { label: "9", seats: 2, status: "out_of_service" as const },
    ]

    const date = "2026-09-23"
    const candidate = { id: "candidate-evening", date, time: "19:00" }
    const candidateWindow = occupyingWindowMinutes("19:00", 90, 15)
    const occupantWindow = occupyingWindowMinutes("12:00", 90, 15)

    expect(candidateWindow).not.toBeNull()
    expect(occupantWindow).not.toBeNull()
    expect(occupyingWindowsOverlap(candidateWindow!, occupantWindow!)).toBe(
      false,
    )

    const labels = selectable
      .selectableTablesForAssignment(tables, 2, undefined, {
        candidate,
        occupying: [
          {
            id: "occupant-noon-eight",
            date,
            time: "12:00",
            status: "seated",
            table_label: "8",
          },
        ],
      })
      .map((table: { label: string }) => table.label)

    expect(labels).toContain("8")
    expect(labels).toContain("3")
    expect(labels).toContain("6")
    expect(labels).not.toContain("9")
  })

  it("uses the configured occupancy duration and safety buffer for occupying windows", async () => {
    const selectable = await import("@/lib/reservations/selectable-tables")
    const { occupyingWindowMinutes, occupyingWindowsOverlap } =
      await import("@/lib/reservations/auto-assign")

    const tables = [{ label: "8", seats: 8, status: "available" as const }]

    const date = "2026-09-23"
    const candidate = { id: "candidate-noon", date, time: "12:00" }
    const occupying = [
      {
        id: "occupant-morning-eight",
        date,
        time: "10:00",
        status: "seated" as const,
        table_label: "8",
      },
    ]

    const configuredCandidate = occupyingWindowMinutes("12:00", 135, 15)
    const configuredOccupant = occupyingWindowMinutes("10:00", 135, 15)
    expect(configuredCandidate).not.toBeNull()
    expect(configuredOccupant).not.toBeNull()
    expect(
      occupyingWindowsOverlap(configuredCandidate!, configuredOccupant!),
    ).toBe(true)

    const defaultCandidate = occupyingWindowMinutes("12:00", 90, 15)
    const defaultOccupant = occupyingWindowMinutes("10:00", 90, 15)
    expect(defaultCandidate).not.toBeNull()
    expect(defaultOccupant).not.toBeNull()
    expect(occupyingWindowsOverlap(defaultCandidate!, defaultOccupant!)).toBe(
      false,
    )

    const configuredLabels = selectable
      .selectableTablesForAssignment(tables, 2, undefined, {
        candidate,
        occupying,
        occupancyDurationMinutes: 135,
        safetyBufferMinutes: 15,
      })
      .map((table: { label: string }) => table.label)

    expect(configuredLabels).not.toContain("8")

    const defaultLabels = selectable
      .selectableTablesForAssignment(tables, 2, undefined, {
        candidate,
        occupying,
      })
      .map((table: { label: string }) => table.label)

    expect(defaultLabels).toContain("8")
  })
})

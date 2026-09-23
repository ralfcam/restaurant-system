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
})

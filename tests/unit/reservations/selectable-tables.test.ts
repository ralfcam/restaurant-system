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
})

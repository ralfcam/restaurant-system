import { describe, expect, it } from "vitest"
import {
  attachMergesToTables,
  groupTablesForDisplay,
  toAssignableTables,
  type TableMergeRef,
} from "@/lib/floor/floor-units"
import {
  overlayReservationsOnTables,
  type AssignableTable,
} from "@/lib/reservations/auto-assign"

function table(
  label: string,
  seats: number,
  id = `t-${label}`,
): AssignableTable {
  return { id, label, seats, status: "available" }
}

const merge34: TableMergeRef = {
  id: "m-34",
  expectedMinutes: 120,
  expiresAt: "2026-08-18T20:00:00.000Z",
  status: "available",
  tableIds: ["t-3", "t-4"],
}

describe("toAssignableTables", () => {
  it("exposes a merged pair as one table whose seats add up", () => {
    const assignable = toAssignableTables(
      [table("1", 2), table("3", 2), table("4", 4), table("8", 8)],
      [merge34],
    )
    expect(
      assignable.map((row) => ({ label: row.label, seats: row.seats })),
    ).toEqual([
      { label: "1", seats: 2 },
      { label: "3", seats: 6 },
      { label: "8", seats: 8 },
    ])
  })
})

describe("overlayReservationsOnTables with merges", () => {
  it("shows the same reservation on every member of the arrangement", () => {
    const views = overlayReservationsOnTables(
      [table("3", 2), table("4", 4), table("5", 4)],
      [
        {
          id: "r1",
          guest_name: "The Patel Party",
          party_size: 6,
          time: "18:30",
          status: "confirmed",
          table_label: "3",
        },
      ],
      [merge34],
    )
    expect(views.find((row) => row.label === "3")).toMatchObject({
      displayStatus: "reserved",
      reservation: { guestName: "The Patel Party", partySize: 6 },
    })
    expect(views.find((row) => row.label === "4")).toMatchObject({
      displayStatus: "reserved",
      reservation: { guestName: "The Patel Party" },
    })
    expect(views.find((row) => row.label === "5")).toMatchObject({
      displayStatus: "available",
      reservation: null,
    })
  })
})

describe("groupTablesForDisplay", () => {
  it("clusters merged members and leaves singles alone", () => {
    const overlaid = overlayReservationsOnTables(
      [table("1", 2), table("3", 2), table("4", 4)],
      [],
      [merge34],
    )
    const withMerges = attachMergesToTables(overlaid, [merge34])
    const groups = groupTablesForDisplay(withMerges)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.mergeId).toBeNull()
    expect(groups[0]?.tables.map((row) => row.label)).toEqual(["1"])
    expect(groups[1]?.mergeId).toBe("m-34")
    expect(groups[1]?.tables.map((row) => row.label)).toEqual(["3", "4"])
    expect(withMerges.find((row) => row.label === "3")?.merge).toMatchObject({
      label: "3+4",
      seats: 6,
      expectedMinutes: 120,
    })
  })
})

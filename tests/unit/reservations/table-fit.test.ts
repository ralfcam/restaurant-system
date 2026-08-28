import { describe, expect, it } from "vitest"
import type { TableMergeRef } from "@/lib/floor/floor-units"
import type {
  AssignableReservation,
  AssignableTable,
} from "@/lib/reservations/auto-assign"

function table(label: string, seats: number): AssignableTable {
  return { id: `t-${label}`, label, seats, status: "available" }
}

function reservation(
  overrides: Partial<AssignableReservation> & Pick<AssignableReservation, "id">,
): AssignableReservation {
  return {
    party_size: 2,
    date: "2026-08-18",
    time: "19:00",
    status: "confirmed",
    table_label: null,
    created_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  }
}

describe("table-fit bookability", () => {
  it("cannot seat a party when leftover seats are split across undersize units", async () => {
    const { canSeatPartyOnTables } =
      await import("@/lib/reservations/auto-assign")

    // Covers fit (8 >= 4); no unit has seats >= 4 — guests must not invent a merge.
    const tables = [table("1", 2), table("2", 2), table("3", 2), table("4", 2)]
    const occupying: AssignableReservation[] = []

    expect(canSeatPartyOnTables(tables, 4, occupying)).toBe(false)
  })

  it("refuses a second overlapping party that needs the only fitting unit and still seats a leftover smaller party", async () => {
    const { canSeatPartyOnTables } =
      await import("@/lib/reservations/auto-assign")

    // Covers fit (16 >= 8+8); only one unit has seats >= 8.
    const tables = [
      table("8", 8),
      table("1", 2),
      table("2", 2),
      table("3", 2),
      table("4", 2),
    ]
    const occupyingUnassigned = [
      reservation({ id: "occ-8", party_size: 8, time: "19:00" }),
    ]

    expect(canSeatPartyOnTables(tables, 8, occupyingUnassigned, "19:00")).toBe(
      false,
    )
    expect(canSeatPartyOnTables(tables, 2, occupyingUnassigned, "19:00")).toBe(
      true,
    )
    // BW-9 defaults 90+15: occupying [19:00, 20:45) does not overlap 21:00.
    expect(canSeatPartyOnTables(tables, 8, occupyingUnassigned, "21:00")).toBe(
      true,
    )

    // Party of 2 on the 8-top: best-fit would leave the 8-top free; the label claims it.
    const occupyingAssigned = [
      reservation({
        id: "occ-8-held",
        party_size: 2,
        time: "19:00",
        table_label: "8",
      }),
    ]
    expect(canSeatPartyOnTables(tables, 8, occupyingAssigned, "19:00")).toBe(
      false,
    )
  })

  it("treats an existing staff merge as one unit and does not invent a merge from unmerged tables", async () => {
    const { canSeatPartyOnTables } =
      await import("@/lib/reservations/auto-assign")

    // Covers fit (2+4=6); unmerged max unit is 4. Guests must not invent a merge.
    const tables = [table("2", 2), table("4", 4)]
    const occupying: AssignableReservation[] = []
    const staffMerge: TableMergeRef = {
      id: "m-24",
      expectedMinutes: 90,
      expiresAt: "2026-08-18T20:00:00.000Z",
      status: "available",
      tableIds: ["t-2", "t-4"],
    }

    expect(canSeatPartyOnTables(tables, 6, occupying)).toBe(false)
    expect(
      canSeatPartyOnTables(tables, 6, occupying, undefined, [staffMerge]),
    ).toBe(true)
  })

  it("excludes out_of_service and does not treat live seated or cleaning as occupying a future slot", async () => {
    const { canSeatPartyOnTables } =
      await import("@/lib/reservations/auto-assign")

    const leftoverTwos: AssignableTable[] = [
      { id: "t-1", label: "1", seats: 2, status: "available" },
      { id: "t-2", label: "2", seats: 2, status: "available" },
      { id: "t-3", label: "3", seats: 2, status: "available" },
      { id: "t-4", label: "4", seats: 2, status: "available" },
    ]
    const occupying: AssignableReservation[] = []

    // Covers still sum >= 8 via leftover 2-tops; only the 8-top fits party 8, and it is OOS.
    expect(
      canSeatPartyOnTables(
        [
          { id: "t-8", label: "8", seats: 8, status: "out_of_service" },
          ...leftoverTwos,
        ],
        8,
        occupying,
        "19:00",
      ),
    ).toBe(false)

    // Live floor status is not occupancy: no occupying reservation, future slot.
    expect(
      canSeatPartyOnTables(
        [
          { id: "t-8", label: "8", seats: 8, status: "seated" },
          ...leftoverTwos,
        ],
        8,
        occupying,
        "19:00",
      ),
    ).toBe(true)
    expect(
      canSeatPartyOnTables(
        [
          { id: "t-8", label: "8", seats: 8, status: "cleaning" },
          ...leftoverTwos,
        ],
        8,
        occupying,
        "19:00",
      ),
    ).toBe(true)
  })
})

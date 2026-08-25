import { describe, expect, it } from "vitest"
import type { ReservationStatus, TableStatus } from "@/lib/data"
import {
  isReservationDueForAssignment,
  overlayReservationsOnTables,
  planAutoAssignments,
  selectBestTable,
  TABLE_ASSIGNMENT_LEAD_MINUTES,
  timeToMinutes,
  type AssignableReservation,
  type AssignableTable,
} from "@/lib/reservations/auto-assign"

const NOW = { date: "2026-08-18", time: "18:00" }

function reservation(
  overrides: Partial<AssignableReservation> & Pick<AssignableReservation, "id">,
): AssignableReservation {
  return {
    party_size: 2,
    date: NOW.date,
    time: "18:00",
    status: "confirmed",
    table_label: null,
    created_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  }
}

function table(
  label: string,
  seats: number,
  status: TableStatus = "available",
): AssignableTable {
  return { id: `t-${label}`, label, seats, status }
}

describe("timeToMinutes", () => {
  it("parses HH:MM and HH:MM:SS", () => {
    expect(timeToMinutes("18:00")).toBe(18 * 60)
    expect(timeToMinutes("18:30:00")).toBe(18 * 60 + 30)
    expect(timeToMinutes("not-a-time")).toBeNull()
  })
})

describe("isReservationDueForAssignment", () => {
  it("is due at the booked time", () => {
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", time: "18:00" }),
        NOW,
      ),
    ).toBe(true)
  })

  it("is due once the lead window opens", () => {
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", time: "18:15" }),
        NOW,
      ),
    ).toBe(true)
    expect(TABLE_ASSIGNMENT_LEAD_MINUTES).toBe(15)
  })

  it("is not due before the lead window", () => {
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", time: "18:16" }),
        NOW,
      ),
    ).toBe(false)
  })

  it("assigns past-due confirmed reservations today", () => {
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", time: "12:00" }),
        NOW,
      ),
    ).toBe(true)
  })

  it("ignores already assigned, other dates, and terminal statuses", () => {
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", table_label: "3" }),
        NOW,
      ),
    ).toBe(false)
    expect(
      isReservationDueForAssignment(
        reservation({ id: "r1", date: "2026-08-19" }),
        NOW,
      ),
    ).toBe(false)
    for (const status of [
      "seated",
      "completed",
      "cancelled",
      "no_show",
    ] as ReservationStatus[]) {
      expect(
        isReservationDueForAssignment(reservation({ id: "r1", status }), NOW),
      ).toBe(false)
    }
  })
})

describe("selectBestTable", () => {
  it("picks the smallest available table that fits", () => {
    const picked = selectBestTable(
      [table("8", 8), table("3", 4), table("1", 2), table("4", 4)],
      3,
      new Set(),
    )
    expect(picked?.label).toBe("3")
  })

  it("skips taken, reserved, seated, cleaning, and out-of-service tables", () => {
    const picked = selectBestTable(
      [
        table("1", 4, "reserved"),
        table("2", 4, "seated"),
        table("3", 4, "cleaning"),
        table("4", 4, "out_of_service"),
        table("5", 4, "available"),
      ],
      2,
      new Set(["5"]),
    )
    expect(picked).toBeNull()
  })
})

describe("planAutoAssignments", () => {
  const tables = [table("1", 2), table("3", 4), table("8", 8)]

  it("assigns due reservations and leaves future ones unassigned", () => {
    const planned = planAutoAssignments(
      [
        reservation({ id: "due", time: "18:00", party_size: 2 }),
        reservation({ id: "later", time: "19:30", party_size: 2 }),
      ],
      tables,
      NOW,
    )
    expect(planned).toEqual([{ reservationId: "due", tableLabel: "1" }])
  })

  it("does not reuse a table already held by an active reservation", () => {
    const planned = planAutoAssignments(
      [
        reservation({ id: "held", table_label: "1", time: "17:30" }),
        reservation({ id: "due", time: "18:00", party_size: 2 }),
      ],
      tables,
      NOW,
    )
    expect(planned).toEqual([{ reservationId: "due", tableLabel: "3" }])
  })

  it("at the same time prefers the larger party and never double-books", () => {
    const planned = planAutoAssignments(
      [
        reservation({
          id: "two",
          time: "18:00",
          party_size: 2,
          created_at: "2026-08-01T11:00:00.000Z",
        }),
        reservation({
          id: "four",
          time: "18:00",
          party_size: 4,
          created_at: "2026-08-01T12:00:00.000Z",
        }),
      ],
      tables,
      NOW,
    )
    expect(planned).toEqual([
      { reservationId: "four", tableLabel: "3" },
      { reservationId: "two", tableLabel: "1" },
    ])
  })

  it("leaves a reservation unassigned when no table fits", () => {
    const planned = planAutoAssignments(
      [reservation({ id: "eight", time: "18:00", party_size: 8 })],
      [table("1", 2), table("3", 4)],
      NOW,
    )
    expect(planned).toEqual([])
  })
})

describe("overlayReservationsOnTables", () => {
  it("marks assigned confirmed tables reserved and seated reservations seated", () => {
    const views = overlayReservationsOnTables(
      [table("1", 2), table("3", 4, "available"), table("8", 8)],
      [
        {
          id: "r-seat",
          guest_name: "Daniel Cho",
          party_size: 4,
          time: "18:00",
          status: "seated",
          table_label: "3",
        },
        {
          id: "r-hold",
          guest_name: "Amelia Brooks",
          party_size: 2,
          time: "18:30",
          status: "confirmed",
          table_label: "1",
        },
        {
          id: "r-done",
          guest_name: "Past Guest",
          party_size: 2,
          time: "12:00",
          status: "completed",
          table_label: "8",
        },
      ],
    )

    expect(views.find((row) => row.label === "1")).toMatchObject({
      displayStatus: "reserved",
      reservation: { guestName: "Amelia Brooks", partySize: 2, time: "18:30" },
    })
    expect(views.find((row) => row.label === "3")).toMatchObject({
      displayStatus: "seated",
      reservation: { guestName: "Daniel Cho", status: "seated" },
    })
    expect(views.find((row) => row.label === "8")).toMatchObject({
      displayStatus: "available",
      reservation: null,
    })
  })
})

import { describe, expect, it } from "vitest"
import { sumOpenOrderTotalsByReservationId } from "@/lib/floor/table-bills"

describe("sumOpenOrderTotalsByReservationId", () => {
  it("sums non-cancelled order totals by reservation_id and ignores cancelled or voided", () => {
    const totals = sumOpenOrderTotalsByReservationId([
      { reservation_id: "res-3", total: 20, status: "new" },
      { reservation_id: "res-3", total: 10.5, status: "ready" },
      { reservation_id: "res-3", total: 99, status: "cancelled" },
      { reservation_id: "res-3", total: 50, status: "voided" },
      { reservation_id: "res-1", total: 8, status: "preparing" },
    ])

    expect(totals).toEqual({
      "res-3": 30.5,
      "res-1": 8,
    })
    expect(sumOpenOrderTotalsByReservationId([])).toEqual({})
  })

  it("per-visit bill: sumOpenOrderTotalsByReservationId counts only the visit's non-cancelled orders", () => {
    const sharedTable = "3"
    const orders = [
      {
        reservation_id: "visit-a",
        table_label: sharedTable,
        total: 20,
        status: "new",
      },
      {
        reservation_id: "visit-a",
        table_label: sharedTable,
        total: 10.5,
        status: "completed",
      },
      {
        reservation_id: "visit-b",
        table_label: sharedTable,
        total: 8,
        status: "preparing",
      },
      {
        reservation_id: "visit-b",
        table_label: sharedTable,
        total: 99,
        status: "cancelled",
      },
      {
        reservation_id: "visit-b",
        table_label: sharedTable,
        total: 50,
        status: "voided",
      },
      {
        reservation_id: null,
        table_label: sharedTable,
        total: 40,
        status: "new",
      },
    ]

    expect(sumOpenOrderTotalsByReservationId(orders)).toEqual({
      "visit-a": 30.5,
      "visit-b": 8,
    })
  })
})

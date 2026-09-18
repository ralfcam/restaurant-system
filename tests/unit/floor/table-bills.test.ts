import { describe, expect, it } from "vitest"
import { sumOpenOrderTotalsByTableLabel } from "@/lib/floor/table-bills"

describe("sumOpenOrderTotalsByTableLabel", () => {
  it("sums non-cancelled order totals by table_label and ignores cancelled or voided", () => {
    const totals = sumOpenOrderTotalsByTableLabel([
      { table_label: "3", total: 20, status: "new" },
      { table_label: "3", total: 10.5, status: "ready" },
      { table_label: "3", total: 99, status: "cancelled" },
      { table_label: "3", total: 50, status: "voided" },
      { table_label: "1", total: 8, status: "preparing" },
    ])

    expect(totals).toEqual({
      "3": 30.5,
      "1": 8,
    })
    expect(sumOpenOrderTotalsByTableLabel([])).toEqual({})
  })
})

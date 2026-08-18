import { describe, expect, it } from "vitest"
import { tableChipSizeClass, tableShapeForSeats } from "@/lib/table-shape"

describe("tableShapeForSeats", () => {
  it("depicts odd seat capacity as round and even as square", () => {
    for (const seats of [1, 3, 5, 7, 9, 11]) {
      expect(tableShapeForSeats(seats)).toBe("round")
    }
    for (const seats of [2, 4, 6, 8, 10, 12]) {
      expect(tableShapeForSeats(seats)).toBe("square")
    }
  })
})

describe("tableChipSizeClass", () => {
  it("uses equal-sided size classes so chips stay round or square", () => {
    expect(tableChipSizeClass(1)).toBe("size-20")
    expect(tableChipSizeClass(4)).toBe("size-24")
    expect(tableChipSizeClass(6)).toBe("size-28")
    expect(tableChipSizeClass(10)).toBe("size-32")
    expect(tableChipSizeClass(8)).not.toMatch(/w-\d+/)
  })
})

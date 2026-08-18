import { describe, expect, it } from "vitest"
import {
  clampFloorCell,
  clientToFloorCell,
  floorCanvasCells,
  FLOOR_CELL_PX,
  mergeCellBounds,
  nextFreeCell,
  SEED_FLOOR_LAYOUT,
  spreadOverlappingTables,
  tableAtCell,
} from "@/lib/floor/layout"

describe("floor layout grid", () => {
  it("snaps pointer coordinates to a cell and finds the next free slot", () => {
    expect(clampFloorCell({ x: -2, y: 99 })).toEqual({ x: 0, y: 7 })
    expect(
      clientToFloorCell(240, 120, { left: 0, top: 0 }),
    ).toEqual({ x: 2, y: 1 })
    expect(nextFreeCell([{ x: 0, y: 0 }, { x: 1, y: 0 }])).toEqual({ x: 2, y: 0 })
    expect(floorCanvasCells([{ x: 3, y: 2 }])).toMatchObject({ cols: 5, rows: 4 })
    expect(
      tableAtCell({ x: 1, y: 0 }, [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 1, y: 0 },
      ], "a"),
    ).toEqual({ id: "b", x: 1, y: 0 })
    expect(FLOOR_CELL_PX).toBe(120)
    expect(
      mergeCellBounds([
        { x: 1, y: 0 },
        { x: 2, y: 1 },
      ]),
    ).toEqual({
      left: FLOOR_CELL_PX,
      top: 0,
      width: FLOOR_CELL_PX * 2,
      height: FLOOR_CELL_PX * 2,
    })
  })

  it("spreads stacked default cells onto the seed dining-room grid", () => {
    const stacked = ["1", "2", "5", "11"].map((label, index) => ({
      id: `t${label}`,
      label,
      x: 0,
      y: 0,
      seats: index,
    }))
    const spread = spreadOverlappingTables(stacked)
    expect(spread.find((table) => table.label === "1")).toMatchObject(SEED_FLOOR_LAYOUT["1"])
    expect(spread.find((table) => table.label === "2")).toMatchObject(SEED_FLOOR_LAYOUT["2"])
    expect(spread.find((table) => table.label === "5")).toMatchObject(SEED_FLOOR_LAYOUT["5"])
    expect(spread.find((table) => table.label === "11")).toMatchObject({ x: 2, y: 0 })
    expect(spreadOverlappingTables(spread)).toEqual(spread)
  })

  it("keeps uniquely placed tables and only moves collisions", () => {
    const spread = spreadOverlappingTables([
      { id: "a", label: "1", x: 0, y: 0 },
      { id: "b", label: "2", x: 0, y: 0 },
      { id: "c", label: "8", x: 5, y: 3 },
    ])
    expect(spread).toEqual([
      { id: "a", label: "1", x: 0, y: 0 },
      { id: "b", label: "2", x: 1, y: 0 },
      { id: "c", label: "8", x: 5, y: 3 },
    ])
  })
})

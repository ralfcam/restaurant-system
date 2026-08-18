import { describe, expect, it } from "vitest"
import {
  canDragFloorTable,
  isDragMergeable,
  isDragSplittable,
  resolveMergeDrop,
  resolveSplitDrop,
  type MergeDropTable,
} from "@/lib/floor/merge-drop"

function table(
  id: string,
  overrides: Partial<MergeDropTable> = {},
): MergeDropTable {
  return {
    id,
    status: "available",
    displayStatus: "available",
    merge: null,
    reservation: null,
    ...overrides,
  }
}

describe("resolveMergeDrop", () => {
  it("merges two available tables when one is dropped on the other", () => {
    const tables = [table("t3"), table("t4"), table("t5")]
    expect(resolveMergeDrop("t3", "t4", tables)).toEqual({ tableIds: ["t3", "t4"] })
    expect(isDragMergeable(tables[0]!)).toBe(true)
  })

  it("adds an available table dropped onto an available arrangement", () => {
    const tables = [
      table("t3", { merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] } }),
      table("t4", { merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] } }),
      table("t5"),
    ]
    expect(resolveMergeDrop("t5", "t3", tables)).toEqual({
      tableIds: ["t3", "t4", "t5"],
    })
  })

  it("rejects reserved, occupied, or already-grouped drops before mergeTables is called", () => {
    expect(
      resolveMergeDrop("t3", "t4", [
        table("t3"),
        table("t4", { status: "reserved", displayStatus: "reserved" }),
      ]),
    ).toEqual({ error: "Only available tables can be merged." })
    expect(
      resolveMergeDrop("t3", "t4", [
        table("t3"),
        table("t4", { displayStatus: "reserved", reservation: { id: "r1" } }),
      ]),
    ).toEqual({ error: "Only available tables can be merged." })
    expect(
      resolveMergeDrop("t3", "t5", [
        table("t3", { merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] } }),
        table("t4", { merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] } }),
        table("t5", { merge: { id: "m-56", status: "available", memberIds: ["t5", "t6"] } }),
      ]),
    ).toEqual({ error: "Split an arrangement before combining it with another." })
    expect(isDragMergeable(table("t2", { status: "seated", displayStatus: "seated" }))).toBe(
      false,
    )
  })
})

describe("resolveSplitDrop", () => {
  it("splits when a merged table is dragged out onto the floor", () => {
    const merged = table("t3", {
      merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
    })
    const tables = [
      merged,
      table("t4", { merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] } }),
    ]
    expect(isDragSplittable(merged)).toBe(true)
    expect(canDragFloorTable(merged)).toBe(true)
    expect(isDragMergeable(merged)).toBe(false)
    expect(resolveSplitDrop("t3", tables)).toEqual({ mergeId: "m-34" })
    expect(resolveSplitDrop("t5", [table("t5")])).toEqual({
      error: "That table is not in an arrangement.",
    })
  })
})

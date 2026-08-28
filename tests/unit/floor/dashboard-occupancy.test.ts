import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import type { TableStatus } from "@/lib/data"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("dashboard occupancy from live floor snapshot", () => {
  it("dashboard Floor occupancy, Service is live, and Floor status count getFloorSnapshot tables, not TABLES seed", async () => {
    const tableUse = await import("@/lib/floor/table-use")
    expect(tableUse.countFloorOccupancy).toEqual(expect.any(Function))

    // Anti-seed: TABLES is 3 seated / 10 total / 4 available. Echoing seed cannot pass.
    const antiSeed: Array<{ status: TableStatus }> = [
      ...Array.from({ length: 7 }, (): { status: TableStatus } => ({
        status: "seated",
      })),
      { status: "reserved" },
      { status: "cleaning" },
    ]

    const live = tableUse.countFloorOccupancy(antiSeed)
    expect(`${live.seated}/${live.total}`).toBe("7/9")
    expect(live.available).toBe(0)
    expect(live.byStatus).toEqual({
      available: 0,
      seated: 7,
      reserved: 1,
      cleaning: 1,
      out_of_service: 0,
    })

    const empty = tableUse.countFloorOccupancy([])
    expect(`${empty.seated}/${empty.total}`).toBe("0/0")

    const page = read("app/admin/page.tsx")
    expect(page).toMatch(/getFloorSnapshot\(/)
    expect(page).toMatch(/\bcountFloorOccupancy\b/)
    expect(page).not.toMatch(/\bTABLES\b/)

    const occupancyWidget = page.slice(
      page.indexOf("Floor occupancy"),
      page.indexOf("Service is live"),
    )
    expect(occupancyWidget).toMatch(/seated/)
    expect(occupancyWidget).toMatch(/total/)
    expect(occupancyWidget).toMatch(/available/)

    const serviceLive = page.slice(
      page.indexOf("Service is live"),
      page.indexOf("Floor status"),
    )
    expect(serviceLive).toMatch(/seated/)
    expect(serviceLive).toMatch(/available/)

    const floorStatus = page.slice(page.indexOf("Floor status"))
    expect(floorStatus).toMatch(/byStatus/)
  })
})

import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const FILTER_EMPTY = "No reservations match your filters."

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("staff list empty copy", () => {
  it("distinguishes load error, empty date, and filter-empty copy", async () => {
    const emptyCopy = await import("@/lib/reservations/list-empty-copy")
    expect(emptyCopy.staffListEmptyCopy).toEqual(expect.any(Function))

    const loadError = emptyCopy.staffListEmptyCopy({
      error: "Could not load reservations.",
      loadedCount: 0,
      filteredCount: 0,
      statusFilterActive: true,
      nameOrPhoneFilterActive: true,
    })
    expect(loadError).toBe("Could not load reservations.")
    expect(loadError).not.toBe(FILTER_EMPTY)
    expect(loadError).not.toMatch(/no reservations for (this|that) date/i)

    const emptyDate = emptyCopy.staffListEmptyCopy({
      loadedCount: 0,
      filteredCount: 0,
      statusFilterActive: false,
      nameOrPhoneFilterActive: false,
    })
    expect(emptyDate).toMatch(/no reservations for (this|that) date/i)
    expect(emptyDate).not.toBe(FILTER_EMPTY)

    expect(
      emptyCopy.staffListEmptyCopy({
        loadedCount: 3,
        filteredCount: 0,
        statusFilterActive: true,
        nameOrPhoneFilterActive: false,
      }),
    ).toBe(FILTER_EMPTY)
    expect(
      emptyCopy.staffListEmptyCopy({
        loadedCount: 3,
        filteredCount: 0,
        statusFilterActive: false,
        nameOrPhoneFilterActive: true,
      }),
    ).toBe(FILTER_EMPTY)

    const manager = read("components/staff/reservations-manager.tsx")
    expect(manager).toMatch(/\bstaffListEmptyCopy\s*\(/)
    expect(manager).not.toMatch(/No reservations match your filters\./)

    const dateFetch = manager.slice(
      manager.indexOf("getReservationsByDate("),
      manager.indexOf("function navigateToDate"),
    )
    expect(dateFetch).toMatch(/\.reservations\b/)
    expect(dateFetch).toMatch(/\.error\b/)
    expect(dateFetch).not.toMatch(/\.then\(\s*setReservations\s*\)/)
    expect(dateFetch).not.toMatch(
      /\.then\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.map\s*\(/,
    )
  })
})

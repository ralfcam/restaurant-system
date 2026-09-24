import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  clampSlotIntervalMinutes,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  flattenDaysToRows,
  groupRowsByDay,
  validateOperatingDays,
  type OperatingDay,
  type OperatingSegment,
} from "@/lib/reservations/operating-hours"

const SLOT_INTERVAL = 30

function dinnerWeek(
  bookableSlots: { time: string; max_covers?: number | null }[],
): OperatingDay[] {
  const dinner: OperatingSegment = {
    label: "Dinner",
    opens_at: "18:00",
    closes_at: "22:00",
    sort_order: 0,
    bookable_slots: bookableSlots,
  }
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    is_closed: day_of_week === 0,
    segments: day_of_week === 0 ? [] : [dinner],
  }))
}

function dinnerWeekWithServiceMax(maxCovers: number | null): OperatingDay[] {
  const days = dinnerWeek([])
  for (const day of days) {
    for (const segment of day.segments) {
      segment.max_covers = maxCovers
    }
  }
  return days
}

describe("cover limits — staff bookable slots (CL-1)", () => {
  it("accepts on-grid service slots and rejects off-grid or outside-window times", () => {
    expect(DEFAULT_SLOT_INTERVAL_MINUTES).toBe(SLOT_INTERVAL)
    expect(clampSlotIntervalMinutes(SLOT_INTERVAL)).toBe(SLOT_INTERVAL)

    expect(
      validateOperatingDays(
        dinnerWeek([{ time: "19:00" }, { time: "20:00" }]),
        SLOT_INTERVAL,
      ),
    ).toBeNull()

    expect(validateOperatingDays(dinnerWeek([]), SLOT_INTERVAL)).toBeNull()

    const offGrid: unknown = validateOperatingDays(
      dinnerWeek([{ time: "19:15" }]),
      SLOT_INTERVAL,
    )
    expect(offGrid).toEqual({
      key: "errors.scheduling.slotOffGrid",
      params: { day: "Monday", interval: SLOT_INTERVAL },
    })

    const outsideWindow: unknown = validateOperatingDays(
      dinnerWeek([{ time: "17:30" }]),
      SLOT_INTERVAL,
    )
    expect(outsideWindow).toEqual({
      key: "errors.scheduling.slotOutsideWindow",
      params: { day: "Monday" },
    })

    const manager = readFileSync(
      path.join(process.cwd(), "components/staff/scheduling-manager.tsx"),
      "utf8",
    )
    expect(manager).toMatch(/scheduling-slot-row/)
    expect(manager).toMatch(/scheduling-slot-time/)
  })
})

describe("cover limits — duplicate bookable-slot times (CL-1-DUP)", () => {
  it("rejects duplicate bookable-slot times in one segment", () => {
    const exactDuplicate: unknown = validateOperatingDays(
      dinnerWeek([{ time: "19:00" }, { time: "19:00" }]),
      SLOT_INTERVAL,
    )
    expect(exactDuplicate).toEqual({
      key: "errors.scheduling.duplicateSlotTime",
      params: { day: "Monday" },
    })

    const normalizedDuplicate: unknown = validateOperatingDays(
      dinnerWeek([{ time: "19:00" }, { time: "19:00:00" }]),
      SLOT_INTERVAL,
    )
    expect(normalizedDuplicate).toEqual({
      key: "errors.scheduling.duplicateSlotTime",
      params: { day: "Monday" },
    })

    expect(
      validateOperatingDays(
        dinnerWeek([{ time: "19:00" }, { time: "20:00" }]),
        SLOT_INTERVAL,
      ),
    ).toBeNull()

    for (const locale of ["en", "fr"]) {
      const catalog = JSON.parse(
        readFileSync(
          path.join(process.cwd(), "messages", `${locale}.json`),
          "utf8",
        ),
      ) as { errors: { scheduling: Record<string, unknown> } }
      expect(catalog.errors.scheduling).toHaveProperty("duplicateSlotTime")
    }
  })
})

describe("cover limits — independent slot maxima (CL-2)", () => {
  it("allows different max_covers on slots in the same service and rejects non-positive values", () => {
    expect(
      validateOperatingDays(
        dinnerWeek([
          { time: "19:00", max_covers: 12 },
          { time: "20:00", max_covers: 8 },
        ]),
        SLOT_INTERVAL,
      ),
    ).toBeNull()

    expect(
      validateOperatingDays(
        dinnerWeek([{ time: "19:00" }, { time: "20:00", max_covers: null }]),
        SLOT_INTERVAL,
      ),
    ).toBeNull()

    for (const max_covers of [0, -1, 1.5]) {
      const message: unknown = validateOperatingDays(
        dinnerWeek([{ time: "19:00", max_covers }]),
        SLOT_INTERVAL,
      )
      expect(message).toEqual({
        key: "errors.scheduling.invalidSlotMax",
        params: { day: "Monday" },
      })
    }

    const manager = readFileSync(
      path.join(process.cwd(), "components/staff/scheduling-manager.tsx"),
      "utf8",
    )
    expect(manager).toMatch(/scheduling-slot-max-covers/)
  })
})

describe("cover limits — service maximum (CL-3)", () => {
  it("accepts a service max_covers of at least 1 and rejects invalid values", () => {
    expect(
      validateOperatingDays(dinnerWeekWithServiceMax(24), SLOT_INTERVAL),
    ).toBeNull()

    expect(validateOperatingDays(dinnerWeek([]), SLOT_INTERVAL)).toBeNull()

    expect(
      validateOperatingDays(dinnerWeekWithServiceMax(null), SLOT_INTERVAL),
    ).toBeNull()

    for (const maxCovers of [0, -1, 1.5]) {
      const message: unknown = validateOperatingDays(
        dinnerWeekWithServiceMax(maxCovers),
        SLOT_INTERVAL,
      )
      expect(message).toEqual({
        key: "errors.scheduling.invalidServiceMax",
        params: { day: "Monday" },
      })
    }

    const manager = readFileSync(
      path.join(process.cwd(), "components/staff/scheduling-manager.tsx"),
      "utf8",
    )
    expect(manager).toMatch(/scheduling-service-max-covers/)
  })
})

describe("cover limits — persist and edit round-trip (CL-4)", () => {
  it("flattenDaysToRows and WINDOW_COLUMNS round-trip slot and service cover limits", () => {
    const bookableSlots = [
      { time: "19:00", max_covers: 12 },
      { time: "21:00", max_covers: 8 },
    ]
    const days = dinnerWeek(bookableSlots)
    for (const day of days) {
      for (const segment of day.segments) {
        segment.max_covers = 24
      }
    }

    const rows = flattenDaysToRows(days)
    const wednesday = rows.find(
      (row) => row.day_of_week === 3 && !row.is_closed,
    )
    expect(wednesday).toEqual(
      expect.objectContaining({
        max_covers: 24,
        bookable_slots: bookableSlots,
      }),
    )

    expect(groupRowsByDay(rows)[3]?.segments[0]).toEqual(
      expect.objectContaining({
        max_covers: 24,
        bookable_slots: bookableSlots,
      }),
    )

    const availability = readFileSync(
      path.join(process.cwd(), "app/actions/availability.ts"),
      "utf8",
    )
    expect(availability).toMatch(/WINDOW_COLUMNS\s*=\s*"[^"]*max_covers/)
    expect(availability).toMatch(/WINDOW_COLUMNS\s*=\s*"[^"]*bookable_slots/)

    const manager = readFileSync(
      path.join(process.cwd(), "components/staff/scheduling-manager.tsx"),
      "utf8",
    )
    const toOperatingDaysStart = manager.indexOf("function toOperatingDays")
    const toOperatingDaysEnd = manager.indexOf(
      "\nconst TIME_INPUT_CLS",
      toOperatingDaysStart,
    )
    const toOperatingDaysSrc = manager.slice(
      toOperatingDaysStart,
      toOperatingDaysEnd,
    )
    expect(toOperatingDaysSrc).toContain("function toOperatingDays")
    expect(toOperatingDaysSrc).toMatch(/bookable_slots/)
    expect(toOperatingDaysSrc).toMatch(/max_covers/)
  })
})

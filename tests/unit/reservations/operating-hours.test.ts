import { describe, expect, it } from "vitest"
import { DEFAULT_EXPECTED_MINUTES } from "@/lib/floor/table-use"
import {
  assignSegmentForTime,
  bookableTimesForDay,
  clampSlotIntervalMinutes,
  flattenDaysToRows,
  formatSegmentsSummary,
  generateSlotsForSegments,
  groupBookableSlots,
  groupRowsByDay,
  isTimeWithinSegments,
  nextSuggestedSegment,
  normalizeTime,
  slotUntilTime,
  summarizeOperatingDays,
  validateOperatingDays,
  type OperatingDay,
} from "@/lib/reservations/operating-hours"

const EXAMPLE_SEGMENTS = [
  { label: "Morning", opens_at: "09:00", closes_at: "11:00", sort_order: 0 },
  { label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 1 },
  { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 2 },
]

function openWeek(segments = EXAMPLE_SEGMENTS): OperatingDay[] {
  return Array.from({ length: 7 }, (_, day_of_week) => ({
    day_of_week,
    is_closed: day_of_week === 0,
    segments: day_of_week === 0 ? [] : segments,
  }))
}

describe("normalizeTime", () => {
  it("strips Postgres TIME seconds and pads hours", () => {
    expect(normalizeTime("09:00:00")).toBe("09:00")
    expect(normalizeTime("9:00")).toBe("09:00")
    expect(normalizeTime("18:30:00.000")).toBe("18:30")
  })
})

describe("isTimeWithinSegments", () => {
  it("accepts times inside morning, lunch, or dinner and rejects the gaps", () => {
    expect(isTimeWithinSegments("09:00", EXAMPLE_SEGMENTS)).toBe(true)
    expect(isTimeWithinSegments("10:30", EXAMPLE_SEGMENTS)).toBe(true)
    expect(isTimeWithinSegments("11:00", EXAMPLE_SEGMENTS)).toBe(true)
    expect(isTimeWithinSegments("13:00", EXAMPLE_SEGMENTS)).toBe(true)
    expect(isTimeWithinSegments("18:00", EXAMPLE_SEGMENTS)).toBe(true)
    expect(isTimeWithinSegments("22:00", EXAMPLE_SEGMENTS)).toBe(true)

    expect(isTimeWithinSegments("11:30", EXAMPLE_SEGMENTS)).toBe(false)
    expect(isTimeWithinSegments("15:00", EXAMPLE_SEGMENTS)).toBe(false)
    expect(isTimeWithinSegments("17:30", EXAMPLE_SEGMENTS)).toBe(false)
  })
})

describe("assignSegmentForTime", () => {
  it("assigns a shared boundary time to exactly one segment (later opens_at wins)", () => {
    const segments = [
      { label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 0 },
      {
        label: "Afternoon",
        opens_at: "14:00",
        closes_at: "18:00",
        sort_order: 1,
      },
    ]
    expect(assignSegmentForTime("14:00", segments)?.label).toBe("Afternoon")
  })
})

describe("slotUntilTime", () => {
  it("slot until time is start plus 90 minutes and wraps past midnight", () => {
    expect(DEFAULT_EXPECTED_MINUTES).toBe(90)
    expect(slotUntilTime("12:00")).toBe("13:30")
    expect(slotUntilTime("23:00")).toBe("00:30")
    expect(slotUntilTime("23:00")).not.toBe("24:30")
  })
})

describe("clampSlotIntervalMinutes", () => {
  it("clampSlotIntervalMinutes accepts 15/30/60 and defaults to 30", () => {
    expect(clampSlotIntervalMinutes(15)).toBe(15)
    expect(clampSlotIntervalMinutes(30)).toBe(30)
    expect(clampSlotIntervalMinutes(60)).toBe(60)
    expect(clampSlotIntervalMinutes(20)).toBe(30)
    expect(clampSlotIntervalMinutes(Number.NaN)).toBe(30)
  })
})

describe("generateSlotsForSegments / bookableTimesForDay", () => {
  it("emits 30-minute slots only inside each segment", () => {
    expect(generateSlotsForSegments(EXAMPLE_SEGMENTS)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00",
      "20:30",
      "21:00",
      "21:30",
      "22:00",
    ])
  })

  it("returns no slots for a closed day", () => {
    expect(
      bookableTimesForDay({
        day_of_week: 0,
        is_closed: true,
        segments: EXAMPLE_SEGMENTS,
      }),
    ).toEqual([])
  })
})

describe("validateOperatingDays", () => {
  it("accepts the example three-segment week", () => {
    expect(validateOperatingDays(openWeek())).toBeNull()
  })

  it("rejects overlapping segments on an open day", () => {
    const days = openWeek([
      { label: "Brunch", opens_at: "09:00", closes_at: "13:00", sort_order: 0 },
      { label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 1 },
    ])
    expect(validateOperatingDays(days)).toMatch(/overlapping/i)
  })

  it("rejects an open day with no segments", () => {
    const days = openWeek()
    days[1] = { day_of_week: 1, is_closed: false, segments: [] }
    expect(validateOperatingDays(days)).toMatch(/no segments/i)
  })

  it("rejects a segment that closes before it opens", () => {
    const days = openWeek([
      { label: "Broken", opens_at: "14:00", closes_at: "12:00", sort_order: 0 },
    ])
    expect(validateOperatingDays(days)).toMatch(/closes before it opens/i)
  })
})

describe("groupRowsByDay / flattenDaysToRows", () => {
  it("groups multiple Postgres rows for one weekday into labeled segments", () => {
    const days = groupRowsByDay([
      {
        day_of_week: 0,
        opens_at: "00:00:00",
        closes_at: "00:00:00",
        is_closed: true,
        label: null,
        sort_order: 0,
      },
      {
        day_of_week: 3,
        opens_at: "09:00:00",
        closes_at: "11:00:00",
        is_closed: false,
        label: "Morning",
        sort_order: 0,
      },
      {
        day_of_week: 3,
        opens_at: "12:00:00",
        closes_at: "14:00:00",
        is_closed: false,
        label: "Lunch",
        sort_order: 1,
      },
      {
        day_of_week: 3,
        opens_at: "18:00:00",
        closes_at: "22:00:00",
        is_closed: false,
        label: "Dinner",
        sort_order: 2,
      },
    ])

    expect(days[0]?.is_closed).toBe(true)
    expect(days[3]?.is_closed).toBe(false)
    expect(days[3]?.segments).toEqual(EXAMPLE_SEGMENTS)
    expect(days[1]?.segments[0]).toMatchObject({
      opens_at: "09:00",
      closes_at: "22:00",
    })
  })

  it("round-trips a segmented week into one row per segment", () => {
    const rows = flattenDaysToRows(openWeek())
    expect(rows.filter((row) => row.day_of_week === 0)).toEqual([
      expect.objectContaining({
        is_closed: true,
        opens_at: "00:00",
        closes_at: "00:00",
      }),
    ])
    expect(rows.filter((row) => row.day_of_week === 1)).toHaveLength(3)
    expect(groupRowsByDay(rows)[1]?.segments.map((s) => s.label)).toEqual([
      "Morning",
      "Lunch",
      "Dinner",
    ])
  })
})

describe("summarizeOperatingDays", () => {
  it("groups consecutive weekdays with identical hours", () => {
    const days = openWeek([
      { label: "", opens_at: "09:00", closes_at: "22:00", sort_order: 0 },
    ])
    expect(summarizeOperatingDays(days)).toBe(
      "Mon–Sat · 09:00–22:00; Sun · Closed",
    )
  })

  it("keeps split shifts in the generated summary", () => {
    const days = openWeek([
      { label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 0 },
      { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 1 },
    ])
    expect(summarizeOperatingDays(days)).toContain(
      "Mon–Sat · Lunch 12:00–14:00, Dinner 18:00–22:00",
    )
  })

  it("returns a clear fallback for an empty schedule", () => {
    expect(summarizeOperatingDays([])).toBe("Hours unavailable")
  })
})

describe("nextSuggestedSegment / formatSegmentsSummary", () => {
  it("suggests Lunch as the second segment, even after an all-day window", () => {
    expect(nextSuggestedSegment([EXAMPLE_SEGMENTS[0]]).label).toBe("Lunch")
    expect(
      nextSuggestedSegment([
        { label: null, opens_at: "09:00", closes_at: "22:00", sort_order: 0 },
      ]),
    ).toMatchObject({ label: "Lunch", opens_at: "12:00", closes_at: "14:00" })
  })

  it("formats labeled segments for guest-facing errors", () => {
    expect(formatSegmentsSummary(EXAMPLE_SEGMENTS)).toBe(
      "Morning 09:00–11:00, Lunch 12:00–14:00, Dinner 18:00–22:00",
    )
  })
})

describe("groupBookableSlots", () => {
  it("groupBookableSlots groups times by sort_order, falls back unlabeled to the time range, omits empty groups, attaches guest_note", () => {
    const segments = [
      {
        label: "Soir",
        opens_at: "18:00",
        closes_at: "22:00",
        sort_order: 3,
        guest_note: "",
      },
      {
        label: "Midi",
        opens_at: "12:00",
        closes_at: "14:00",
        sort_order: 1,
        guest_note: "Cuisine du marché",
      },
      {
        label: "Goûter",
        opens_at: "15:30",
        closes_at: "16:30",
        sort_order: 2,
        guest_note: "",
      },
      {
        label: null,
        opens_at: "09:00",
        closes_at: "11:00",
        sort_order: 0,
        guest_note: "   ",
      },
    ]
    const times = ["09:00", "10:30", "12:30", "13:00", "18:00", "20:00"]

    const groups = groupBookableSlots(times, segments)

    expect(groups).toEqual([
      { label: "09:00–11:00", times: ["09:00", "10:30"] },
      {
        label: "Midi",
        times: ["12:30", "13:00"],
        guest_note: "Cuisine du marché",
      },
      { label: "Soir", times: ["18:00", "20:00"] },
    ])
    expect(groups[0]).not.toHaveProperty("guest_note")
    expect(groups[2]).not.toHaveProperty("guest_note")
    expect(
      groups
        .filter((group) => group.times.includes("12:30"))
        .map((group) => group.label),
    ).toEqual(["Midi"])
  })
})

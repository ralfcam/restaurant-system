import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import type { SlotAvailability } from "@/app/actions/reservations"
import {
  SUGGESTED_SEGMENTS,
  assignSegmentForTime,
  type OperatingDay,
} from "@/lib/reservations/operating-hours"

const SELECTED_WEDNESDAY = "2026-09-16"

const LUNCH = {
  label: "Lunch",
  opens_at: "12:00",
  closes_at: "14:00",
  sort_order: 0,
}
const DINNER = {
  label: "Dinner",
  opens_at: "18:00",
  closes_at: "22:00",
  sort_order: 1,
}
const BREAKFAST = {
  label: "Breakfast",
  opens_at: "08:00",
  closes_at: "10:30",
  sort_order: 0,
}

function configuredWeek(): OperatingDay[] {
  return [
    { day_of_week: 0, is_closed: true, segments: [] },
    { day_of_week: 1, is_closed: false, segments: [LUNCH, DINNER] },
    { day_of_week: 2, is_closed: true, segments: [] },
    { day_of_week: 3, is_closed: false, segments: [BREAKFAST] },
    { day_of_week: 4, is_closed: true, segments: [] },
    { day_of_week: 5, is_closed: true, segments: [] },
    { day_of_week: 6, is_closed: true, segments: [] },
  ]
}

describe("weekly service overview", () => {
  it("selected week lists seven days and only each day's configured services", async () => {
    const { buildWeeklyServiceOverview } =
      await import("@/lib/floor/weekly-service-overview")
    const overview = buildWeeklyServiceOverview({
      selectedDate: SELECTED_WEDNESDAY,
      operatingDays: configuredWeek(),
    })

    expect(overview.days).toHaveLength(7)
    expect(overview.days.map((day) => day.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ])

    const serviceLabels = overview.days.map((day) =>
      day.services.map((service) => service.label),
    )
    expect(serviceLabels).toEqual([
      ["Lunch", "Dinner"],
      [],
      ["Breakfast"],
      [],
      [],
      [],
      [],
    ])

    const sundayLabels = serviceLabels[6] ?? []
    expect(sundayLabels).toEqual([])
    for (const template of SUGGESTED_SEGMENTS) {
      expect(sundayLabels).not.toContain(template.label)
    }
  })

  it("configured services use staff labels and BW-4 time-range fallback", async () => {
    const { buildWeeklyServiceOverview } =
      await import("@/lib/floor/weekly-service-overview")
    const overview = buildWeeklyServiceOverview({
      selectedDate: SELECTED_WEDNESDAY,
      operatingDays: [
        { day_of_week: 0, is_closed: true, segments: [] },
        {
          day_of_week: 1,
          is_closed: false,
          segments: [{ ...LUNCH, label: "  " }, DINNER],
        },
        {
          day_of_week: 2,
          is_closed: false,
          segments: [{ ...LUNCH, label: null }],
        },
        { day_of_week: 3, is_closed: true, segments: [] },
        { day_of_week: 4, is_closed: true, segments: [] },
        { day_of_week: 5, is_closed: true, segments: [] },
        { day_of_week: 6, is_closed: true, segments: [] },
      ],
    })

    const mondayLabels = overview.days[0]?.services.map(
      (service) => service.label,
    )
    const tuesdayLabels = overview.days[1]?.services.map(
      (service) => service.label,
    )

    expect(mondayLabels).toEqual(["12:00–14:00", "Dinner"])
    expect(tuesdayLabels).toEqual(["12:00–14:00"])
  })

  it("service is available when an existing bookable slot remains and fully booked when none remain", async () => {
    const { buildWeeklyServiceOverview } =
      await import("@/lib/floor/weekly-service-overview")
    const mondaySegments = [LUNCH, DINNER]
    expect(assignSegmentForTime("12:00", mondaySegments)?.label).toBe("Lunch")
    expect(assignSegmentForTime("13:30", mondaySegments)?.label).toBe("Lunch")
    expect(assignSegmentForTime("19:00", mondaySegments)?.label).toBe("Dinner")

    const mondaySlots: SlotAvailability[] = [
      { time: "12:00", available: false },
      { time: "12:30", available: false },
      { time: "13:30", available: false },
      { time: "18:30", available: false },
      { time: "19:00", available: true },
    ]

    const overview = buildWeeklyServiceOverview({
      selectedDate: SELECTED_WEDNESDAY,
      operatingDays: configuredWeek(),
      slotsByDate: {
        "2026-09-14": mondaySlots,
      },
    })

    const mondayServices = overview.days[0]?.services ?? []
    const lunch = mondayServices.find((service) => service.label === "Lunch")
    const dinner = mondayServices.find((service) => service.label === "Dinner")

    expect(lunch?.status).toBe("fully_booked")
    expect(dinner?.status).toBe("available")

    const helperSource = readFileSync(
      path.join(process.cwd(), "lib/floor/weekly-service-overview.ts"),
      "utf8",
    )
    expect(helperSource).not.toMatch(/\bgetAvailableSlots\b/)
    expect(helperSource).not.toMatch(/\bparty_size\b/)
    expect(helperSource).not.toMatch(/\boccupyingWindowMinutes\b/)
  })

  it("previous and next week shift dates and recompute availability", async () => {
    const { buildWeeklyServiceOverview, shiftSelectedWeek } =
      await import("@/lib/floor/weekly-service-overview")

    const monday = "2026-09-14"
    expect(shiftSelectedWeek(monday, 1)).toBe("2026-09-21")
    expect(shiftSelectedWeek(monday, -1)).toBe("2026-09-07")

    const current = buildWeeklyServiceOverview({
      selectedDate: monday,
      operatingDays: configuredWeek(),
      slotsByDate: {
        [monday]: [{ time: "19:00", available: true }],
      },
    })
    const next = buildWeeklyServiceOverview({
      selectedDate: shiftSelectedWeek(monday, 1),
      operatingDays: configuredWeek(),
      slotsByDate: {
        "2026-09-21": [{ time: "19:00", available: false }],
      },
    })
    const previous = buildWeeklyServiceOverview({
      selectedDate: shiftSelectedWeek(monday, -1),
      operatingDays: configuredWeek(),
    })

    expect(current.days.map((day) => day.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ])
    expect(next.days.map((day) => day.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ])
    expect(previous.days.map((day) => day.date)).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ])

    const currentDinner = current.days[0]?.services.find(
      (service) => service.label === "Dinner",
    )
    const nextDinner = next.days[0]?.services.find(
      (service) => service.label === "Dinner",
    )
    expect(currentDinner?.status).toBe("available")
    expect(nextDinner?.status).toBe("fully_booked")
  })

  it("reloaded slot availability flips service status", async () => {
    const { buildWeeklyServiceOverview } =
      await import("@/lib/floor/weekly-service-overview")
    const monday = "2026-09-14"
    const operatingDays = configuredWeek()
    const dinnerSlot = (available: boolean): SlotAvailability => ({
      time: "19:00",
      available,
    })

    const dinnerStatus = (slotsByDate: Record<string, SlotAvailability[]>) => {
      const overview = buildWeeklyServiceOverview({
        selectedDate: SELECTED_WEDNESDAY,
        operatingDays,
        slotsByDate,
      })
      return overview.days[0]?.services.find(
        (service) => service.label === "Dinner",
      )?.status
    }

    expect(
      dinnerStatus({
        [monday]: [dinnerSlot(true)],
      }),
    ).toBe("available")
    expect(
      dinnerStatus({
        [monday]: [dinnerSlot(false), { time: "20:00", available: false }],
      }),
    ).toBe("fully_booked")
    expect(
      dinnerStatus({
        [monday]: [dinnerSlot(false), { time: "20:30", available: true }],
      }),
    ).toBe("available")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  isDateBlocked: vi.fn(),
  getOperatingWindowForDate: vi.fn(),
  from: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "10:00"),
}))

vi.mock("@/app/actions/availability", () => ({
  isDateBlocked: mocks.isDateBlocked,
  getOperatingWindowForDate: mocks.getOperatingWindowForDate,
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: mocks.today,
  getNowTimeInRestaurantTZ: mocks.nowTime,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({}),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff-1" } } }) },
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

type Row = Record<string, unknown>

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      return () => self
    },
  })
  return self
}

const lunchWindow = {
  day_of_week: 2,
  is_closed: false,
  segments: [
    { label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 0 },
  ],
}

const dinnerWindow = {
  day_of_week: 2,
  is_closed: false,
  segments: [
    { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 0 },
  ],
}

describe("getAvailableSlots", () => {
  beforeEach(() => {
    mocks.isDateBlocked.mockReset()
    mocks.getOperatingWindowForDate.mockReset()
    mocks.from.mockReset()
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("10:00")
    mocks.isDateBlocked.mockResolvedValue(false)
    mocks.getOperatingWindowForDate.mockResolvedValue(lunchWindow)
    mocks.from.mockImplementation((name: string) => {
      if (name === "restaurant_settings") {
        return thenable({
          data: {
            slot_interval_minutes: 15,
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      if (name === "tables") {
        return thenable({ data: [{ seats: 40 }], error: null })
      }
      if (name === "reservations") {
        return thenable({ data: [], error: null })
      }
      return thenable({ data: [], error: null })
    })
  })

  it("getAvailableSlots emits 15-minute times when restaurant_settings.slot_interval_minutes is 15", async () => {
    const { getAvailableSlots } = await import("@/app/actions/reservations")
    const slots = await getAvailableSlots("2026-08-25", 2)
    expect(slots.map((slot) => slot.time)).toContain("12:15")
  })

  describe("occupancy-window cover counting", () => {
    const totalCapacity = 40

    function stubFrom(reservations: Row[]) {
      mocks.from.mockImplementation((name: string) => {
        if (name === "restaurant_settings") {
          return thenable({
            data: {
              slot_interval_minutes: 15,
              occupancy_duration_minutes: 90,
              safety_buffer_minutes: 15,
            },
            error: null,
          })
        }
        if (name === "tables") {
          return thenable({ data: [{ seats: totalCapacity }], error: null })
        }
        if (name === "reservations") {
          return thenable({ data: reservations, error: null })
        }
        return thenable({ data: [], error: null })
      })
    }

    beforeEach(() => {
      mocks.getOperatingWindowForDate.mockResolvedValue(dinnerWindow)
    })

    it("counts occupying covers across the occupancy window, not only the same slot", async () => {
      const { getAvailableSlots } = await import("@/app/actions/reservations")
      const date = "2026-08-25"

      stubFrom([
        {
          time: "19:00",
          party_size: totalCapacity,
          status: "confirmed",
        },
      ])
      const fullHold = await getAvailableSlots(date, 2)
      expect(fullHold.map((slot) => slot.time)).toEqual(
        expect.arrayContaining(["20:30", "20:45"]),
      )
      expect(fullHold.find((slot) => slot.time === "20:30")).toEqual({
        time: "20:30",
        available: false,
      })
      expect(fullHold.find((slot) => slot.time === "20:45")).toEqual({
        time: "20:45",
        available: true,
      })

      stubFrom([
        {
          time: "19:00",
          party_size: 2,
          status: "confirmed",
        },
      ])
      const leftover = await getAvailableSlots(date, 2)
      expect(leftover.find((slot) => slot.time === "19:00")).toEqual({
        time: "19:00",
        available: true,
      })
    })

    it("releases 20:30 when a full-floor 19:00 hold is completed, cancelled, or no_show, while seated still occupies", async () => {
      const { getAvailableSlots } = await import("@/app/actions/reservations")
      const date = "2026-08-25"

      for (const status of ["completed", "cancelled", "no_show"]) {
        stubFrom([
          {
            time: "19:00",
            party_size: totalCapacity,
            status,
          },
        ])
        const released = await getAvailableSlots(date, 2)
        expect(released.map((slot) => slot.time)).toEqual(
          expect.arrayContaining(["20:30"]),
        )
        expect(released.find((slot) => slot.time === "20:30")).toEqual({
          time: "20:30",
          available: true,
        })
      }

      stubFrom([
        {
          time: "19:00",
          party_size: totalCapacity,
          status: "seated",
        },
      ])
      const seatedHold = await getAvailableSlots(date, 2)
      expect(seatedHold.find((slot) => slot.time === "20:30")).toEqual({
        time: "20:30",
        available: false,
      })
    })

    it("offers 21:00 as the first generated slot at or after exclusive-end on a 30-minute grid", async () => {
      const { getAvailableSlots } = await import("@/app/actions/reservations")
      const date = "2026-08-25"

      mocks.from.mockImplementation((name: string) => {
        if (name === "restaurant_settings") {
          return thenable({
            data: {
              slot_interval_minutes: 30,
              occupancy_duration_minutes: 90,
              safety_buffer_minutes: 15,
            },
            error: null,
          })
        }
        if (name === "tables") {
          return thenable({ data: [{ seats: totalCapacity }], error: null })
        }
        if (name === "reservations") {
          return thenable({
            data: [
              {
                time: "19:00",
                party_size: totalCapacity,
                status: "confirmed",
              },
            ],
            error: null,
          })
        }
        return thenable({ data: [], error: null })
      })

      const slots = await getAvailableSlots(date, 2)
      expect(slots.map((slot) => slot.time)).toEqual(
        expect.arrayContaining(["20:30", "21:00"]),
      )
      expect(slots.map((slot) => slot.time)).not.toContain("20:45")
      expect(slots.find((slot) => slot.time === "20:30")).toEqual({
        time: "20:30",
        available: false,
      })
      expect(slots.find((slot) => slot.time === "21:00")).toEqual({
        time: "21:00",
        available: true,
      })
    })
  })

  describe("table-fit when covers still fit", () => {
    // Covers fit (16 >= 8+8); only one unit has seats >= 8.
    const tables = [
      { id: "t-8", label: "8", seats: 8, status: "available" },
      { id: "t-1", label: "1", seats: 2, status: "available" },
      { id: "t-2", label: "2", seats: 2, status: "available" },
      { id: "t-3", label: "3", seats: 2, status: "available" },
      { id: "t-4", label: "4", seats: 2, status: "available" },
    ]

    beforeEach(() => {
      mocks.getOperatingWindowForDate.mockResolvedValue(dinnerWindow)
      mocks.from.mockImplementation((name: string) => {
        if (name === "restaurant_settings") {
          return thenable({
            data: {
              slot_interval_minutes: 15,
              occupancy_duration_minutes: 90,
              safety_buffer_minutes: 15,
            },
            error: null,
          })
        }
        if (name === "tables") {
          return thenable({ data: tables, error: null })
        }
        if (name === "reservations") {
          return thenable({
            data: [
              {
                id: "occ-8",
                time: "19:00",
                party_size: 8,
                status: "confirmed",
                table_label: null,
                created_at: "2026-08-01T10:00:00.000Z",
              },
            ],
            error: null,
          })
        }
        return thenable({ data: [], error: null })
      })
    })

    it("does not offer a slot when covers fit but no compatible table remains", async () => {
      const { getAvailableSlots } = await import("@/app/actions/reservations")
      const slots = await getAvailableSlots("2026-08-25", 8)
      expect(slots.find((slot) => slot.time === "19:00")).toEqual({
        time: "19:00",
        available: false,
      })
      expect(slots.find((slot) => slot.time === "21:00")).toEqual({
        time: "21:00",
        available: true,
      })
    })
  })
})

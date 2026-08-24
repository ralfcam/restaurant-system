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
        return (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data) ? payload.data[0] ?? null : payload.data
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
  segments: [{ label: "Lunch", opens_at: "12:00", closes_at: "14:00", sort_order: 0 }],
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
        return thenable({ data: { slot_interval_minutes: 15 }, error: null })
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
})

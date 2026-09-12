import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  today: vi.fn(() => "2026-09-12"),
  dayOfWeek: vi.fn((dateISO: string) => {
    if (dateISO === "2026-09-10") return 1
    if (dateISO === "2026-09-11") return 6
    return 3
  }),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: mocks.today,
  getDayOfWeekInRestaurantTZ: mocks.dayOfWeek,
}))

type AnalyticsPeriodInput = {
  from?: string
  to?: string
  preset?: 7 | 30 | 90
}

type Histogram = Record<string, number>

type PatternsSlice = {
  date?: Histogram
  weekday?: Histogram
  hour?: Histogram
  party_size?: Histogram
}

type AnalyticsResult = {
  error?: string
  from?: string
  to?: string
  patterns?: PatternsSlice
  guest_name?: string
  email?: string
  phone?: string
}

type Row = Record<string, unknown>

const RANGE = { from: "2026-09-06", to: "2026-09-12" } as const

const PII = {
  guest_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
} as const

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

function stubFrom(input: { reservations: Row[]; statusEvents?: Row[] }) {
  mocks.from.mockImplementation((name: string) => {
    if (name === "reservations") {
      return thenable({ data: input.reservations, error: null })
    }
    if (name === "status_events") {
      return thenable({ data: input.statusEvents ?? [], error: null })
    }
    return thenable({ data: [], error: null })
  })
}

function histogramSum(histogram: Histogram | undefined) {
  return Object.values(histogram ?? {}).reduce((sum, count) => sum + count, 0)
}

describe("getReservationAnalytics booking patterns", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.today.mockReset()
    mocks.dayOfWeek.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-09-12")
    mocks.dayOfWeek.mockImplementation((dateISO: string) => {
      if (dateISO === "2026-09-10") return 1
      if (dateISO === "2026-09-11") return 6
      return 3
    })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("restaurant-level histograms by date weekday hour party_size", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<AnalyticsResult>

    stubFrom({
      reservations: [
        {
          id: "r-confirmed",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "confirmed",
          ...PII,
        },
        {
          id: "r-seated",
          date: "2026-09-10",
          time: "19:30",
          party_size: 4,
          status: "seated",
          ...PII,
        },
        {
          id: "r-malformed",
          date: "2026-09-10",
          time: "not-a-time",
          party_size: 4,
          status: "cancelled",
          ...PII,
        },
        {
          id: "r-completed",
          date: "2026-09-11",
          time: "00:15",
          party_size: 2,
          status: "completed",
          ...PII,
        },
        {
          id: "r-noshow",
          date: "2026-09-11",
          time: "23:45",
          party_size: 4,
          status: "no_show",
          ...PII,
        },
        {
          id: "r-bad-hour",
          date: "2026-09-11",
          time: "25:00",
          party_size: 4,
          status: "cancelled",
          ...PII,
        },
        {
          id: "r-out-of-range",
          date: "2026-09-01",
          time: "19:00",
          party_size: 8,
          status: "confirmed",
          ...PII,
        },
      ],
    })

    const result = await load(RANGE)
    expect(result).not.toHaveProperty("error")
    expect(result.patterns).toEqual(
      expect.objectContaining({
        date: { "2026-09-10": 3, "2026-09-11": 3 },
        weekday: expect.objectContaining({ 1: 3, 6: 3 }),
        hour: expect.objectContaining({ 0: 1, 19: 2, 23: 1 }),
        party_size: { 2: 2, 4: 4 },
      }),
    )
    expect(result.patterns?.weekday?.[3] ?? 0).toBe(0)
    expect(result.patterns?.weekday?.[4] ?? 0).toBe(0)
    expect(result.patterns?.party_size?.[8] ?? 0).toBe(0)
    expect(result.patterns?.hour?.[25] ?? 0).toBe(0)
    expect(histogramSum(result.patterns?.date)).toBe(6)
    expect(histogramSum(result.patterns?.weekday)).toBe(6)
    expect(histogramSum(result.patterns?.party_size)).toBe(6)
    expect(histogramSum(result.patterns?.hour)).toBe(4)

    const payload = JSON.stringify(result)
    expect(payload).not.toMatch(/"guest_name"/)
    expect(payload).not.toMatch(/"email"/)
    expect(payload).not.toMatch(/"phone"/)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  today: vi.fn(() => "2026-09-12"),
  dayOfWeek: vi.fn((dateISO: string) => {
    if (dateISO === "2026-08-01") return 6
    if (dateISO === "2026-09-10") return 4
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

type DurationSlice = {
  sample_count?: number
  mean_minutes?: number | null
  occupancy_duration_minutes?: number
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
  noShow?: number
  cancelled?: number
  duration?: DurationSlice
  patterns?: PatternsSlice
  occupancy_duration_minutes?: number
}

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
      if (prop === "gte") {
        return (...args: unknown[]) => {
          mocks.gte(...args)
          return self
        }
      }
      if (prop === "lte") {
        return (...args: unknown[]) => {
          mocks.lte(...args)
          return self
        }
      }
      return () => self
    },
  })
  return self
}

const OCCUPANCY_MINUTES = 120

function stubFrom(input: {
  reservations: Row[]
  statusEvents: Row[]
  occupancyMinutes?: number
}) {
  mocks.from.mockImplementation((name: string) => {
    if (name === "reservations") {
      return thenable({ data: input.reservations, error: null })
    }
    if (name === "status_events") {
      return thenable({ data: input.statusEvents, error: null })
    }
    if (name === "restaurant_settings") {
      return thenable({
        data: {
          occupancy_duration_minutes:
            input.occupancyMinutes ?? OCCUPANCY_MINUTES,
        },
        error: null,
      })
    }
    return thenable({ data: [], error: null })
  })
}

describe("getReservationAnalytics fail-closed load", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("does not present auth or query failure as a successful empty period", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await getReservationAnalytics()
    expect(unauthorized).toEqual({ error: "Unauthorized." })
    expect(unauthorized).not.toEqual({ noShow: 0, cancelled: 0 })

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() =>
      thenable({
        data: null,
        error: { message: "could not query reservations" },
      }),
    )
    const queryFailed = await getReservationAnalytics()
    expect(queryFailed).toEqual({ error: "Could not load analytics." })
    expect(queryFailed).not.toEqual({ noShow: 0, cancelled: 0 })

    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    const emptyPeriod = await getReservationAnalytics()
    expect(emptyPeriod).not.toHaveProperty("error")
    expect(emptyPeriod).toEqual(
      expect.objectContaining({ noShow: 0, cancelled: 0 }),
    )
  })
})

describe("getReservationAnalytics reporting period", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.gte.mockReset()
    mocks.lte.mockReset()
    mocks.today.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-09-12")
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("rejects inverted or invalid period and defaults last 7 restaurant-local days", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<{
      error?: string
      from?: string
      to?: string
      noShow?: number
      cancelled?: number
    }>

    const inverted = await load({ from: "2026-09-12", to: "2026-09-06" })
    expect(inverted).toEqual({ error: "Invalid reporting period." })
    expect(inverted).not.toEqual({ noShow: 0, cancelled: 0 })

    const garbage = await load({ from: "not-a-date", to: "2026-09-12" })
    expect(garbage).toEqual({ error: "Invalid reporting period." })
    expect(garbage).not.toEqual({ noShow: 0, cancelled: 0 })

    const missingTo = await load({ from: "2026-09-06" })
    expect(missingTo).toEqual({ error: "Invalid reporting period." })
    expect(missingTo).not.toEqual({ noShow: 0, cancelled: 0 })

    mocks.gte.mockClear()
    mocks.lte.mockClear()
    const custom = await load({ from: "2026-09-01", to: "2026-09-10" })
    expect(custom).not.toHaveProperty("error")
    expect(custom).toEqual(
      expect.objectContaining({ from: "2026-09-01", to: "2026-09-10" }),
    )
    expect(mocks.gte).toHaveBeenCalledWith("date", "2026-09-01")
    expect(mocks.lte).toHaveBeenCalledWith("date", "2026-09-10")

    mocks.gte.mockClear()
    mocks.lte.mockClear()
    mocks.today.mockClear()
    const defaulted = await load()
    expect(mocks.today).toHaveBeenCalled()
    expect(defaulted).not.toHaveProperty("error")
    expect(defaulted).toEqual(
      expect.objectContaining({ from: "2026-09-06", to: "2026-09-12" }),
    )
    expect(mocks.gte).toHaveBeenCalledWith("date", "2026-09-06")
    expect(mocks.lte).toHaveBeenCalledWith("date", "2026-09-12")

    mocks.gte.mockClear()
    mocks.lte.mockClear()
    mocks.today.mockClear()
    const last30 = await load({ preset: 30 })
    expect(mocks.today).toHaveBeenCalled()
    expect(last30).not.toHaveProperty("error")
    expect(last30).toEqual(
      expect.objectContaining({ from: "2026-08-14", to: "2026-09-12" }),
    )
    expect(mocks.gte).toHaveBeenCalledWith("date", "2026-08-14")
    expect(mocks.lte).toHaveBeenCalledWith("date", "2026-09-12")

    mocks.gte.mockClear()
    mocks.lte.mockClear()
    mocks.today.mockClear()
    const last90 = await load({ preset: 90 })
    expect(mocks.today).toHaveBeenCalled()
    expect(last90).not.toHaveProperty("error")
    expect(last90).toEqual(
      expect.objectContaining({ from: "2026-06-15", to: "2026-09-12" }),
    )
    expect(mocks.gte).toHaveBeenCalledWith("date", "2026-06-15")
    expect(mocks.lte).toHaveBeenCalledWith("date", "2026-09-12")
  })
})

describe("getReservationAnalytics outcomes", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.today.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-09-12")
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("counts only no_show and cancelled in range", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<{
      error?: string
      from?: string
      to?: string
      noShow?: number
      cancelled?: number
    }>

    const empty = await load({ from: "2026-01-01", to: "2026-01-02" })
    expect(empty).not.toHaveProperty("error")
    expect(empty).toEqual(expect.objectContaining({ noShow: 0, cancelled: 0 }))

    // All five reservation statuses, all in-range. Occupying statuses must
    // not bump either count (RA-5 inversion). Unequal no_show/cancelled so
    // a boolean-or-length implementation cannot pass.
    mocks.from.mockImplementation(() =>
      thenable({
        data: [
          { status: "confirmed" },
          { status: "seated" },
          { status: "completed" },
          { status: "cancelled" },
          { status: "cancelled" },
          { status: "cancelled" },
          { status: "no_show" },
          { status: "no_show" },
        ],
        error: null,
      }),
    )

    const populated = await load({ from: "2026-09-06", to: "2026-09-12" })
    expect(populated).not.toHaveProperty("error")
    expect(populated).toEqual(
      expect.objectContaining({
        from: "2026-09-06",
        to: "2026-09-12",
        noShow: 2,
        cancelled: 3,
      }),
    )
  })
})

describe("getReservationAnalytics combined payload", () => {
  const RANGE_A = { from: "2026-08-01", to: "2026-08-05" } as const
  const RANGE_B = { from: "2026-09-10", to: "2026-09-12" } as const

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.today.mockReset()
    mocks.dayOfWeek.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-09-12")
    mocks.dayOfWeek.mockImplementation((dateISO: string) => {
      if (dateISO === "2026-08-01") return 6
      if (dateISO === "2026-09-10") return 4
      return 3
    })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("one load returns outcomes duration and patterns for the same range", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<AnalyticsResult>

    // One mixed dataset for both loads. Swapping fixtures between load()
    // calls would pass on a stateless action without pinning leftovers.
    // Thenable ignores .gte/.lte; duration/patterns JS-filter by date;
    // leftover first-range outcomes fail only when both ranges are present.
    stubFrom({
      occupancyMinutes: OCCUPANCY_MINUTES,
      reservations: [
        {
          id: "a-noshow",
          date: "2026-08-01",
          time: "12:00",
          party_size: 8,
          status: "no_show",
        },
        {
          id: "a-cancel-1",
          date: "2026-08-01",
          time: "12:00",
          party_size: 8,
          status: "cancelled",
        },
        {
          id: "a-cancel-2",
          date: "2026-08-01",
          time: "12:00",
          party_size: 8,
          status: "cancelled",
        },
        {
          id: "a-done",
          date: "2026-08-01",
          time: "12:00",
          party_size: 8,
          status: "completed",
          completed_at: "2026-08-01T12:45:00.000Z",
        },
        {
          id: "b-noshow-1",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "no_show",
        },
        {
          id: "b-noshow-2",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "no_show",
        },
        {
          id: "b-noshow-3",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "no_show",
        },
        {
          id: "b-cancel",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "cancelled",
        },
        {
          id: "b-done",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "completed",
          completed_at: "2026-09-10T19:30:00.000Z",
        },
      ],
      statusEvents: [
        {
          entity_type: "reservation",
          entity_id: "a-done",
          to_status: "seated",
          created_at: "2026-08-01T12:00:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "b-done",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
      ],
    })

    const first = await load(RANGE_A)
    const second = await load(RANGE_B)

    expect(first).not.toHaveProperty("error")
    expect(first).toEqual(
      expect.objectContaining({
        from: RANGE_A.from,
        to: RANGE_A.to,
        noShow: 1,
        cancelled: 2,
      }),
    )
    expect(first.duration).toEqual(
      expect.objectContaining({ sample_count: 1, mean_minutes: 45 }),
    )
    expect(first.duration?.mean_minutes).not.toBe(OCCUPANCY_MINUTES)
    expect(first.duration ?? {}).not.toHaveProperty(
      "occupancy_duration_minutes",
    )
    expect(first.patterns).toEqual(
      expect.objectContaining({
        date: { "2026-08-01": 4 },
        weekday: expect.objectContaining({ 6: 4 }),
        hour: expect.objectContaining({ 12: 4 }),
        party_size: { 8: 4 },
      }),
    )
    expect(first.patterns?.date?.["2026-09-10"] ?? 0).toBe(0)
    expect(first.patterns?.weekday?.[4] ?? 0).toBe(0)
    expect(first.patterns?.hour?.[19] ?? 0).toBe(0)
    expect(first.patterns?.party_size?.[2] ?? 0).toBe(0)
    expect(first.duration?.mean_minutes).not.toBe(90)

    expect(second).not.toHaveProperty("error")
    expect(second).toEqual(
      expect.objectContaining({
        from: RANGE_B.from,
        to: RANGE_B.to,
        noShow: 3,
        cancelled: 1,
      }),
    )
    expect(second.noShow).not.toBe(1)
    expect(second.cancelled).not.toBe(2)
    expect(second.duration).toEqual(
      expect.objectContaining({ sample_count: 1, mean_minutes: 90 }),
    )
    expect(second.duration?.mean_minutes).not.toBe(45)
    expect(second.duration?.mean_minutes).not.toBe(OCCUPANCY_MINUTES)
    expect(second.duration ?? {}).not.toHaveProperty(
      "occupancy_duration_minutes",
    )
    expect(second.patterns).toEqual(
      expect.objectContaining({
        date: { "2026-09-10": 5 },
        weekday: expect.objectContaining({ 4: 5 }),
        hour: expect.objectContaining({ 19: 5 }),
        party_size: { 2: 5 },
      }),
    )
    expect(second.patterns?.date?.["2026-08-01"] ?? 0).toBe(0)
    expect(second.patterns?.weekday?.[6] ?? 0).toBe(0)
    expect(second.patterns?.hour?.[12] ?? 0).toBe(0)
    expect(second.patterns?.party_size?.[8] ?? 0).toBe(0)
  })
})

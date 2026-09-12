import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  today: vi.fn(() => "2026-09-12"),
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

type AnalyticsResult = {
  error?: string
  from?: string
  to?: string
  duration?: DurationSlice
  occupancy_duration_minutes?: number
}

type Row = Record<string, unknown>

const RANGE = { from: "2026-09-06", to: "2026-09-12" } as const
const OCCUPANCY_MINUTES = 120

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

function expectOccupancyAbsent(result: AnalyticsResult) {
  expect(result).not.toHaveProperty("occupancy_duration_minutes")
  expect(result.duration ?? {}).not.toHaveProperty("occupancy_duration_minutes")
  expect(JSON.stringify(result)).not.toContain("occupancy_duration_minutes")
}

describe("getReservationAnalytics visit duration", () => {
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

  it("mean visit duration uses seated event to completed_at", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<AnalyticsResult>

    // RA-6 inversion: completed without a seated event is excluded, and the
    // occupancy setting must not stand in as the mean when sample_count is 0.
    stubFrom({
      occupancyMinutes: OCCUPANCY_MINUTES,
      reservations: [
        {
          id: "res-no-seat",
          date: "2026-09-10",
          status: "completed",
          completed_at: "2026-09-10T20:00:00.000Z",
        },
      ],
      statusEvents: [
        {
          entity_type: "table",
          entity_id: "res-no-seat",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
      ],
    })

    const zeroSample = await load(RANGE)
    expect(zeroSample).not.toHaveProperty("error")
    expect(zeroSample.duration?.sample_count).toBe(0)
    expect(zeroSample.duration?.mean_minutes ?? null).toBeNull()
    expect(zeroSample.duration?.mean_minutes).not.toBe(OCCUPANCY_MINUTES)
    expectOccupancyAbsent(zeroSample)

    // Included visits:
    //   res-a earliest seated 18:00 → completed 19:30:30 = 90.5 min → 91 (half-up)
    //     a later seated event at 18:10 must not replace the earliest
    //   res-b seated 18:00 → completed 19:30 = 90 min
    // Mean of integers (91+90)/2 = 90.5 → 91 (half-up of the mean, not of raw ms)
    stubFrom({
      occupancyMinutes: OCCUPANCY_MINUTES,
      reservations: [
        {
          id: "res-a",
          date: "2026-09-10",
          status: "completed",
          completed_at: "2026-09-10T19:30:30.000Z",
        },
        {
          id: "res-b",
          date: "2026-09-11",
          status: "completed",
          completed_at: "2026-09-11T19:30:00.000Z",
        },
        {
          id: "res-no-seat",
          date: "2026-09-10",
          status: "completed",
          completed_at: "2026-09-10T20:00:00.000Z",
        },
        {
          id: "res-null-end",
          date: "2026-09-10",
          status: "completed",
          completed_at: null,
        },
        {
          id: "res-still-seated",
          date: "2026-09-10",
          status: "seated",
          completed_at: "2026-09-10T18:30:00.000Z",
        },
        {
          id: "res-out-of-range",
          date: "2026-09-01",
          status: "completed",
          completed_at: "2026-09-01T22:00:00.000Z",
        },
      ],
      statusEvents: [
        {
          entity_type: "reservation",
          entity_id: "res-a",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "res-a",
          to_status: "seated",
          created_at: "2026-09-10T18:10:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "res-b",
          to_status: "seated",
          created_at: "2026-09-11T18:00:00.000Z",
        },
        {
          entity_type: "table",
          entity_id: "res-no-seat",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "res-null-end",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "res-still-seated",
          to_status: "seated",
          created_at: "2026-09-10T18:00:00.000Z",
        },
        {
          entity_type: "reservation",
          entity_id: "res-out-of-range",
          to_status: "seated",
          created_at: "2026-09-01T18:00:00.000Z",
        },
      ],
    })

    const populated = await load(RANGE)
    expect(populated).not.toHaveProperty("error")
    expect(populated.duration).toEqual(
      expect.objectContaining({
        sample_count: 2,
        mean_minutes: 91,
      }),
    )
    expect(populated.duration?.mean_minutes).not.toBe(OCCUPANCY_MINUTES)
    expectOccupancyAbsent(populated)
  })
})

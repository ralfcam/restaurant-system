import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "18:00"),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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

describe("getReservationsByDate", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("18:00")
  })

  it("does not present auth or query failure as a successful empty list", async () => {
    const { getReservationsByDate } = await import("@/app/actions/reservations")

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await getReservationsByDate("2026-08-18")
    expect(unauthorized).toEqual({
      reservations: [],
      error: expect.any(String),
    })

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() =>
      thenable({
        data: null,
        error: { message: "could not query reservations" },
      }),
    )
    const queryFailed = await getReservationsByDate("2026-08-18")
    expect(queryFailed).toEqual({
      reservations: [],
      error: expect.any(String),
    })

    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    const emptyDate = await getReservationsByDate("2026-08-18")
    expect(emptyDate).toEqual({ reservations: [] })
    expect((emptyDate as { error?: string }).error).toBeUndefined()
  })
})

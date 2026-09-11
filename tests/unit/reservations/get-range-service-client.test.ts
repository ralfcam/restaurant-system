import { beforeEach, describe, expect, it, vi } from "vitest"
import { getReservations } from "@/app/actions/reservations"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createCookieClient: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mocks.createCookieClient(...args),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type QueryResult = { data: Record<string, unknown>[] | null; error: unknown }

function thenable(value: QueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: QueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
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

const staffUser = { id: "staff-1" }
const range = { from: "2026-08-01", to: "2026-08-31" }

describe("getReservations client", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createCookieClient.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.gte.mockReset()
    mocks.lte.mockReset()
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createCookieClient.mockImplementation(async () => ({
      from: mocks.from,
    }))
    mocks.createServiceClient.mockImplementation(() => ({
      from: mocks.from,
    }))
  })

  it("getReservations uses createServiceClient only after the staff gate", async () => {
    mocks.requireStaffUser.mockResolvedValue(staffUser)

    await getReservations(range)

    expect(mocks.createServiceClient).toHaveBeenCalled()
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.from).toHaveBeenCalledWith("reservations")
    expect(mocks.gte).toHaveBeenCalledWith("date", range.from)
    expect(mocks.lte).toHaveBeenCalledWith("date", range.to)

    mocks.createServiceClient.mockClear()
    mocks.createCookieClient.mockClear()
    mocks.from.mockClear()
    mocks.gte.mockClear()
    mocks.lte.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)

    const unauthorized = await getReservations(range)

    expect(unauthorized).toEqual([])
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})

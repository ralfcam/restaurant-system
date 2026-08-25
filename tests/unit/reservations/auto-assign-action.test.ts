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

describe("autoAssignDueReservations", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("18:00")
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { autoAssignDueReservations } =
      await import("@/app/actions/reservations")
    const result = await autoAssignDueReservations()
    expect(result).toEqual({ assigned: [], error: "Unauthorized." })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("persists the best-fit table for a due unassigned reservation", async () => {
    const reservation = {
      id: "res-1",
      guest_name: "Amelia Brooks",
      party_size: 4,
      date: "2026-08-18",
      time: "18:00",
      status: "confirmed",
      table_label: null,
      phone: "555-0100",
      notes: null,
      conf_code: "TVL-1000",
      created_at: "2026-08-01T10:00:00.000Z",
    }
    const tables = [
      { id: "t1", label: "1", seats: 2, status: "available" },
      { id: "t3", label: "3", seats: 4, status: "available" },
    ]
    const updates: Array<{ table: string; patch: Row }> = []

    mocks.from.mockImplementation((name: string) => {
      if (name === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                order: () => thenable({ data: [reservation], error: null }),
              }),
              single: async () => ({ data: reservation, error: null }),
            }),
          }),
          update: (patch: Row) => {
            updates.push({ table: name, patch })
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            return chain
          },
        }
      }
      if (name === "tables") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: tables[1], error: null }),
              order: () => thenable({ data: tables, error: null }),
            }),
            order: () => thenable({ data: tables, error: null }),
          }),
          update: (patch: Row) => {
            updates.push({ table: name, patch })
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            return chain
          },
        }
      }
      return {
        select: () => thenable({ data: [], error: null }),
        insert: async () => ({ error: null }),
        update: () => thenable({ error: null }),
        delete: () => ({ eq: () => thenable({ error: null }) }),
      }
    })

    const { autoAssignDueReservations } =
      await import("@/app/actions/reservations")
    const result = await autoAssignDueReservations()

    expect(result.error).toBeUndefined()
    expect(result.assigned).toEqual([
      { reservationId: "res-1", tableLabel: "3" },
    ])
    expect(
      updates.some(
        (row) => row.table === "reservations" && row.patch.table_label === "3",
      ),
    ).toBe(true)
    expect(
      updates.some(
        (row) => row.table === "tables" && row.patch.status === "reserved",
      ),
    ).toBe(true)
  })
})

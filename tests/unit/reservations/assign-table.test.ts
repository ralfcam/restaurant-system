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

describe("assignReservationTable", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("18:00")
  })

  it("rejects assigning a table whose occupying window overlaps another confirmed or seated reservation", async () => {
    const date = "2026-08-18"
    const table = {
      id: "t1",
      label: "1",
      seats: 4,
      status: "available",
    }
    const due = {
      id: "res-1900",
      guest_name: "Marcus Webb",
      party_size: 2,
      date,
      time: "19:00",
      status: "confirmed",
      table_label: null as string | null,
      phone: "555-0144",
      notes: null,
      conf_code: "TVL-1900",
      created_at: "2026-08-01T10:00:00.000Z",
    }
    const occupant = {
      id: "res-1930",
      guest_name: "Sofia Reyes",
      party_size: 2,
      date,
      time: "19:30",
      status: "seated",
      table_label: "1",
      phone: "555-0155",
      notes: null,
      conf_code: "TVL-1930",
      created_at: "2026-08-01T10:00:00.000Z",
    }

    mocks.from.mockImplementation((name: string) => {
      if (name === "restaurant_settings") {
        return thenable({
          data: {
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      if (name === "tables") {
        return {
          select: () => thenable({ data: table, error: null }),
          update: (patch: Row) => {
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            void patch
            return chain
          },
        }
      }
      if (name === "reservations") {
        return {
          select: () => thenable({ data: [due, occupant], error: null }),
          update: (patch: Row) => {
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            void patch
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

    const { assignReservationTable } =
      await import("@/app/actions/reservations")

    const overlap = await assignReservationTable(due.id, "1")
    expect(overlap).toEqual({ error: expect.any(String) })

    const cleared = await assignReservationTable(due.id, null)
    expect(cleared).toEqual({})

    due.table_label = "1"
    const reassigned = await assignReservationTable(due.id, "1")
    expect(reassigned).toEqual({})
  })

  it("rejects assigning a table with fewer seats than party size", async () => {
    const date = "2026-08-18"
    const twoTop = {
      id: "t2",
      label: "2",
      seats: 2,
      status: "available",
    }
    const fourTop = {
      id: "t4",
      label: "4",
      seats: 4,
      status: "available",
    }
    const partyOfEight = {
      id: "res-party-8",
      guest_name: "Elena Vargas",
      party_size: 8,
      date,
      time: "19:00",
      status: "confirmed",
      table_label: null as string | null,
      phone: "555-0166",
      notes: null,
      conf_code: "TVL-P8",
      created_at: "2026-08-01T10:00:00.000Z",
    }
    const partyOfFour = {
      id: "res-party-4",
      guest_name: "Jonah Hale",
      party_size: 4,
      date,
      time: "19:00",
      status: "confirmed",
      table_label: null as string | null,
      phone: "555-0177",
      notes: null,
      conf_code: "TVL-P4",
      created_at: "2026-08-01T10:00:00.000Z",
    }

    let tableRow = twoTop
    let reservationRow = partyOfEight

    mocks.from.mockImplementation((name: string) => {
      if (name === "restaurant_settings") {
        return thenable({
          data: {
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      if (name === "tables") {
        return {
          select: () => thenable({ data: tableRow, error: null }),
          update: (patch: Row) => {
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            void patch
            return chain
          },
        }
      }
      if (name === "reservations") {
        return {
          select: () => thenable({ data: [reservationRow], error: null }),
          update: (patch: Row) => {
            const chain = {
              eq: () => chain,
              in: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            void patch
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

    const { assignReservationTable } =
      await import("@/app/actions/reservations")

    const undersize = await assignReservationTable(partyOfEight.id, "2")
    expect(undersize).toEqual({ error: expect.any(String) })

    tableRow = fourTop
    reservationRow = partyOfFour
    const exactFit = await assignReservationTable(partyOfFour.id, "4")
    expect(exactFit).toEqual({})
  })
})

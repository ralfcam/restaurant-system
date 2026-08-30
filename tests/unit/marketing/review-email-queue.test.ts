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

describe("transitionReservationStatus", () => {
  let currentRow: { status: string; table_label: string | null }
  let reviewEmailInserts: Row[]

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("18:00")
    currentRow = { status: "seated", table_label: null }
    reviewEmailInserts = []

    mocks.from.mockImplementation((name: string) => {
      if (name === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: currentRow, error: null }),
            }),
          }),
          update: (patch: Row) => {
            const chain = {
              eq: () => chain,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve({ error: null }).then(resolve),
            }
            void patch
            return chain
          },
        }
      }
      if (name === "review_email_sends") {
        return {
          insert: (row: Row | Row[]) => {
            const rows = Array.isArray(row) ? row : [row]
            reviewEmailInserts.push(...rows)
            return thenable({ data: rows[0] ?? null, error: null })
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
  })

  it("only transition to completed enqueues; cancelled no_show confirmed seated do not", async () => {
    const { transitionReservationStatus } =
      await import("@/app/actions/reservations")

    async function transition(
      fromStatus: string,
      toStatus: "completed" | "cancelled" | "no_show" | "confirmed" | "seated",
      reservationId: string,
    ) {
      currentRow = { status: fromStatus, table_label: null }
      const before = reviewEmailInserts.length
      const result = await transitionReservationStatus(reservationId, toStatus)
      return {
        result,
        inserted: reviewEmailInserts.slice(before),
      }
    }

    const completed = await transition("seated", "completed", "res-complete-1")
    expect(completed.result.error).toBeUndefined()
    expect(completed.inserted).toHaveLength(1)
    expect(completed.inserted[0]).toEqual(
      expect.objectContaining({ reservation_id: "res-complete-1" }),
    )

    const cancelled = await transition(
      "confirmed",
      "cancelled",
      "res-cancelled",
    )
    expect(cancelled.result.error).toBeUndefined()
    expect(cancelled.inserted).toHaveLength(0)

    const noShow = await transition("confirmed", "no_show", "res-no-show")
    expect(noShow.result.error).toBeUndefined()
    expect(noShow.inserted).toHaveLength(0)

    const confirmed = await transition("seated", "confirmed", "res-confirmed")
    expect(confirmed.inserted).toHaveLength(0)

    const seated = await transition("confirmed", "seated", "res-seated")
    expect(seated.result.error).toBeUndefined()
    expect(seated.inserted).toHaveLength(0)
  })
})

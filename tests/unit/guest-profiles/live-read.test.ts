import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type Row = Record<string, unknown>

type GuestProfile = {
  error?: string
  history?: Array<{
    date?: string
    time?: string
    party_size?: number
    status?: string
  }>
}

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
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

const existing = {
  email: "ada@ex.com",
  date: "2026-09-10",
  time: "19:00",
  party_size: 2,
  status: "completed",
  guest_name: "Ada Lovelace",
}

const inserted = {
  email: "ada@ex.com",
  date: "2026-09-20",
  time: "20:00",
  party_size: 4,
  status: "confirmed",
  guest_name: "Ada Lovelace",
}

function historyStamp(profile: GuestProfile) {
  return (profile.history ?? []).map((row) => ({
    date: row.date,
    time: row.time,
    party_size: row.party_size,
    status: row.status,
  }))
}

describe("getGuestProfile live read", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("getGuestProfile is a live service-role select", async () => {
    const { getGuestProfile } =
      (await import("@/app/actions/guest-profiles")) as {
        getGuestProfile: (email: string) => Promise<GuestProfile>
      }

    mocks.from
      .mockImplementationOnce(() => thenable({ data: [existing], error: null }))
      .mockImplementationOnce(() =>
        thenable({ data: [existing, inserted], error: null }),
      )

    const first = await getGuestProfile("ada@ex.com")
    const second = await getGuestProfile("ada@ex.com")

    expect(mocks.from).toHaveBeenCalledTimes(2)
    expect(mocks.from).toHaveBeenNthCalledWith(1, "reservations")
    expect(mocks.from).toHaveBeenNthCalledWith(2, "reservations")
    expect(historyStamp(first)).toEqual([
      {
        date: existing.date,
        time: existing.time,
        party_size: existing.party_size,
        status: existing.status,
      },
    ])
    expect(historyStamp(second)).toEqual(
      expect.arrayContaining([
        {
          date: inserted.date,
          time: inserted.time,
          party_size: inserted.party_size,
          status: inserted.status,
        },
      ]),
    )
  })
})

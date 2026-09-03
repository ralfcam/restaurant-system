import { beforeEach, describe, expect, it, vi } from "vitest"
import { setChefsPicksEnabled } from "@/app/actions/menu"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  cookieUpsert: vi.fn(),
  serviceUpsert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      upsert: mocks.cookieUpsert,
    }),
  }),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      upsert: mocks.serviceUpsert,
    }),
  }),
}))

const staffUser = { id: "staff-1" }

describe("setChefsPicksEnabled", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.cookieUpsert.mockReset()
    mocks.serviceUpsert.mockReset()
    mocks.cookieUpsert.mockResolvedValue({ error: null })
    mocks.serviceUpsert.mockResolvedValue({ error: null })
  })

  it("setChefsPicksEnabled upserts restaurant_settings via createServiceClient", async () => {
    mocks.requireStaffUser.mockResolvedValue(staffUser)
    await setChefsPicksEnabled(true)
    expect(mocks.serviceUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        chefs_picks_enabled: true,
      }),
    )
    expect(mocks.cookieUpsert).not.toHaveBeenCalled()

    mocks.cookieUpsert.mockClear()
    mocks.serviceUpsert.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)

    const unauth = await setChefsPicksEnabled(true)
    expect(unauth).toEqual({ error: "Unauthorized." })
    expect(mocks.serviceUpsert).not.toHaveBeenCalled()
    expect(mocks.cookieUpsert).not.toHaveBeenCalled()
  })
})

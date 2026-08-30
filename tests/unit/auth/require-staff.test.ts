import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireStaffUser } from "@/lib/supabase/require-staff"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}))

describe("requireStaffUser", () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
  })

  it("returns null for authenticated users without app_metadata.role staff", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(await requireStaffUser()).toBeNull()

    const spoofed = {
      id: "guest-1",
      user_metadata: { role: "staff" },
    }
    mocks.getUser.mockResolvedValue({ data: { user: spoofed } })
    expect(await requireStaffUser()).toBeNull()

    const staff = {
      id: "staff-1",
      app_metadata: { role: "staff" },
    }
    mocks.getUser.mockResolvedValue({ data: { user: staff } })
    expect(await requireStaffUser()).toBe(staff)
  })
})

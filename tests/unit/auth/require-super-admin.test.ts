import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  isSuperAdminUser,
  requireSuperAdminUser,
} from "@/lib/supabase/require-staff"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
  }),
}))

describe("requireSuperAdminUser", () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
  })

  it("requireSuperAdminUser / isSuperAdminUser across all four caller types", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(isSuperAdminUser(null)).toBe(false)
    expect(await requireSuperAdminUser()).toBeNull()

    const spoofed = {
      id: "guest-1",
      user_metadata: { role: "super_admin" },
    }
    mocks.getUser.mockResolvedValue({ data: { user: spoofed } })
    expect(isSuperAdminUser(spoofed)).toBe(false)
    expect(await requireSuperAdminUser()).toBeNull()

    const emptyClaim = {
      id: "guest-2",
      app_metadata: {},
    }
    mocks.getUser.mockResolvedValue({ data: { user: emptyClaim } })
    expect(isSuperAdminUser(emptyClaim)).toBe(false)
    expect(await requireSuperAdminUser()).toBeNull()

    const staffOnly = {
      id: "staff-1",
      app_metadata: { role: "staff" },
    }
    mocks.getUser.mockResolvedValue({ data: { user: staffOnly } })
    expect(isSuperAdminUser(staffOnly)).toBe(false)
    expect(await requireSuperAdminUser()).toBeNull()

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    expect(isSuperAdminUser(superAdmin)).toBe(true)
    expect(await requireSuperAdminUser()).toBe(superAdmin)
  })
})

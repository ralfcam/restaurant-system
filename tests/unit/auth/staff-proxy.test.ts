import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mocks.getUser },
  }),
}))

const STAFF_PATHS = ["/admin", "/pos", "/kds"] as const

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, "http://localhost"))
}

function redirectPath(response: Response): string | null {
  if (response.status !== 307 && response.status !== 308) return null
  const location = response.headers.get("location")
  if (!location) return null
  return new URL(location, "http://localhost").pathname
}

describe("updateSession staff routes", () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  it("authenticated non-staff cannot open staff paths", async () => {
    const unauthenticated = { data: { user: null } }
    const nonStaff = {
      data: { user: { id: "guest-1", user_metadata: { role: "staff" } } },
    }
    const staff = {
      data: { user: { id: "staff-1", app_metadata: { role: "staff" } } },
    }

    for (const path of STAFF_PATHS) {
      mocks.getUser.mockResolvedValue(unauthenticated)
      const guestRes = await updateSession(requestFor(path))
      expect(redirectPath(guestRes)).toBe("/auth/login")

      mocks.getUser.mockResolvedValue(nonStaff)
      const nonStaffRes = await updateSession(requestFor(path))
      expect(redirectPath(nonStaffRes)).toBe("/")

      mocks.getUser.mockResolvedValue(staff)
      const staffRes = await updateSession(requestFor(path))
      expect(redirectPath(staffRes)).not.toBe("/auth/login")
      expect(redirectPath(staffRes)).not.toBe("/")
    }

    mocks.getUser.mockResolvedValue(nonStaff)
    const menuRes = await updateSession(requestFor("/menu"))
    expect(redirectPath(menuRes)).not.toBe("/auth/login")
  })
})

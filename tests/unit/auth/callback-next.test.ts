import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/auth/callback/route"

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
  }),
}))

function callbackRequest(next: string) {
  const url = new URL("/auth/callback", "http://localhost")
  url.searchParams.set("code", "auth-code")
  url.searchParams.set("next", next)
  return new NextRequest(url)
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    mocks.exchangeCodeForSession.mockReset()
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it("callback next falls back to /admin when it is not a same-origin path", async () => {
    const cases = [
      { next: "//evil.example", location: "http://localhost/admin" },
      { next: "https://evil.example", location: "http://localhost/admin" },
      { next: "/\\evil.example", location: "http://localhost/admin" },
      {
        next: "/admin/reservations",
        location: "http://localhost/admin/reservations",
      },
    ] as const

    for (const { next, location } of cases) {
      const response = await GET(callbackRequest(next))
      expect(response.headers.get("location")).toBe(location)
    }
  })
})

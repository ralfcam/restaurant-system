import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(async () => new Response()),
}))

import { updateSession } from "@/lib/supabase/proxy"
import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"
import { middleware } from "@/middleware"

describe("middleware scope", () => {
  beforeEach(() => {
    vi.mocked(updateSession).mockClear()
  })

  it("admin and api are excluded from localization", async () => {
    expect(resolveLocaleRoutingDecision("/admin/x")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/api/x")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/menu")).toBe("localize")

    const adminRequest = new NextRequest(new URL("http://localhost/admin/x"))
    await middleware(adminRequest)
    expect(updateSession).toHaveBeenCalledWith(adminRequest)

    vi.mocked(updateSession).mockClear()

    const menuRequest = new NextRequest(new URL("http://localhost/menu"))
    await middleware(menuRequest)
    expect(updateSession).toHaveBeenCalledWith(menuRequest)
  })
})

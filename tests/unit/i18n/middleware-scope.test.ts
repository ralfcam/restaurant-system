import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn(async () => new Response()),
}))

import { updateSession } from "@/lib/supabase/proxy"
import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"
import { proxy } from "@/proxy"

describe("middleware scope", () => {
  beforeEach(() => {
    vi.mocked(updateSession).mockClear()
  })

  it("admin and api are excluded from localization", async () => {
    expect(resolveLocaleRoutingDecision("/admin/x")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/api/x")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/menu")).toBe("localize")

    const adminRequest = new NextRequest(new URL("http://localhost/admin/x"))
    await proxy(adminRequest)
    expect(updateSession).toHaveBeenCalledWith(adminRequest)

    vi.mocked(updateSession).mockClear()

    const menuRequest = new NextRequest(new URL("http://localhost/menu"))
    await proxy(menuRequest)
    expect(updateSession).toHaveBeenCalledWith(menuRequest)
  })

  it("auth paths are excluded from localization", () => {
    expect(resolveLocaleRoutingDecision("/auth")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/auth/login")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/auth/callback")).toBe("skip-locale")
  })

  it("pos and kds are excluded from localization", () => {
    expect(resolveLocaleRoutingDecision("/pos")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/pos/table-1")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/kds")).toBe("skip-locale")
    expect(resolveLocaleRoutingDecision("/kds/orders")).toBe("skip-locale")
  })

  it("session cookies and Set-Cookie options survive locale merge", async () => {
    const sessionResponse = NextResponse.next()
    sessionResponse.cookies.set("sb-auth-token", "refreshed-session", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    })
    vi.mocked(updateSession).mockResolvedValueOnce(sessionResponse)

    const menuRequest = new NextRequest(new URL("http://localhost/menu"))
    const composed = await proxy(menuRequest)

    const setCookieHeader =
      typeof composed.headers.getSetCookie === "function"
        ? composed.headers.getSetCookie().join("\n")
        : (composed.headers.get("set-cookie") ?? "")

    expect(setCookieHeader).toContain("sb-auth-token=refreshed-session")
    expect(setCookieHeader).toMatch(/HttpOnly/i)
    expect(setCookieHeader).toMatch(/Secure/i)
  })

  it("locale exclusion is segment-bounded including auth/error through proxy", async () => {
    expect(resolveLocaleRoutingDecision("/authorship")).toBe("localize")
    expect(resolveLocaleRoutingDecision("/administrator")).toBe("localize")
    expect(resolveLocaleRoutingDecision("/apiculture")).toBe("localize")
    expect(resolveLocaleRoutingDecision("/postal")).toBe("localize")
    expect(resolveLocaleRoutingDecision("/kdssuffix")).toBe("localize")
    expect(resolveLocaleRoutingDecision("/auth/error")).toBe("skip-locale")

    const errorSessionResponse = NextResponse.next()
    vi.mocked(updateSession).mockResolvedValueOnce(errorSessionResponse)
    const errorRequest = new NextRequest(new URL("http://localhost/auth/error"))
    const errorResult = await proxy(errorRequest)
    expect(updateSession).toHaveBeenCalledWith(errorRequest)
    expect(errorResult).toBe(errorSessionResponse)

    vi.mocked(updateSession).mockClear()

    const loginSessionResponse = NextResponse.next()
    vi.mocked(updateSession).mockResolvedValueOnce(loginSessionResponse)
    const loginRequest = new NextRequest(new URL("http://localhost/auth/login"))
    const loginResult = await proxy(loginRequest)
    expect(updateSession).toHaveBeenCalledWith(loginRequest)
    expect(loginResult).toBe(loginSessionResponse)
  })
})

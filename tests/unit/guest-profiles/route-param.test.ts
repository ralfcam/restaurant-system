import { beforeEach, describe, expect, it, vi } from "vitest"
import { normalizeGuestEmail } from "@/lib/guest-profiles"
import AdminGuestProfilePage from "@/app/admin/customers/[email]/page"

const mocks = vi.hoisted(() => ({
  getGuestProfile: vi.fn(),
  updateGuestProfilePii: vi.fn(),
  getAuthUser: vi.fn(),
  getTranslations: vi.fn(),
}))

vi.mock("@/app/actions/guest-profiles", () => ({
  getGuestProfile: mocks.getGuestProfile,
  updateGuestProfilePii: mocks.updateGuestProfilePii,
}))

vi.mock("@/app/actions/auth", () => ({
  getAuthUser: mocks.getAuthUser,
  signOut: vi.fn(),
}))

vi.mock("next-intl/server", () => ({
  getTranslations: mocks.getTranslations,
}))

function serializeElement(node: unknown, seen = new Set<object>()): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (node == null || typeof node !== "object") return ""
  if (seen.has(node)) return ""
  seen.add(node)
  const props =
    "props" in node && node.props != null && typeof node.props === "object"
      ? (node.props as Record<string, unknown>)
      : (node as Record<string, unknown>)
  return Object.values(props)
    .map((value) => serializeElement(value, seen))
    .join(" ")
}

describe("GP-2 decode route param", () => {
  beforeEach(() => {
    mocks.getGuestProfile.mockReset()
    mocks.updateGuestProfilePii.mockReset()
    mocks.getAuthUser.mockReset()
    mocks.getTranslations.mockReset()
    mocks.getTranslations.mockResolvedValue((key: string) => key)
    mocks.getAuthUser.mockResolvedValue({ email: "host@ex.com" })
    mocks.getGuestProfile.mockResolvedValue({
      email: "roblesdaniel@hotmail.com",
      guest_name: "Daniel Robles",
      phone: "555-0100",
      notes: "window",
      history: [
        {
          email: "roblesdaniel@hotmail.com",
          date: "2026-09-01",
          time: "19:00",
          party_size: 2,
          status: "confirmed",
        },
      ],
    })
  })

  it("route email param is decoded once before lookup and display", async () => {
    const { guestEmailFromRouteParam } = await import("@/lib/guest-profiles")

    expect(guestEmailFromRouteParam("roblesdaniel%40hotmail.com")).toBe(
      "roblesdaniel@hotmail.com",
    )
    expect(guestEmailFromRouteParam(" Ada%40Ex.com ")).toBe("ada@ex.com")
    expect(guestEmailFromRouteParam("a%2525b%40x.com")).toBe("a%25b@x.com")

    expect(() => guestEmailFromRouteParam("%E0%A4%A")).not.toThrow()
    // GP-12: malformed escape is an empty key (normalizeGuestEmail blank → null), not the raw segment.
    expect(normalizeGuestEmail(guestEmailFromRouteParam("%E0%A4%A"))).toBeNull()

    const element = await AdminGuestProfilePage({
      params: Promise.resolve({ email: "roblesdaniel%40hotmail.com" }),
    })

    expect(mocks.getGuestProfile).toHaveBeenCalledWith(
      "roblesdaniel@hotmail.com",
    )
    expect(serializeElement(element)).not.toContain("%40")
  })
})

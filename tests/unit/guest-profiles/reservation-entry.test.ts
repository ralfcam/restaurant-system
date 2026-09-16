import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("reservation entry", () => {
  it("reservations list links a non-blank email to the ficha", async () => {
    const guestProfiles = await import("@/lib/guest-profiles")
    expect(guestProfiles.guestProfileHref).toEqual(expect.any(Function))

    const normalized = "ada@ex.com"
    expect(guestProfiles.guestProfileHref("  Ada@Ex.com ")).toBe(
      `/admin/customers/${encodeURIComponent(normalized)}`,
    )
    expect(guestProfiles.guestProfileHref(null)).toBeNull()
    expect(guestProfiles.guestProfileHref("")).toBeNull()
    expect(guestProfiles.guestProfileHref("   ")).toBeNull()

    const manager = read("components/staff/reservations-manager.tsx")
    expect(manager).toMatch(/\bguestProfileHref\s*\(/)
  })
})

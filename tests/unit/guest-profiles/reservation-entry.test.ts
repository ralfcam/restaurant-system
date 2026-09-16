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

  it("reservations list renders a ficha link for non-blank email only", () => {
    const manager = read("components/staff/reservations-manager.tsx")
    const assigned =
      manager.match(
        /(?:const|let)\s+(\w+)\s*=\s*guestProfileHref\s*\(\s*\w+\.email\s*\)/,
      ) ?? []
    const hrefName = assigned[1] ?? ""
    expect(hrefName).toMatch(/^\w+$/)
    const name = hrefName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    expect(manager).toMatch(
      new RegExp(
        `${name}\\s*(?:\\?\\s*\\(|&&\\s*\\(?)[\\s\\S]{0,80}<Link[\\s\\S]{0,200}href=\\{${name}\\}`,
      ),
    )
  })
})

import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { SITE_LOGO, shouldUseLightNavText } from "@/lib/site-chrome"
import { RESTAURANT } from "@/lib/data"

const root = process.cwd()

describe("site chrome", () => {
  it("SITE_LOGO is size-only — the platform ships with no bundled mark", () => {
    expect(SITE_LOGO.width).toBe(48)
    expect(SITE_LOGO.height).toBe(48)
    expect(SITE_LOGO).not.toHaveProperty("src")
    expect(SITE_LOGO.alt).toContain(RESTAURANT.name)
  })

  it("restaurant identity is the Restaurant Link template", () => {
    expect(RESTAURANT.name).toBe("Restaurant Link")
    expect(existsSync(path.join(root, "lib/akta-menu.ts"))).toBe(false)
    expect(existsSync(path.join(root, "lib/akta-menu.json"))).toBe(false)
    expect(existsSync(path.join(root, "lib/menu-catalog.ts"))).toBe(true)
  })
})

describe("shouldUseLightNavText", () => {
  it("nav text stays dark when unscrolled and not over a dark background", () => {
    expect(shouldUseLightNavText(false, false)).toBe(false)
  })

  it("nav text is white when unscrolled over a dark background", () => {
    expect(shouldUseLightNavText(false, true)).toBe(true)
  })

  it("nav text is dark once scrolled regardless of background", () => {
    expect(shouldUseLightNavText(true, true)).toBe(false)
    expect(shouldUseLightNavText(true, false)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { SITE_LOGO } from "@/lib/site-chrome"

describe("site chrome", () => {
  it("SITE_LOGO meets 48px readability minimum", () => {
    expect(SITE_LOGO.width).toBe(48)
    expect(SITE_LOGO.height).toBe(48)
    expect(SITE_LOGO.src).toBe("/images/logo.png")
  })
})

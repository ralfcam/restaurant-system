import { describe, expect, it } from "vitest"
import { localizedPathname } from "@/lib/i18n/localized-pathname"

describe("localizedPathname", () => {
  it("maps current path to other-locale equivalent (as-needed)", () => {
    expect(localizedPathname("/menu", "en")).toBe("/en/menu")
    expect(localizedPathname("/en/menu", "fr")).toBe("/menu")
    expect(localizedPathname("/", "en")).toBe("/en")
    expect(localizedPathname("/en", "fr")).toBe("/")
  })
})

import { describe, expect, it } from "vitest"
import { routing } from "@/i18n/routing"

describe("i18n routing", () => {
  it("routing exposes fr/en, default fr, as-needed", () => {
    expect(routing.locales).toEqual(["fr", "en"])
    expect(routing.defaultLocale).toBe("fr")
    expect(routing.localePrefix).toBe("as-needed")
  })
})

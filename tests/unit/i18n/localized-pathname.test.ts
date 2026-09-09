import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { localizedPathname } from "@/lib/i18n/localized-pathname"
import * as localizedPathnameModule from "@/lib/i18n/localized-pathname"

const siteHeaderPath = path.join(
  process.cwd(),
  "components",
  "site",
  "site-header.tsx",
)

describe("localizedPathname", () => {
  it("maps current path to other-locale equivalent (as-needed)", () => {
    expect(localizedPathname("/menu", "en")).toBe("/en/menu")
    expect(localizedPathname("/en/menu", "fr")).toBe("/menu")
    expect(localizedPathname("/", "en")).toBe("/en")
    expect(localizedPathname("/en", "fr")).toBe("/")
  })
})

describe("isActiveNavPath", () => {
  it("isActiveNavPath matches locale-stripped /menu", () => {
    const { isActiveNavPath } = localizedPathnameModule

    expect(isActiveNavPath("/en/menu", "/menu")).toBe(true)
    expect(isActiveNavPath("/menu", "/menu")).toBe(true)
    expect(isActiveNavPath("/", "/menu")).toBe(false)
    expect(isActiveNavPath("/en", "/menu")).toBe(false)

    const source = readFileSync(siteHeaderPath, "utf8")
    const usesHelper = /isActiveNavPath\s*\(/.test(source)
    const usesLocaleStrippedEquivalent =
      /stripLocalePrefix\s*\(\s*pathname/.test(source) &&
      !/pathname\s*===\s*["']\/menu["']/.test(source)
    expect(usesHelper || usesLocaleStrippedEquivalent).toBe(true)
    expect(source).not.toMatch(/pathname\s*===\s*["']\/menu["']/)
  })
})

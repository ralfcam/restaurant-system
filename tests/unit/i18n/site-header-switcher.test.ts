import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const siteHeaderPath = path.join(process.cwd(), "components", "site", "site-header.tsx")

function readSiteHeaderSource() {
  return readFileSync(siteHeaderPath, "utf8")
}

describe("site header language switcher", () => {
  it("site header renders LanguageSwitcher in shared navbar", () => {
    const source = readSiteHeaderSource()

    expect(source).toMatch(
      /import[\s\S]*LanguageSwitcher[\s\S]*from\s+["']@\/components\/site\/language-switcher["']/,
    )
    expect(source).toMatch(/<LanguageSwitcher[\s/>]/)
  })
})

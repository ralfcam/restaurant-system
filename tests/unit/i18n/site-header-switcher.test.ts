import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const siteHeaderPath = path.join(
  process.cwd(),
  "components",
  "site",
  "site-header.tsx",
)

function readSiteHeaderSource() {
  return readFileSync(siteHeaderPath, "utf8")
}

describe("site header language switcher", () => {
  it("site header renders LanguageSwitcher in shared navbar", () => {
    const source = readSiteHeaderSource()

    expect(source).toMatch(
      /import[\s\S]*LanguageSwitcher[\s\S]*from\s+["']@\/components\/site\/language-switcher["']/,
    )
  })

  it("site header renders LanguageSwitcher in desktop actions and mobile sheet", () => {
    const source = readSiteHeaderSource()

    const switcherOpens = source.match(/<LanguageSwitcher[\s/>]/g)
    expect(switcherOpens).toHaveLength(2)

    const desktopActions =
      /Desktop Actions[\s\S]*?(?=\{\/\* Mobile|<\/header>)/.exec(source)?.[0]
    expect(desktopActions).toBeDefined()
    expect(desktopActions).toMatch(/<LanguageSwitcher[\s/>]/)

    const sheetContent = /<SheetContent[\s\S]*?<\/SheetContent>/.exec(
      source,
    )?.[0]
    expect(sheetContent).toBeDefined()
    expect(sheetContent).toMatch(/<LanguageSwitcher[\s/>]/)
  })
})

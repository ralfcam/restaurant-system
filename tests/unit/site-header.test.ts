import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { shouldRenderSiteHeader } from "@/lib/site-chrome"

const repoRoot = process.cwd()
const flatHomepagePath = path.join(repoRoot, "app", "page.tsx")
const localizedHomepagePath = path.join(repoRoot, "app", "[locale]", "page.tsx")
const siteHeaderPath = path.join(
  repoRoot,
  "components",
  "site",
  "site-header.tsx",
)

function readHomepageSource() {
  return readFileSync(localizedHomepagePath, "utf8")
}

function readSiteHeaderSource() {
  return readFileSync(siteHeaderPath, "utf8")
}

describe("SiteHeader", () => {
  it("no stale flat app/page.tsx duplicate; localized homepage delegates to SiteHeader without inline fixed header", () => {
    expect(existsSync(flatHomepagePath)).toBe(false)
    expect(shouldRenderSiteHeader("/")).toBe(true)

    const source = readHomepageSource()
    expect(source).toMatch(
      /import[\s\S]*SiteHeader[\s\S]*from\s+["']@\/components\/site\/site-header["']/,
    )
    expect(source).toMatch(/<SiteHeader[\s/>]/)
    expect(source).not.toMatch(/<header[\s\S]*?fixed top-0/)
  })

  it("unscrolled homepage without a hero image renders dark nav text, not white-on-white", () => {
    const header = readSiteHeaderSource()
    const homepage = readHomepageSource()

    expect(header).toMatch(
      /import[\s\S]*shouldUseLightNavText[\s\S]*from\s+["']@\/lib\/site-chrome["']/,
    )
    expect(header).toMatch(
      /function SiteHeader\s*\(\s*\{[^}]*overDarkBackground\s*=\s*true/,
    )
    expect(header).toMatch(
      /shouldUseLightNavText\(\s*isScrolled\s*,\s*overDarkBackground/,
    )
    expect(header).not.toMatch(
      /isScrolled\s*\?\s*["'][^"']*["']\s*:\s*["'][^"']*text-white/,
    )
    expect(homepage).toMatch(/<SiteHeader\s+overDarkBackground=\{hasHero\}/)
  })
})

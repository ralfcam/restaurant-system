import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { shouldRenderSiteHeader } from "@/lib/site-chrome"

const homepagePath = path.join(process.cwd(), "app", "page.tsx")

function readHomepageSource() {
  return readFileSync(homepagePath, "utf8")
}

describe("SiteHeader", () => {
  it("SiteHeader is enabled for homepage route", () => {
    expect(shouldRenderSiteHeader("/")).toBe(true)
  })

  it("homepage delegates to SiteHeader without inline fixed header", () => {
    const source = readHomepageSource()
    expect(source).toMatch(/import[\s\S]*SiteHeader[\s\S]*from\s+["']@\/components\/site\/site-header["']/)
    expect(source).toMatch(/<SiteHeader\s*\/>/)
    expect(source).not.toMatch(/<header[\s\S]*?fixed top-0/)
  })
})

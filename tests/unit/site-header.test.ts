import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { shouldRenderSiteHeader } from "@/lib/site-chrome"

const flatHomepagePath = path.join(process.cwd(), "app", "page.tsx")
const localizedHomepagePath = path.join(process.cwd(), "app", "[locale]", "page.tsx")

function readHomepageSource() {
  return readFileSync(localizedHomepagePath, "utf8")
}

describe("SiteHeader", () => {
  it("no stale flat app/page.tsx duplicate; localized homepage delegates to SiteHeader without inline fixed header", () => {
    expect(existsSync(flatHomepagePath)).toBe(false)
    expect(shouldRenderSiteHeader("/")).toBe(true)

    const source = readHomepageSource()
    expect(source).toMatch(/import[\s\S]*SiteHeader[\s\S]*from\s+["']@\/components\/site\/site-header["']/)
    expect(source).toMatch(/<SiteHeader\s*\/>/)
    expect(source).not.toMatch(/<header[\s\S]*?fixed top-0/)
  })
})

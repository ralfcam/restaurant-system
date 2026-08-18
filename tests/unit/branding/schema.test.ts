import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("branding CMS schema and surfaces", () => {
  it("baseline defines restaurant_settings and the public branding bucket", () => {
    const baseline = readFileSync(
      path.join(root, "supabase/migrations/00000000000000_baseline.sql"),
      "utf8",
    )
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS restaurant_settings/)
    expect(baseline).toMatch(/logo_url TEXT/)
    expect(baseline).toMatch(/INSERT INTO storage\.buckets/)
    expect(baseline).toMatch(/'branding'/)
  })

  it("raises the Server Action body limit so a 2MB logo fits as base64", () => {
    const config = readFileSync(path.join(root, "next.config.mjs"), "utf8")
    expect(config).toMatch(/bodySizeLimit:\s*["']4mb["']/)
  })

  it("staff branding page exists and leftover test fixtures are gone", () => {
    expect(existsSync(path.join(root, "app/admin/settings/page.tsx"))).toBe(true)
    expect(existsSync(path.join(root, "public/test-logo-sync.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/test-logo-tiny.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/test-logo-upload.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/images/logo.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/images/logo.jpg"))).toBe(false)
  })

  it("guest header and login render BrandMark only when a custom url is set", () => {
    const header = readFileSync(path.join(root, "components/site/site-header.tsx"), "utf8")
    const login = readFileSync(path.join(root, "app/auth/login/page.tsx"), "utf8")
    expect(header).toMatch(/useRestaurantLogo/)
    expect(header).toMatch(/<BrandMark src=\{logoUrl\}/)
    expect(header).not.toMatch(/SITE_LOGO\.src/)
    expect(login).toMatch(/useRestaurantLogo/)
    expect(login).toMatch(/<BrandMark src=\{logoUrl\}/)
    expect(login).not.toMatch(/SITE_LOGO\.src/)
  })
})

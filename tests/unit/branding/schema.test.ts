import { existsSync, readdirSync, readFileSync } from "node:fs"
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

  it("raises the Server Action body limit so a 4MB hero photo fits as base64", () => {
    const config = readFileSync(path.join(root, "next.config.mjs"), "utf8")
    expect(config).toMatch(/bodySizeLimit:\s*["']8mb["']/)
  })

  it("migration adds hero_image_url to restaurant_settings", () => {
    const migration = readFileSync(
      path.join(root, "supabase/migrations/20260820090000_hero_image_url.sql"),
      "utf8",
    )
    expect(migration).toMatch(/add column if not exists hero_image_url text/i)
  })

  it("restaurant_settings.slot_interval_minutes defaults to 30", () => {
    const migrationsDir = path.join(root, "supabase/migrations")
    const baseline = readFileSync(
      path.join(migrationsDir, "00000000000000_baseline.sql"),
      "utf8",
    )
    const allSql = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
      .join("\n")

    expect(baseline).toMatch(/slot_interval_minutes INT NOT NULL DEFAULT 30/)
    expect(allSql).toMatch(
      /ADD COLUMN IF NOT EXISTS slot_interval_minutes INT NOT NULL DEFAULT 30/i,
    )
    expect(allSql).toMatch(/slot_interval_minutes IN \(15, 30, 60\)/)
  })

  it("seed keeps the CMS singleton blank by default (no logo, no hero photo)", () => {
    const seed = readFileSync(path.join(root, "supabase/seed.sql"), "utf8")
    expect(seed).toMatch(
      /INSERT INTO restaurant_settings \([\s\S]*logo_url,[\s\S]*hero_image_url,/,
    )
    expect(seed).toMatch(/VALUES \(1, NULL, NULL, NULL, NULL, true\)/)
  })

  it("staff branding page exists and leftover test fixtures are gone", () => {
    expect(existsSync(path.join(root, "app/admin/settings/page.tsx"))).toBe(
      true,
    )
    expect(existsSync(path.join(root, "public/test-logo-sync.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/test-logo-tiny.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/test-logo-upload.png"))).toBe(
      false,
    )
    expect(existsSync(path.join(root, "public/images/logo.png"))).toBe(false)
    expect(existsSync(path.join(root, "public/images/logo.jpg"))).toBe(false)
    expect(existsSync(path.join(root, "public/images/hero-dining.png"))).toBe(
      false,
    )
  })

  it("guest header and login render BrandMark only when a custom url is set", () => {
    const header = readFileSync(
      path.join(root, "components/site/site-header.tsx"),
      "utf8",
    )
    const login = readFileSync(
      path.join(root, "app/auth/login/page.tsx"),
      "utf8",
    )
    expect(header).toMatch(/useRestaurantLogo/)
    expect(header).toMatch(/<BrandMark src=\{logoUrl\}/)
    expect(header).not.toMatch(/SITE_LOGO\.src/)
    expect(login).toMatch(/useRestaurantLogo/)
    expect(login).toMatch(/<BrandMark src=\{logoUrl\}/)
    expect(login).not.toMatch(/SITE_LOGO\.src/)
  })

  it("homepage hero falls back to a blank background when no hero photo is set", () => {
    const home = readFileSync(path.join(root, "app/[locale]/page.tsx"), "utf8")
    expect(home).toMatch(/useRestaurantHeroImage/)
    expect(home).not.toMatch(/hero-dining\.png/)
  })
})

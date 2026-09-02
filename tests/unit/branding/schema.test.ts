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

  it("restaurant_settings grants are select-only for anon and authenticated", () => {
    const baseline = readFileSync(
      path.join(root, "supabase/migrations/00000000000000_baseline.sql"),
      "utf8",
    )
    const grant =
      "GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated"
    const revoke =
      "REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated"
    const dropAuth =
      'DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"'
    const createAuth =
      'CREATE POLICY "Allow authenticated full access to restaurant_settings"'

    expect(baseline).toContain(grant)
    expect(baseline).toContain(revoke)
    expect(baseline).toContain(dropAuth)

    const dropIdx = baseline.indexOf(dropAuth)
    expect(baseline.indexOf(createAuth, dropIdx)).toBe(-1)

    expect(baseline).toContain(
      "GRANT ALL ON TABLE restaurant_settings TO service_role",
    )
    expect(baseline).toContain(
      'CREATE POLICY "Allow public read restaurant_settings"',
    )
    expect(baseline).toContain(
      'CREATE POLICY "Allow service_role full access to restaurant_settings"',
    )
  })

  it("restaurant_settings privilege forward drops authenticated FOR ALL and revokes DML", () => {
    const grant =
      "GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated"
    const revoke =
      "REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated"
    const dropAuth =
      'DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"'
    const createAuth =
      'CREATE POLICY "Allow authenticated full access to restaurant_settings"'

    const forwards = [
      "supabase/migrations/20260818155638_restaurant_branding_cms.sql",
      "supabase/migrations/20260825140000_operating_windows_privilege.sql",
    ]

    for (const rel of forwards) {
      const fullPath = path.join(root, rel)
      expect(existsSync(fullPath)).toBe(true)
      const sql = readFileSync(fullPath, "utf8")

      expect(sql).toContain(grant)
      expect(sql).toContain(revoke)
      expect(sql).toContain(dropAuth)

      const dropIdx = sql.indexOf(dropAuth)
      expect(sql.indexOf(createAuth, dropIdx)).toBe(-1)
    }
  })

  it("restaurant_settings privilege has a post-25140000 dated forward", () => {
    const migrationsDir = path.join(root, "supabase/migrations")
    const grant =
      "GRANT SELECT ON TABLE restaurant_settings TO anon, authenticated"
    const revoke =
      "REVOKE INSERT, UPDATE, DELETE ON TABLE restaurant_settings FROM anon, authenticated"
    const dropAuth =
      'DROP POLICY IF EXISTS "Allow authenticated full access to restaurant_settings"'
    const grantService =
      "GRANT ALL ON TABLE restaurant_settings TO service_role"
    const notify = "NOTIFY pgrst, 'reload schema'"
    const createAuth =
      'CREATE POLICY "Allow authenticated full access to restaurant_settings"'

    const later = readdirSync(migrationsDir).filter((name) => {
      const stamp = name.match(/^(\d{14})_.*\.sql$/)
      return stamp !== null && stamp[1] > "20260825140000"
    })

    const matching = later.filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8")
      return (
        sql.includes(dropAuth) &&
        sql.includes(grant) &&
        sql.includes(revoke) &&
        sql.includes(grantService) &&
        sql.includes(notify) &&
        !sql.includes(createAuth)
      )
    })

    expect(matching.length).toBeGreaterThan(0)
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

  it("restaurant_settings occupancy duration defaults to 90 and safety buffer to 15", () => {
    const migrationsDir = path.join(root, "supabase/migrations")
    const files = [
      "00000000000000_baseline.sql",
      "20260823130000_restaurant_info_and_chefs_picks.sql",
      "20260827180000_occupancy_duration_buffer.sql",
    ]

    for (const name of files) {
      const fullPath = path.join(migrationsDir, name)
      const sql = existsSync(fullPath) ? readFileSync(fullPath, "utf8") : ""

      expect(sql).toMatch(/occupancy_duration_minutes INT NOT NULL DEFAULT 90/i)
      expect(sql).toMatch(/safety_buffer_minutes INT NOT NULL DEFAULT 15/i)
      expect(sql).toMatch(/occupancy_duration_minutes BETWEEN 30 AND 240/i)
      expect(sql).toMatch(/occupancy_duration_minutes % 15 = 0/)
      expect(sql).toMatch(/safety_buffer_minutes BETWEEN 0 AND 60/i)
      expect(sql).toMatch(/safety_buffer_minutes % 5 = 0/)
    }
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

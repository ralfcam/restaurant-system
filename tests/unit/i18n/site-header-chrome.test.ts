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

describe("site header chrome from catalogs", () => {
  it("site header renders nav catalog keys", () => {
    const source = readSiteHeaderSource()

    const usesNavNamespace = /useTranslations\(\s*["']nav["']\s*\)/.test(source)
    const usesRootPlusNavPrefix =
      /useTranslations\(\s*\)/.test(source) && /t\(\s*["']nav\./.test(source)

    expect(usesNavNamespace || usesRootPlusNavPrefix).toBe(true)

    expect(source).toMatch(/\{t\(\s*["'](?:nav\.)?staffLogin["']\s*\)\}/)
    expect(source).toMatch(/\{t\(\s*["'](?:nav\.)?bookTable["']\s*\)\}/)
    expect(source).toMatch(/\{t\(\s*["'](?:nav\.)?menu["']\s*\)\}/)
    expect(source).toMatch(/\{t\(\s*["'](?:nav\.)?openMenu["']\s*\)\}/)
  })
})

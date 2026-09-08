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

describe("site header locale-aware guest nav", () => {
  it("header guest links use next-intl Link; staff login stays /admin", () => {
    const source = readSiteHeaderSource()

    expect(source).not.toMatch(/import\s+Link\s+from\s+["']next\/link["']/)
    expect(source).toMatch(
      /import[\s\S]*Link[\s\S]*from\s+["']@\/i18n\/navigation["']/,
    )
    expect(source).toMatch(/href=["']\/["']/)
    expect(source).toMatch(/href(?::|=)\s*["']\/menu["']/)
    expect(source).toMatch(/href=["']\/#reserve["']/)
    expect(source).toMatch(/href=["']\/admin["']/)
  })
})

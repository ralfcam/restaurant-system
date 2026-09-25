import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  extractTranslationKeys,
  findHardCodedCopy,
  importsNextIntl,
  unresolvedCatalogKeys,
} from "../helpers/copy-scan"

const SURFACE_FILES = [
  "app/admin/settings/page.tsx",
  "components/staff/restaurant-logo-editor.tsx",
  "components/staff/restaurant-hero-image-editor.tsx",
  "app/admin/marketing/page.tsx",
  "app/admin/marketing/review-email-settings-form.tsx",
] as const

describe("branding and marketing surface catalogs", () => {
  it("renders branding and marketing copy from next-intl catalogs with no hard-coded system copy", () => {
    const problems: string[] = []

    for (const rel of SURFACE_FILES) {
      const source = readFileSync(path.join(process.cwd(), rel), "utf8")
      if (!importsNextIntl(source)) {
        problems.push(
          `${rel}: missing next-intl useTranslations or getTranslations import`,
        )
      }
      for (const hit of findHardCodedCopy(source)) {
        problems.push(
          `${rel}:${hit.line} ${hit.kind} ${JSON.stringify(hit.text)}`,
        )
      }
      for (const key of unresolvedCatalogKeys(extractTranslationKeys(source))) {
        problems.push(`${rel}: unresolved catalog key ${key}`)
      }
    }

    expect(problems).toEqual([])
  })
})

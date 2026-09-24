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
  "app/auth/login/page.tsx",
  "app/auth/error/page.tsx",
] as const

describe("auth surface catalogs", () => {
  it("renders auth login and error copy from next-intl catalogs with no hard-coded system copy", () => {
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
